const db = require('../database/db');
const { sanitizeString } = require('../utils/validation');

async function list(mascotaId) {
  const id = parseInt(mascotaId, 10);
  if (isNaN(id)) throw new Error('ID de mascota inválido');

  const mascota = await db.queryOne('SELECT id FROM mascotas WHERE id = ?', [id]);
  if (!mascota) throw new Error('Mascota no encontrada');

  return await db.query(
    `SELECT id, mascota_id, producto, fecha, proxima_dosis, dosis, notas
     FROM desparasitaciones
     WHERE mascota_id = ?
     ORDER BY fecha DESC, id DESC`,
    [id]
  );
}

async function get(id) {
  return await db.queryOne(
    'SELECT id, mascota_id, producto, fecha, proxima_dosis, dosis, notas FROM desparasitaciones WHERE id = ?',
    [id]
  );
}

async function create(data, userId) {
  if (!data.producto || !String(data.producto).trim()) {
    throw new Error('El producto es obligatorio');
  }
  if (!data.fecha) throw new Error('La fecha es obligatoria');

  const mascota = await db.queryOne('SELECT id FROM mascotas WHERE id = ? AND activo = TRUE', [data.mascota_id]);
  if (!mascota) throw new Error('Mascota no encontrada o inactiva');

  const result = await db.query(
    'INSERT INTO desparasitaciones (mascota_id, producto, fecha, proxima_dosis, dosis, notas) VALUES (?, ?, ?, ?, ?, ?)',
    [
      data.mascota_id,
      sanitizeString(data.producto, 100),
      data.fecha,
      data.proxima_dosis || null,
      sanitizeString(data.dosis, 50) || null,
      sanitizeString(data.notas, 1000) || null,
    ]
  );

  await db.auditLog(userId, 'CREATE', 'desparasitacion', result.insertId, null, data);
  return result.insertId;
}

async function update(id, data, userId) {
  const prev = await get(id);
  if (!prev) throw new Error('Desparasitación no encontrada');

  const fields = [];
  const values = [];

  if (data.producto !== undefined) {
    if (!String(data.producto).trim()) throw new Error('El producto es obligatorio');
    fields.push('producto = ?');
    values.push(sanitizeString(data.producto, 100));
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
  if (data.dosis !== undefined) {
    fields.push('dosis = ?');
    values.push(sanitizeString(data.dosis, 50) || null);
  }
  if (data.notas !== undefined) {
    fields.push('notas = ?');
    values.push(sanitizeString(data.notas, 1000) || null);
  }

  if (fields.length === 0) return true;

  values.push(id);
  await db.query('UPDATE desparasitaciones SET ' + fields.join(', ') + ' WHERE id = ?', values);
  await db.auditLog(userId, 'UPDATE', 'desparasitacion', id, prev, data);
  return true;
}

async function remove(id, userId) {
  const prev = await get(id);
  if (!prev) throw new Error('Desparasitación no encontrada');

  await db.query('DELETE FROM desparasitaciones WHERE id = ?', [id]);
  await db.auditLog(userId, 'DELETE', 'desparasitacion', id, prev, null);
  return true;
}

module.exports = { list, get, create, update, remove };
