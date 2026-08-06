const db = require('../database/db');
const { hashPassword, verifyPassword } = db;
const { validateUsuario, throwIfErrors, sanitizeString } = require('../utils/validation');

async function list(params = {}) {
  const { page = 1, limit = 50, search = '', soloActivos = true, rol } = params;
  const offset = (page - 1) * limit;
  const searchTerm = `%${search || ''}%`;

  const conditions = [];
  const values = [];

  if (soloActivos) conditions.push('u.activo = TRUE');
  if (rol) {
    conditions.push('u.rol = ?');
    values.push(rol);
  }
  if (search) {
    conditions.push('(u.username LIKE ? OR u.nombre LIKE ?)');
    values.push(searchTerm, searchTerm);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM usuarios u ${whereClause}`,
    values
  );
  const total = countResult[0].total;

  const rows = await db.query(
    `SELECT id, username, nombre, rol, activo, created_at, updated_at 
     FROM usuarios u
     ${whereClause}
     ORDER BY u.created_at DESC
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
  const row = await db.queryOne(
    'SELECT id, username, nombre, rol, activo, created_at, updated_at FROM usuarios WHERE id = ?',
    [id]
  );
  return row || null;
}

async function changePassword(user, id, currentPassword, newPassword, force) {
  if (user.rol !== 'admin' && user.id !== id) {
    throw new Error('Solo puede cambiar su propia contraseña');
  }

  const rows = await db.query('SELECT password_hash, must_change_password FROM usuarios WHERE id = ? AND activo = TRUE', [id]);
  if (rows.length === 0) throw new Error('Usuario no encontrado');

  if (!force && user.id === id) {
    if (!verifyPassword(currentPassword, rows[0].password_hash)) {
      throw new Error('La contraseña actual no es correcta');
    }
  }

  if (!newPassword || newPassword.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres');
  }

  const hash = hashPassword(newPassword);
  const debeCambiar = user.id !== id;
  await db.query('UPDATE usuarios SET password_hash = ?, must_change_password = ? WHERE id = ?', [hash, debeCambiar, id]);
  await db.auditLog(user.id, 'CHANGE_PASSWORD', 'usuario', id, null, null);
  return true;
}

async function create(data, userId) {
  if (!data.password || String(data.password).length < 6) {
    const e = new Error('La contraseña debe tener al menos 6 caracteres');
    e.name = 'ValidationError';
    e.field = 'password';
    e.status = 400;
    throw e;
  }
  const errors = validateUsuario(data);
  throwIfErrors(errors);

  const dup = await db.query('SELECT id FROM usuarios WHERE username = ? AND activo = TRUE', [data.username]);
  if (dup.length > 0) throw new Error('El nombre de usuario ya existe');

  const hash = hashPassword(data.password);
  const result = await db.query(
    'INSERT INTO usuarios (username, password_hash, nombre, rol, must_change_password) VALUES (?, ?, ?, ?, TRUE)',
    [
      sanitizeString(data.username, 50),
      hash,
      sanitizeString(data.nombre, 100),
      data.rol || 'veterinario',
    ]
  );

  await db.auditLog(userId, 'CREATE', 'usuario', result.insertId, null, { username: data.username, nombre: data.nombre, rol: data.rol });
  return result.insertId;
}

async function update(id, data, userId) {
  const prev = await get(id);
  if (!prev) throw new Error('Usuario no encontrado');

  const fields = [];
  const values = [];

  if (data.nombre !== undefined) {
    fields.push('nombre = ?');
    values.push(sanitizeString(data.nombre, 100));
  }
  if (data.rol !== undefined) {
    const rolesPermitidos = ['admin', 'veterinario', 'recepcionista'];
    if (!rolesPermitidos.includes(data.rol)) {
      throw new Error('Rol inválido');
    }
    fields.push('rol = ?');
    values.push(data.rol);
  }
  if (data.username !== undefined) {
    const dup = await db.query('SELECT id FROM usuarios WHERE username = ? AND activo = TRUE AND id != ?', [data.username, id]);
    if (dup.length > 0) throw new Error('El nombre de usuario ya existe');
    fields.push('username = ?');
    values.push(sanitizeString(data.username, 50));
  }

  if (fields.length === 0) return true;

  values.push(id);
  await db.query('UPDATE usuarios SET ' + fields.join(', ') + ' WHERE id = ?', values);

  await db.auditLog(userId, 'UPDATE', 'usuario', id, prev, data);
  return true;
}

async function remove(id, userId) {
  const prev = await get(id);
  if (!prev) throw new Error('Usuario no encontrado');

  if (prev.username === 'admin') {
    throw new Error('No se puede eliminar el usuario administrador');
  }

  await db.query('UPDATE usuarios SET activo = FALSE WHERE id = ?', [id]);
  await db.auditLog(userId, 'SOFT_DELETE', 'usuario', id, prev, { activo: false });
  return true;
}

async function restore(id, userId) {
  const prev = await get(id);
  if (!prev) throw new Error('Usuario no encontrado');
  if (prev.activo) return true;

  const dup = await db.query('SELECT id FROM usuarios WHERE username = ? AND activo = TRUE', [prev.username]);
  if (dup.length > 0) throw new Error('Ya existe un usuario activo con ese nombre de usuario');

  await db.query('UPDATE usuarios SET activo = TRUE WHERE id = ?', [id]);
  await db.auditLog(userId, 'RESTORE', 'usuario', id, { activo: false }, { activo: true });
  return true;
}

module.exports = { list, get, changePassword, create, update, remove, restore };
