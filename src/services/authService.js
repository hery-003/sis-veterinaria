const db = require('../database/db');

async function login(username, password) {
  let rows;
  try {
    rows = await db.query(
      'SELECT id, username, nombre, rol, password_hash, must_change_password FROM usuarios WHERE username = ? AND activo = TRUE',
      [username]
    );
  } catch (err) {
    db.log.error('Login DB error', {
      error: String(err && err.message ? err.message : err),
      code: err && err.code ? err.code : null,
    });
    throw new Error('No se pudo conectar con la base de datos. Verifique la conexión e intente nuevamente.');
  }
  if (rows.length === 0) return null;
  const user = rows[0];
  const match = db.verifyPassword(password, user.password_hash);
  if (!match) return null;
  db.log.info('User login', { username: user.username, rol: user.rol });
  return { id: user.id, username: user.username, nombre: user.nombre, rol: user.rol || 'veterinario', must_change_password: !!user.must_change_password };
}

module.exports = { login };
