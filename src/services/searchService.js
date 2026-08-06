const db = require('../database/db');

async function globalSearch(query) {
  if (!query || query.trim().length < 2) return { propietarios: [], mascotas: [], historial: [] };
  const term = `%${query.trim()}%`;

  const [propietarios, mascotas, historial] = await Promise.all([
    db.query(
      `SELECT id, nombre, ci, telefono FROM propietarios
        WHERE activo = TRUE AND (nombre LIKE ? OR ci LIKE ? OR telefono LIKE ? OR email LIKE ?)
       LIMIT 10`,
      [term, term, term, term]
    ),
    db.query(
      `SELECT m.id, m.nombre, m.especie, p.nombre AS propietario_nombre
       FROM mascotas m
       LEFT JOIN propietarios p ON p.id = m.propietario_id
       WHERE m.activo = TRUE AND (m.nombre LIKE ? OR m.especie LIKE ? OR m.raza LIKE ?)
       LIMIT 10`,
      [term, term, term]
    ),
    db.query(
      `SELECT h.id, h.mascota_id, h.descripcion, h.tipo, h.fecha, m.nombre AS mascota_nombre
       FROM historial_medico h
       JOIN mascotas m ON m.id = h.mascota_id
       WHERE h.descripcion LIKE ? OR h.diagnostico LIKE ? OR h.tratamiento LIKE ?
       LIMIT 10`,
      [term, term, term]
    ),
  ]);

  return { propietarios, mascotas, historial };
}

module.exports = { globalSearch };
