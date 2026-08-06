const db = require('../database/db');
const { validateHistorial, throwIfErrors, sanitizeString } = require('../utils/validation');

async function list(mascotaId) {
  const id = parseInt(mascotaId, 10);
  if (isNaN(id)) throw new Error('ID de mascota inválido');

  const mascota = await db.queryOne('SELECT id, nombre, activo FROM mascotas WHERE id = ?', [id]);
  if (!mascota) throw new Error('Mascota no encontrada');

  const results = await db.query(
    `SELECT hm.*, m.nombre AS mascota_nombre
     FROM historial_medico hm
     LEFT JOIN mascotas m ON m.id = hm.mascota_id
     WHERE hm.mascota_id = ?
     ORDER BY hm.fecha DESC, hm.id DESC`,
    [id]
  );
  return results;
}

async function listAll(filters = {}) {
  const { search = '', tipo, fechaDesde, fechaHasta } = filters;
  const term = search ? `%${search}%` : null;
  const rows = [];

  const tiposHistorial = ['consulta', 'cirugia', 'receta'];
  const incluyeHistorial = !tipo || tiposHistorial.includes(tipo);
  const incluyeVacunas = !tipo || tipo === 'vacuna';
  const incluyeDesparasitaciones = !tipo || tipo === 'desparasitacion';

  if (incluyeHistorial) {
    const conditions = [];
    const values = [];
    if (search) {
      conditions.push('(m.nombre LIKE ? OR p.nombre LIKE ? OR hm.descripcion LIKE ?)');
      values.push(term, term, term);
    }
    if (fechaDesde) { conditions.push('hm.fecha >= ?'); values.push(fechaDesde); }
    if (fechaHasta) { conditions.push('hm.fecha <= ?'); values.push(fechaHasta); }
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const hist = await db.query(
      `SELECT hm.id, hm.mascota_id, hm.fecha, hm.tipo, hm.descripcion, hm.diagnostico, hm.tratamiento, hm.proxima_dosis,
              m.nombre AS mascota_nombre, p.nombre AS propietario_nombre
       FROM historial_medico hm
       LEFT JOIN mascotas m ON m.id = hm.mascota_id
       LEFT JOIN propietarios p ON p.id = m.propietario_id
       ${whereClause}`,
      values
    );
    rows.push(...hist);
  }

  if (incluyeVacunas) {
    const conditions = [];
    const values = [];
    if (search) {
      conditions.push('(m.nombre LIKE ? OR p.nombre LIKE ? OR v.nombre_vacuna LIKE ?)');
      values.push(term, term, term);
    }
    if (fechaDesde) { conditions.push('v.fecha >= ?'); values.push(fechaDesde); }
    if (fechaHasta) { conditions.push('v.fecha <= ?'); values.push(fechaHasta); }
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const vac = await db.query(
      `SELECT v.id, v.mascota_id, v.fecha, 'vacuna' AS tipo, v.nombre_vacuna AS descripcion, NULL AS diagnostico, NULL AS tratamiento, v.proxima_dosis,
              m.nombre AS mascota_nombre, p.nombre AS propietario_nombre
       FROM vacunas v
       LEFT JOIN mascotas m ON m.id = v.mascota_id
       LEFT JOIN propietarios p ON p.id = m.propietario_id
       ${whereClause}`,
      values
    );
    rows.push(...vac);
  }

  if (incluyeDesparasitaciones) {
    const conditions = [];
    const values = [];
    if (search) {
      conditions.push('(m.nombre LIKE ? OR p.nombre LIKE ? OR d.producto LIKE ?)');
      values.push(term, term, term);
    }
    if (fechaDesde) { conditions.push('d.fecha >= ?'); values.push(fechaDesde); }
    if (fechaHasta) { conditions.push('d.fecha <= ?'); values.push(fechaHasta); }
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const des = await db.query(
      `SELECT d.id, d.mascota_id, d.fecha, 'desparasitacion' AS tipo, d.producto AS descripcion, NULL AS diagnostico, NULL AS tratamiento, d.proxima_dosis,
              m.nombre AS mascota_nombre, p.nombre AS propietario_nombre
       FROM desparasitaciones d
       LEFT JOIN mascotas m ON m.id = d.mascota_id
       LEFT JOIN propietarios p ON p.id = m.propietario_id
       ${whereClause}`,
      values
    );
    rows.push(...des);
  }

  return rows.sort((a, b) => (String(b.fecha) < String(a.fecha) ? -1 : String(b.fecha) > String(a.fecha) ? 1 : b.id - a.id)).slice(0, 500);
}

