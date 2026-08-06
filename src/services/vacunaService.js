const db = require('../database/db');
const { sanitizeString } = require('../utils/validation');

async function list(mascotaId) {
  const id = parseInt(mascotaId, 10);
  if (isNaN(id)) throw new Error('ID de mascota inválido');

  const mascota = await db.queryOne('SELECT id FROM mascotas WHERE id = ?', [id]);
  if (!mascota) throw new Error('Mascota no encontrada');

  return await db.query(
    `SELECT id, mascota_id, nombre_vacuna, fecha, proxima_dosis, lote, notas
     FROM vacunas
     WHERE mascota_id = ?
     ORDER BY fecha DESC, id DESC`,
    [id]
  );
}

async function get(id) {
  return await db.queryOne(
    'SELECT id, mascota_id, nombre_vacuna, fecha, proxima_dosis, lote, notas FROM vacunas WHERE id = ?',
    [id]
  );
}

async function create(data, userId) {
  if (!data.nombre_vacuna || !String(data.nombre_vacuna).trim()) {
    throw new Error('El nombre de la vacuna es obligatorio');
  }
  if (!data.fecha) throw new Error('La fecha es obligatoria');

  const mascota = await db.queryOne('SELECT id FROM mascotas WHERE id = ? AND activo = TRUE', [data.mascota_id]);
  if (!mascota) throw new Error('Mascota no encontrada o inactiva');

  const result = await db.query(
    'INSERT INTO vacunas (mascota_id, nombre_vacuna, fecha, proxima_dosis, lote, notas) VALUES (?, ?, ?, ?, ?, ?)',
    [
      data.mascota_id,
      sanitizeString(data.nombre_vacuna, 100),
      data.fecha,
      data.proxima_dosis || null,
      sanitizeString(data.lote, 50) || null,
      sanitizeString(data.notas, 1000) || null,
    ]
  );

  await db.auditLog(userId, 'CREATE', 'vacuna', result.insertId, null, data);
  return result.insertId;
}

async function update(id, data, userId) {
  const prev = await get(id);
  if (!prev) throw new Error('Vacuna no encontrada');

  const fields = [];
  const values = [];

  if (data.nombre_vacuna !== undefined) {
    if (!String(data.nombre_vacuna).trim()) throw new Error('El nombre de la vacuna es obligatorio');
    fields.push('nombre_vacuna = ?');
    values.push(sanitizeString(data.nombre_vacuna, 100));
  }
  if (data.fecha !== undefined) {
    if (!data.fecha) throw new Error('La fecha es obligatoria');
    fields.push('fecha = ?');
    values.push(data.fecha);
  }
  if (data.proxima_dosis !== undefined) {
    fields.push('proxima_dosis = ?');
    values.push(data.proxima_dosis || null);
  }
  if (data.lote !== undefined) {
    fields.push('lote = ?');
    values.push(sanitizeString(data.lote, 50) || null);
  }
  if (data.notas !== undefined) {
    fields.push('notas = ?');
    values.push(sanitizeString(data.notas, 1000) || null);
  }

  if (fields.length === 0) return true;

  values.push(id);
  await db.query('UPDATE vacunas SET ' + fields.join(', ') + ' WHERE id = ?', values);
  await db.auditLog(userId, 'UPDATE', 'vacuna', id, prev, data);
  return true;
}

async function remove(id, userId) {
  const prev = await get(id);
  if (!prev) throw new Error('Vacuna no encontrada');

  await db.query('DELETE FROM vacunas WHERE id = ?', [id]);
  await db.auditLog(userId, 'DELETE', 'vacuna', id, prev, null);
  return true;
}

module.exports = { list, get, create, update, remove };
