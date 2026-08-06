const db = require('../database/db');
const { validatePropietario, throwIfErrors, sanitizeString, sanitizeEmail } = require('../utils/validation');

async function list(params = {}) {
  const { page = 1, limit = 50, search = '', soloActivos = true } = params;
  const offset = (page - 1) * limit;
  const searchTerm = `%${search || ''}%`;

  const conditions = [];
  const values = [];

  if (soloActivos) conditions.push('p.activo = TRUE');
  if (search) {
    conditions.push('(p.nombre LIKE ? OR p.ci LIKE ? OR p.telefono LIKE ?)');
    values.push(searchTerm, searchTerm, searchTerm);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM propietarios p ${whereClause}`,
    values
  );
  const total = countResult[0].total;

  const rows = await db.query(
    `SELECT p.*, 
     (SELECT COUNT(*) FROM mascotas m WHERE m.propietario_id = p.id AND m.activo = TRUE) as total_mascotas
     FROM propietarios p
     ${whereClause}
     ORDER BY p.created_at DESC
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
  if (isNaN(numId)) throw new Error('ID de propietario inválido');
  const row = await db.queryOne(
    `SELECT p.*, 
     (SELECT COUNT(*) FROM mascotas m WHERE m.propietario_id = p.id AND m.activo = TRUE) as total_mascotas
     FROM propietarios p WHERE p.id = ?`,
    [numId]
  );
  return row || null;
}

async function create(data, userId) {
  const errors = validatePropietario(data);
  throwIfErrors(errors);

  if (data.ci) {
    const dup = await db.query('SELECT id FROM propietarios WHERE ci = ? AND activo = TRUE', [data.ci]);
    if (dup.length > 0) throw new Error('Ya existe un propietario con esa cédula');
  }

  const result = await db.query(
    'INSERT INTO propietarios (ci, nombre, telefono, direccion, email) VALUES (?, ?, ?, ?, ?)',
    [
      sanitizeString(data.ci, 20) || null,
      sanitizeString(data.nombre, 100),
      sanitizeString(data.telefono, 20) || null,
      sanitizeString(data.direccion, 500) || null,
      sanitizeEmail(data.email) || null,
    ]
  ).catch((err) => {
    if (err && err.code === 'ER_DUP_ENTRY') {
      throw new Error('Ya existe un propietario con esa cédula');
    }
    throw err;
  });

  await db.auditLog(userId, 'CREATE', 'propietario', result.insertId, null, data);
  return result.insertId;
}

async function update(id, data, userId) {
  const errors = validatePropietario(data);
  throwIfErrors(errors);

  const prev = await get(id);
  if (!prev) throw new Error('Propietario no encontrado');

  if (data.ci) {
    const dup = await db.query('SELECT id FROM propietarios WHERE ci = ? AND id != ? AND activo = TRUE', [data.ci, id]);
    if (dup.length > 0) throw new Error('Ya existe un propietario con esa cédula');
  }

  await db.query(
    'UPDATE propietarios SET ci = ?, nombre = ?, telefono = ?, direccion = ?, email = ? WHERE id = ?',
    [
      data.ci !== undefined ? sanitizeString(data.ci, 20) || null : prev.ci,
      data.nombre !== undefined ? sanitizeString(data.nombre, 100) : prev.nombre,
      data.telefono !== undefined ? sanitizeString(data.telefono, 20) || null : prev.telefono,
      data.direccion !== undefined ? sanitizeString(data.direccion, 500) || null : prev.direccion,
      data.email !== undefined ? sanitizeEmail(data.email) || null : prev.email,
      id,
    ]
  ).catch((err) => {
    if (err && err.code === 'ER_DUP_ENTRY') {
      throw new Error('Ya existe un propietario con esa cédula');
    }
    throw err;
  });

  await db.auditLog(userId, 'UPDATE', 'propietario', id, prev, data);
  return true;
}

async function remove(id, userId) {
  const prev = await get(id);
  if (!prev) throw new Error('Propietario no encontrado');

  const hasActivas = await db.query(
    'SELECT COUNT(*) as count FROM mascotas WHERE propietario_id = ? AND activo = TRUE',
    [id]
  );
  if (hasActivas[0].count > 0) {
    throw new Error('No se puede eliminar: el propietario tiene mascotas activas');
  }

  await db.query('UPDATE propietarios SET activo = FALSE WHERE id = ?', [id]);
  await db.auditLog(userId, 'SOFT_DELETE', 'propietario', id, prev, { activo: false });
  return true;
}

async function restore(id, userId) {
  const prev = await get(id);
  if (!prev) throw new Error('Propietario no encontrado');
  if (prev.activo) return true;

  await db.query('UPDATE propietarios SET activo = TRUE WHERE id = ?', [id]);
  await db.auditLog(userId, 'RESTORE', 'propietario', id, { activo: false }, { activo: true });
  return true;
}

async function checkCi(ci, excludeId) {
  if (!ci || !ci.trim()) return { exists: false };
  let sql = 'SELECT id, nombre FROM propietarios WHERE ci = ? AND activo = TRUE';
  const params = [ci.trim()];
  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }
  const rows = await db.query(sql, params);
  return rows.length > 0 ? { exists: true, nombre: rows[0].nombre } : { exists: false };
}

module.exports = { list, get, create, update, remove, restore, checkCi };
