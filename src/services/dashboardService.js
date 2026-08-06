const db = require('../database/db');

function dateFilter(prefix, startDate, endDate) {
  const clauses = [];
  const params = [];
  if (startDate) { clauses.push(`${prefix} >= ?`); params.push(startDate); }
  if (endDate) { clauses.push(`${prefix} <= ?`); params.push(endDate); }
  return { clause: clauses.length ? `AND ${clauses.join(' AND ')}` : '', params };
}

async function getSummary({ startDate, endDate } = {}) {
  const df = (prefix) => dateFilter(prefix, startDate, endDate);

  const hf = df('h.fecha');

  const tipoCountsSql = `SELECT tipo, COUNT(*) AS total FROM historial_medico h WHERE 1=1 ${hf.clause} GROUP BY tipo`;

  const [
    propietariosResult,
    mascotasResult,
    tipoCountsResult,
    recent,
    upcomingVaccines,
    consultasPorMes,
    mascotasPorEspecie,
    inventarioBajo,
    citasPendientes,
  ] = await Promise.all([
    db.query('SELECT COUNT(*) AS total FROM propietarios WHERE activo = TRUE'),
    db.query('SELECT COUNT(*) AS total FROM mascotas WHERE activo = TRUE'),
    db.query(tipoCountsSql, hf.params),
    db.query(
      `SELECT h.id, h.mascota_id, h.fecha, h.tipo, h.descripcion, h.created_at, m.nombre AS mascota_nombre
       FROM historial_medico h
       JOIN mascotas m ON m.id = h.mascota_id
       WHERE 1=1 ${hf.clause}
       ORDER BY h.created_at DESC LIMIT 5`,
      hf.params
    ),
    db.query(
      `SELECT h.id, h.proxima_dosis, h.descripcion, m.nombre AS mascota_nombre, m.id AS mascota_id
       FROM historial_medico h
       JOIN mascotas m ON m.id = h.mascota_id
       WHERE h.tipo = 'vacuna' AND h.proxima_dosis IS NOT NULL AND h.proxima_dosis <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
       ORDER BY h.proxima_dosis ASC LIMIT 10`
    ),
    db.query(
      `SELECT DATE_FORMAT(h.fecha, '%Y-%m') AS mes, COUNT(*) AS total
       FROM historial_medico h
       WHERE 1=1 ${hf.clause}
       GROUP BY DATE_FORMAT(h.fecha, '%Y-%m')
       ORDER BY mes ASC`,
      hf.params
    ),
    db.query(
      `SELECT especie, COUNT(*) AS total
       FROM mascotas WHERE activo = TRUE
       GROUP BY especie
       ORDER BY total DESC`
    ),
    db.query(
      `SELECT COUNT(*) AS total FROM inventario WHERE activo = TRUE AND cantidad <= 5`
    ),
    db.query(
      `SELECT COUNT(*) AS total FROM citas WHERE estado = 'pendiente' AND fecha >= CURDATE()`
    ),
  ]);

  const tipoCounts = {};
  tipoCountsResult.forEach(r => { tipoCounts[r.tipo] = r.total; });

  return {
    propietarios: propietariosResult[0]?.total || 0,
    mascotas: mascotasResult[0]?.total || 0,
    historial: tipoCountsResult.reduce((sum, r) => sum + r.total, 0),
    consultas: tipoCounts['consulta'] || 0,
    vacunas: tipoCounts['vacuna'] || 0,
    cirugias: tipoCounts['cirugia'] || 0,
    recetas: tipoCounts['receta'] || 0,
    inventarioBajo: inventarioBajo[0]?.total || 0,
    citasPendientes: citasPendientes[0]?.total || 0,
    recent,
    upcomingVaccines,
    consultasPorMes,
    mascotasPorEspecie,
  };
}

module.exports = { getSummary };
