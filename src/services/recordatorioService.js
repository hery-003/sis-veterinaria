const db = require('../database/db');

function dateOnlyStr(d) {
  if (typeof d === 'string') return d.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function checkReminders() {
  const upcomingVaccines = await db.query(
    `SELECT v.id, v.mascota_id, v.proxima_dosis, v.nombre_vacuna AS descripcion, m.nombre AS mascota_nombre
     FROM vacunas v
     JOIN mascotas m ON m.id = v.mascota_id
     WHERE v.proxima_dosis IS NOT NULL AND v.proxima_dosis <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
     ORDER BY v.proxima_dosis ASC`
  );
  const upcomingDesparasitaciones = await db.query(
    `SELECT d.id, d.mascota_id, d.proxima_dosis, d.producto AS descripcion, m.nombre AS mascota_nombre
     FROM desparasitaciones d
     JOIN mascotas m ON m.id = d.mascota_id
     WHERE d.proxima_dosis IS NOT NULL AND d.proxima_dosis <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
     ORDER BY d.proxima_dosis ASC`
  );
  const todayCitas = await db.query(
    `SELECT COUNT(*) AS total FROM citas WHERE fecha = CURDATE() AND estado = 'pendiente'`
  );
  const todayStr = dateOnlyStr(new Date());
  const mapOverdue = (row) => ({ ...row, overdue: dateOnlyStr(row.proxima_dosis) < todayStr });
  return {
    upcomingVaccines: upcomingVaccines.map(mapOverdue),
    upcomingDesparasitaciones: upcomingDesparasitaciones.map(mapOverdue),
    pendingCitasToday: todayCitas[0]?.total || 0,
  };
}

module.exports = { checkReminders };
