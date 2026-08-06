const db = require('../database/db');
const { validateCita, throwIfErrors, sanitizeString } = require('../utils/validation');

function todayStr() {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dateStr(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function listByDate(fecha) {
  return await db.query(
    `SELECT c.id, c.mascota_id, c.fecha, c.hora, c.motivo, c.estado, c.notas, c.created_at, c.updated_at, m.nombre AS mascota_nombre, m.especie, p.nombre AS propietario_nombre, p.telefono
     FROM citas c
     JOIN mascotas m ON m.id = c.mascota_id
     JOIN propietarios p ON p.id = m.propietario_id
     WHERE c.fecha = ?
     ORDER BY c.hora ASC, c.created_at ASC`,
    [fecha]
  );
}

async function checkConflict(fecha, hora, excludeId) {
  if (!hora) return null;
  let sql = 'SELECT id FROM citas WHERE fecha = ? AND hora = ? AND estado != ?';
  const params = [fecha, hora, 'cancelada'];
  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }
  const rows = await db.query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

async function create(data, userId) {
  const errors = validateCita(data);
  throwIfErrors(errors);

  if (data.fecha && data.fecha < todayStr()) {
    throw new Error('La fecha no puede ser en el pasado');
  }

  const mascota = await db.queryOne('SELECT id FROM mascotas WHERE id = ? AND activo = TRUE', [data.mascota_id]);
  if (!mascota) throw new Error('Mascota no encontrada o inactiva');

  if (data.hora) {
    const conflict = await checkConflict(data.fecha, data.hora);
    if (conflict) throw new Error('Ya existe una cita en ese horario');
  }

  const estado = data.estado || 'pendiente';

  let insertId = null;
  await db.withTransaction(async (conn) => {
    const [result] = await conn.execute(
      'INSERT INTO citas (mascota_id, fecha, hora, motivo, estado, notas) VALUES (?, ?, ?, ?, ?, ?)',
      [
        data.mascota_id,
        data.fecha,
        data.hora || null,
        sanitizeString(data.motivo, 255) || null,
        estado,
        sanitizeString(data.notas, 1000) || null,
      ]
    );
    insertId = result.insertId;

    if (estado === 'realizada') {
      const descripcion = [
        data.motivo ? `Motivo: ${data.motivo}` : '',
        data.notas ? `Notas: ${data.notas}` : '',
      ].filter(Boolean).join('\n');
      await conn.execute(
        'INSERT INTO historial_medico (mascota_id, cita_id, fecha, tipo, descripcion, autogenerado) VALUES (?, ?, ?, ?, ?, TRUE)',
        [data.mascota_id, insertId, data.fecha, 'consulta', descripcion || null]
      );
    }
  });

  await db.auditLog(userId, 'CREATE', 'cita', insertId, null, data);
  return insertId;
}

async function update(id, data, userId) {
  const errors = validateCita(data);
  throwIfErrors(errors);

  const prev = await db.queryOne('SELECT id, mascota_id, fecha, hora, motivo, estado, notas, created_at FROM citas WHERE id = ?', [id]);
  if (!prev) throw new Error('Cita no encontrada');

  const nuevoEstado = data.estado || prev.estado;
  const nuevaFecha = data.fecha || dateStr(prev.fecha);
  const nuevaMascota = data.mascota_id || prev.mascota_id;

  if (data.fecha && data.fecha < todayStr()) {
    throw new Error('La fecha no puede ser en el pasado');
  }

  const mascota = await db.queryOne('SELECT id FROM mascotas WHERE id = ? AND activo = TRUE', [nuevaMascota]);
  if (!mascota) throw new Error('Mascota no encontrada o inactiva');

  const nuevaHora = data.hora !== undefined ? data.hora : prev.hora;
  if (nuevaHora) {
    const conflict = await checkConflict(nuevaFecha, nuevaHora, id);
    if (conflict) throw new Error('Ya existe una cita en ese horario');
  }

  const nuevoMotivo = data.motivo !== undefined ? sanitizeString(data.motivo, 255) || null : prev.motivo;
  const nuevasNotas = data.notas !== undefined ? sanitizeString(data.notas, 1000) || null : prev.notas;

  const wasRealizada = prev.estado === 'realizada';
  const becomingRealizada = nuevoEstado === 'realizada';
  let historialCreado = false;
  let historialEliminado = false;
  let histId = null;

  await db.withTransaction(async (conn) => {
    await conn.execute(
      'UPDATE citas SET mascota_id = ?, fecha = ?, hora = ?, motivo = ?, estado = ?, notas = ? WHERE id = ?',
      [
        nuevaMascota,
        nuevaFecha,
        nuevaHora || null,
        nuevoMotivo,
        nuevoEstado,
        nuevasNotas,
        id,
      ]
    );

    const descripcion = [
      nuevoMotivo ? `Motivo: ${nuevoMotivo}` : '',
      nuevasNotas ? `Notas: ${nuevasNotas}` : '',
    ].filter(Boolean).join('\n');

    if (wasRealizada && !becomingRealizada) {
      await conn.execute('DELETE FROM historial_medico WHERE cita_id = ? AND autogenerado = TRUE', [id]);
      historialEliminado = true;
    } else if (becomingRealizada) {
      const [existRows] = await conn.query(
        'SELECT id FROM historial_medico WHERE cita_id = ? AND autogenerado = TRUE LIMIT 1',
        [id]
      );
      if (existRows.length > 0) {
        await conn.execute(
          'UPDATE historial_medico SET mascota_id = ?, fecha = ?, descripcion = ? WHERE id = ?',
          [nuevaMascota, nuevaFecha, descripcion || null, existRows[0].id]
        );
      } else {
        const [histResult] = await conn.execute(
          'INSERT INTO historial_medico (mascota_id, cita_id, fecha, tipo, descripcion, autogenerado) VALUES (?, ?, ?, ?, ?, TRUE)',
          [nuevaMascota, id, nuevaFecha, 'consulta', descripcion || null]
        );
        histId = histResult.insertId;
        historialCreado = true;
      }
    }
  });

  if (histId) {
    await db.auditLog(userId, 'CREATE', 'historial_medico', histId, null, {
      mascota_id: nuevaMascota,
      fecha: nuevaFecha,
      tipo: 'consulta',
      source: 'auto-cita-realizada',
      cita_id: id,
    });
  }

  await db.auditLog(userId, 'UPDATE', 'cita', id, prev, data);
  return { actualizado: true, historialCreado, historialEliminado };
}

async function remove(id, userId) {
  const prev = await db.queryOne('SELECT id, mascota_id, fecha, hora, motivo, estado, notas FROM citas WHERE id = ?', [id]);
  if (!prev) throw new Error('Cita no encontrada');

  await db.query('DELETE FROM citas WHERE id = ?', [id]);
  await db.auditLog(userId, 'DELETE', 'cita', id, prev, null);
  return true;
}

async function getMascotas() {
  return await db.query(
    `SELECT m.id, m.nombre, m.especie, p.nombre AS propietario_nombre 
     FROM mascotas m 
     JOIN propietarios p ON m.propietario_id = p.id 
     WHERE m.activo = TRUE AND p.activo = TRUE
     ORDER BY m.nombre ASC`
  );
}

async function listByMonth(year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  return await db.query(
    `SELECT DAY(c.fecha) AS dia, COUNT(*) AS total,
       SUM(CASE WHEN c.estado = 'pendiente' THEN 1 ELSE 0 END) AS pendientes
     FROM citas c
     WHERE c.fecha >= ? AND c.fecha < DATE_ADD(?, INTERVAL 1 MONTH)
       AND c.estado != 'cancelada'
     GROUP BY DAY(c.fecha)
     ORDER BY dia ASC`,
    [startDate, startDate]
  );
}

module.exports = { listByDate, listByMonth, create, update, remove, getMascotas };
