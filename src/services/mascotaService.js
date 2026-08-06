const db = require('../database/db');
const { validateMascota, throwIfErrors, sanitizeString } = require('../utils/validation');

async function list(params = {}) {
  const { page = 1, limit = 50, search = '', propietarioId, soloActivos = true } = params;
  const offset = (page - 1) * limit;
  const searchTerm = `%${search || ''}%`;

  const conditions = [];
  const values = [];

  if (soloActivos) conditions.push('m.activo = TRUE');
  if (propietarioId) {
    conditions.push('m.propietario_id = ?');
    values.push(propietarioId);
  }
  if (search) {
    conditions.push('(m.nombre LIKE ? OR m.especie LIKE ? OR m.raza LIKE ?)');
    values.push(searchTerm, searchTerm, searchTerm);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM mascotas m ${whereClause}`,
    values
  );
  const total = countResult[0].total;

  const rows = await db.query(
    `SELECT m.*, p.nombre AS propietario_nombre 
     FROM mascotas m 
     JOIN propietarios p ON m.propietario_id = p.id
     ${whereClause}
     ORDER BY m.activo DESC, m.created_at DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function get(id) {
  const numId = parseInt(id, 10);
  if (isNaN(numId)) throw new Error('ID de mascota inválido');
  const row = await db.queryOne(
    `SELECT m.*, p.nombre AS propietario_nombre, p.telefono AS propietario_telefono
     FROM mascotas m 
     JOIN propietarios p ON m.propietario_id = p.id
     WHERE m.id = ?`,
    [numId]
  );
  if (!row) {
    const rowInactive = await db.queryOne(
      `SELECT m.*, p.nombre AS propietario_nombre, p.telefono AS propietario_telefono
       FROM mascotas m 
       JOIN propietarios p ON m.propietario_id = p.id
       WHERE m.id = ? AND m.activo = FALSE`,
      [numId]
    );
    return rowInactive || null;
  }
  return row;
}

async function create(data, userId) {
  const errors = validateMascota(data);
  throwIfErrors(errors);

  const prop = await db.queryOne('SELECT id FROM propietarios WHERE id = ? AND activo = TRUE', [data.propietario_id]);
  if (!prop) throw new Error('Propietario no encontrado o inactivo');

  const result = await db.query(
    'INSERT INTO mascotas (nombre, especie, raza, edad, peso, foto, propietario_id, alergias, condiciones_cronicas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      sanitizeString(data.nombre, 100),
      sanitizeString(data.especie, 50) || 'Otro',
      sanitizeString(data.raza, 50) || null,
      data.edad !== undefined && data.edad !== null && data.edad !== '' ? parseInt(data.edad) : null,
      data.peso !== undefined && data.peso !== null && data.peso !== '' ? parseFloat(data.peso) : null,
      data.foto || null,
      data.propietario_id,
      sanitizeString(data.alergias, 1000) || null,
      sanitizeString(data.condiciones_cronicas, 1000) || null,
    ]
  );

  await db.auditLog(userId, 'CREATE', 'mascota', result.insertId, null, data);
  return result.insertId;
}

async function update(id, data, userId) {
  const errors = validateMascota(data);
  throwIfErrors(errors);

  const prev = await get(id);
  if (!prev) throw new Error('Mascota no encontrada');

  if (data.propietario_id) {
    const prop = await db.queryOne('SELECT id FROM propietarios WHERE id = ? AND activo = TRUE', [data.propietario_id]);
    if (!prop) throw new Error('Propietario no encontrado o inactivo');
  }

  await db.query(
    'UPDATE mascotas SET nombre = ?, especie = ?, raza = ?, edad = ?, peso = ?, foto = ?, propietario_id = ?, alergias = ?, condiciones_cronicas = ? WHERE id = ?',
    [
      data.nombre !== undefined ? sanitizeString(data.nombre, 100) : prev.nombre,
      data.especie !== undefined ? sanitizeString(data.especie, 50) || 'Otro' : prev.especie,
      data.raza !== undefined ? sanitizeString(data.raza, 50) || null : prev.raza,
      data.edad !== undefined && data.edad !== null && data.edad !== '' ? parseInt(data.edad) : prev.edad,
      data.peso !== undefined && data.peso !== null && data.peso !== '' ? parseFloat(data.peso) : prev.peso,
      data.foto !== undefined ? data.foto || null : prev.foto,
      data.propietario_id || prev.propietario_id,
      data.alergias !== undefined ? sanitizeString(data.alergias, 1000) || null : prev.alergias,
      data.condiciones_cronicas !== undefined ? sanitizeString(data.condiciones_cronicas, 1000) || null : prev.condiciones_cronicas,
      id,
    ]
  );

  await db.auditLog(userId, 'UPDATE', 'mascota', id, prev, data);
  return true;
}

async function remove(id, userId) {
  const prev = await get(id);
  if (!prev) throw new Error('Mascota no encontrada');

  const hasCitas = await db.query(
    "SELECT COUNT(*) as count FROM citas WHERE mascota_id = ? AND estado = 'pendiente'",
    [id]
  );
  if (hasCitas[0].count > 0) {
    throw new Error('No se puede eliminar: la mascota tiene citas pendientes');
  }

  await db.query('UPDATE mascotas SET activo = FALSE WHERE id = ?', [id]);
  await db.auditLog(userId, 'SOFT_DELETE', 'mascota', id, prev, { activo: false });
  return true;
}

async function restore(id, userId) {
  const prev = await get(id);
  if (!prev) throw new Error('Mascota no encontrada');
  if (prev.activo) return true;

  const prop = await db.queryOne('SELECT id FROM propietarios WHERE id = ? AND activo = TRUE', [prev.propietario_id]);
  if (!prop) throw new Error('No se puede restaurar: el propietario está inactivo');

  await db.query('UPDATE mascotas SET activo = TRUE WHERE id = ?', [id]);
  await db.auditLog(userId, 'RESTORE', 'mascota', id, { activo: false }, { activo: true });
  return true;
}

module.exports = { list, get, create, update, remove, restore };
