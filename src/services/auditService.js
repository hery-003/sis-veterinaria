const db = require('../database/db');

async function list(params = {}) {
  const { page = 1, limit = 50, search = '' } = params;
  const offset = (page - 1) * limit;

  let whereClause = '';
  const values = [];

  if (search) {
    whereClause = 'WHERE (a.accion LIKE ? OR a.entidad LIKE ? OR u.nombre LIKE ?)';
    const term = `%${search}%`;
    values.push(term, term, term);
  }

  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM audit_log a LEFT JOIN usuarios u ON u.id = a.usuario_id ${whereClause}`,
    values
  );
  const total = countResult[0].total;

  const rows = await db.query(
    `SELECT a.*, u.nombre AS usuario_nombre, u.username AS usuario_username
     FROM audit_log a
     LEFT JOIN usuarios u ON u.id = a.usuario_id
     ${whereClause}
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  return {
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

module.exports = { list };