async function create(data, userId) {
  const errors = validateHistorial(data);
  throwIfErrors(errors);

  const mascota = await db.queryOne('SELECT id FROM mascotas WHERE id = ? AND activo = TRUE', [data.mascota_id]);
  if (!mascota) throw new Error('Mascota no encontrada o inactiva');

  const result = await db.query(
    'INSERT INTO historial_medico (mascota_id, fecha, tipo, descripcion, diagnostico, tratamiento, proxima_dosis, peso, temperatura, frecuencia_cardiaca, frecuencia_respiratoria) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      data.mascota_id,
      data.fecha,
      data.tipo || 'consulta',
      sanitizeString(data.descripcion, 2000) || null,
      sanitizeString(data.diagnostico, 2000) || null,
      sanitizeString(data.tratamiento, 2000) || null,
      data.proxima_dosis || null,
      data.peso != null && data.peso !== '' ? parseFloat(data.peso) : null,
      data.temperatura != null && data.temperatura !== '' ? parseFloat(data.temperatura) : null,
      data.frecuencia_cardiaca != null && data.frecuencia_cardiaca !== '' ? parseInt(data.frecuencia_cardiaca, 10) : null,
      data.frecuencia_respiratoria != null && data.frecuencia_respiratoria !== '' ? parseInt(data.frecuencia_respiratoria, 10) : null,
    ]
  );

  await db.auditLog(userId, 'CREATE', 'historial_medico', result.insertId, null, data);
  return result.insertId;
}

async function update(id, data, userId) {
  const errors = validateHistorial(data);
  throwIfErrors(errors);

  const prev = await db.queryOne('SELECT id, mascota_id, fecha, tipo, descripcion, diagnostico, tratamiento, proxima_dosis, peso, temperatura, frecuencia_cardiaca, frecuencia_respiratoria FROM historial_medico WHERE id = ?', [id]);
  if (!prev) throw new Error('Registro no encontrado');

  const mascota = await db.queryOne('SELECT id FROM mascotas WHERE id = ? AND activo = TRUE', [data.mascota_id]);
  if (!mascota) throw new Error('Mascota no encontrada o inactiva');

  await db.query(
    'UPDATE historial_medico SET fecha = ?, tipo = ?, descripcion = ?, diagnostico = ?, tratamiento = ?, proxima_dosis = ?, peso = ?, temperatura = ?, frecuencia_cardiaca = ?, frecuencia_respiratoria = ? WHERE id = ?',
    [
      data.fecha,
      data.tipo || 'consulta',
      sanitizeString(data.descripcion, 2000) || null,
      sanitizeString(data.diagnostico, 2000) || null,
      sanitizeString(data.tratamiento, 2000) || null,
      data.proxima_dosis || null,
      data.peso != null && data.peso !== '' ? parseFloat(data.peso) : null,
      data.temperatura != null && data.temperatura !== '' ? parseFloat(data.temperatura) : null,
      data.frecuencia_cardiaca != null && data.frecuencia_cardiaca !== '' ? parseInt(data.frecuencia_cardiaca, 10) : null,
      data.frecuencia_respiratoria != null && data.frecuencia_respiratoria !== '' ? parseInt(data.frecuencia_respiratoria, 10) : null,
      id,
    ]
  );

  await db.auditLog(userId, 'UPDATE', 'historial_medico', id, prev, data);
  return true;
}

async function remove(id, userId) {
  const prev = await db.queryOne('SELECT id, mascota_id, fecha, tipo, descripcion, diagnostico, tratamiento, proxima_dosis FROM historial_medico WHERE id = ?', [id]);
  if (!prev) throw new Error('Registro no encontrado');

  await db.query('DELETE FROM historial_medico WHERE id = ?', [id]);
  await db.auditLog(userId, 'DELETE', 'historial_medico', id, prev, null);
  return true;
}

module.exports = { list, listAll, create, update, remove };
