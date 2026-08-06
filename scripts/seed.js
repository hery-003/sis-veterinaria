const mysql = require('mysql2/promise');
const path = require('path');
const crypto = require('crypto');

const config = require('dotenv').config({ path: path.join(__dirname, '..', '.env') }).parsed || {};
const FORCE = process.argv.includes('--force');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const iter = 600000;
  const hash = crypto.pbkdf2Sync(password, salt, iter, 64, 'sha512').toString('hex');
  return iter + ':' + salt + ':' + hash;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addMonths(d, n) {
  const x = new Date(d);
  const target = x.getMonth() + n;
  x.setMonth(target);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function main() {
  const conn = await mysql.createConnection({
    host: config.DB_HOST || 'localhost',
    user: config.DB_USER || 'root',
    password: config.DB_PASSWORD || '',
    database: config.DB_NAME || 'veterinaria',
    multipleStatements: true,
  });

  try {
    const [existing] = await conn.query('SELECT COUNT(*) AS c FROM propietarios');
    if (existing[0].c > 0 && !FORCE) {
      console.log('⚠ Ya existen datos en la base. Ejecute con --force para reemplazarlos: npm run seed -- --force');
      return;
    }

    await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
    await conn.execute('TRUNCATE TABLE movimientos_inventario');
    await conn.execute('TRUNCATE TABLE inventario');
    await conn.execute('TRUNCATE TABLE citas');
    await conn.execute('TRUNCATE TABLE historial_medico');
    await conn.execute('TRUNCATE TABLE mascotas');
    await conn.execute('TRUNCATE TABLE propietarios');
    await conn.execute('DELETE FROM usuarios WHERE username != ?', ['admin']);
    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');

    const propNombres = [
      'Carlos Mendoza', 'María Flores', 'Pedro Rojas', 'Ana Gutiérrez', 'Luis Sánchez',
      'Sofía Vargas', 'Diego Morales', 'Valentina Ortiz', 'Jorge Quispe', 'Lucía Fernández',
      'Ricardo Castro', 'Paola Suárez', 'Andrés Lima', 'Camila Ríos', 'Fernando Paz',
      'Daniela Vaca', 'Mario Ugarte', 'Nicole Ticona', 'Raúl Huanca', 'Brenda Aguilar',
    ];
    const propRows = propNombres.map((n, i) => [
      String(10000000 + i * 101),
      n,
      `7${String(7000000 + i * 123).slice(0, 8)}`,
      `Calle Test #${i + 1}`,
      `cliente${i + 1}@email.com`,
    ]);
    for (const p of propRows) {
      await conn.execute('INSERT INTO propietarios (ci, nombre, telefono, direccion, email) VALUES (?, ?, ?, ?, ?)', p);
    }
    console.log('✓ Propietarios (20)');

    const mascNombres = [
      'Max', 'Luna', 'Toby', 'Pelusa', 'Rex', 'Coco', 'Mila', 'Simba', 'Rocky', 'Bella',
      'Nemo', 'Canela', 'Thor', 'Kiwi', 'Panda', 'Zeus', 'Ruby', 'Tango', 'Nala', 'Oso',
    ];
    const especies = [
      ['Perro', 'Pastor Alemán'], ['Gato', 'Siamés'], ['Perro', 'Golden Retriever'],
      ['Gato', 'Persa'], ['Perro', 'Labrador'], ['Ave', 'Loro'], ['Perro', 'Poodle'],
      ['Gato', 'Bengalí'], ['Perro', 'Bulldog'], ['Perro', 'Chihuahua'], ['Perro', 'Husky'],
      ['Gato', 'Atigrado'], ['Perro', 'Rottweiler'], ['Ave', 'Perico'], ['Conejo', 'Holland'],
      ['Perro', 'Beagle'], ['Gato', 'Maine Coon'], ['Perro', 'Dálmata'], ['Gato', 'Angora'], ['Perro', 'Boxer'],
    ];
    for (let i = 0; i < 20; i++) {
      const ownerId = i + 1;
      const [esp, raza] = especies[i % especies.length];
      const edad = 6 + (i * 3) % 120;
      const peso = Number((1.5 + (i * 2.3) % 45).toFixed(2));
      await conn.execute(
        'INSERT INTO mascotas (nombre, especie, raza, edad, peso, propietario_id) VALUES (?, ?, ?, ?, ?, ?)',
        [mascNombres[i % mascNombres.length], esp, raza, edad, peso, ownerId]
      );
    }
    console.log('✓ Mascotas (20)');

    const today = new Date();
    const todayStr = addDays(today, 0);
    const tiposHist = ['consulta', 'vacuna', 'cirugia', 'receta'];
    for (let i = 0; i < 20; i++) {
      const mascId = i + 1;
      const tipo = tiposHist[i % tiposHist.length];
      const descs = [
        'Control general', 'Vacunación de rutina', 'Castración', 'Revisión dermatológica',
        'Desparasitación', 'Control post-operatorio', 'Limpieza dental', 'Revisión de oídos',
      ];
      const dxs = ['Sano', 'Gastritis', 'Infección de piel', 'Otitis', 'Alergia alimentaria', 'Parásitos', 'Displasia de cadera', 'Conjuntivitis'];
      const trat = ['Antibiótico por 7 días', 'Dieta controlada', 'Reposo y antiinflamatorio', 'Colirio tópico', 'Desparasitante oral', 'Limpieza quirúrgica'];
      let proxima = null;
      if (tipo === 'vacuna') proxima = addMonths(today, (i % 3) + 9);
      await conn.execute(
        'INSERT INTO historial_medico (mascota_id, fecha, tipo, descripcion, diagnostico, tratamiento, proxima_dosis) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [mascId, addDays(today, -((i % 20) + 5)), tipo, descs[i % descs.length], dxs[i % dxs.length], trat[i % trat.length], proxima]
      );
    }
    console.log('✓ Historial médico (20)');

    const motivos = [
      'Control de rutina', 'Vacunación', 'Cirugía de esterilización', 'Revisión dermatológica',
      'Corte de uñas', 'Control de alergia', 'Limpieza dental', 'Desparasitación',
      'Control de gastritis', 'Revisión post-operatoria',
    ];
    for (let i = 0; i < 20; i++) {
      const mascId = i + 1;
      const motivo = motivos[i % motivos.length];
      let fecha, estado;
      if (i < 5) {
        fecha = todayStr;
        estado = 'pendiente';
      } else if (i < 10) {
        fecha = addDays(today, 1 + (i % 5));
        estado = 'pendiente';
      } else if (i < 15) {
        fecha = addDays(today, -((i % 10) + 1));
        estado = 'realizada';
      } else {
        fecha = addDays(today, -((i % 10) + 1));
        estado = 'cancelada';
      }
      const hora = `${String(8 + (i % 8)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`;
      await conn.execute(
        'INSERT INTO citas (mascota_id, fecha, hora, motivo, estado, notas) VALUES (?, ?, ?, ?, ?, ?)',
        [mascId, fecha, hora, motivo, estado, `Nota de prueba ${i + 1}`]
      );
    }
    console.log('✓ Citas (20)');

    const userData = [
      ['vet1', hashPassword('vet1234'), 'Dr. Juan Pérez', 'veterinario'],
      ['vet2', hashPassword('vet5678'), 'Dra. Laura Méndez', 'veterinario'],
      ['recepcion', hashPassword('recep123'), 'Gabriela Ríos', 'recepcionista'],
    ];
    for (const u of userData) {
      const [rows] = await conn.execute('SELECT id FROM usuarios WHERE username = ?', [u[0]]);
      if (rows.length === 0) {
        await conn.execute('INSERT INTO usuarios (username, password_hash, nombre, rol) VALUES (?, ?, ?, ?)', u);
      }
    }
    console.log('✓ Usuarios');

    const prodNombres = [
      'Omeprazol 20mg', 'Amoxicilina 500mg', 'Vacuna Antirrábica', 'Vacuna Séxtuple',
      'Jeringas 5ml', 'Gasas Estériles', 'Collares Isabelinos', 'Desparasitante Interno',
      'Antipulgas Spot-on', 'Vacuna Trivalente Felina', 'Meloxicam 1.5mg', 'Suero Oral',
      'Antibiótico Oftálmico', 'Shampoo Medicado', 'Vitaminas Mascotas', 'Ivermectina',
      'Guantes Látex', 'Algodón Estéril', 'Vacuna Pentavalente', 'Hilo de Sutura',
    ];
    const tiposInv = ['medicamento', 'medicamento', 'vacuna', 'vacuna', 'insumo', 'insumo', 'insumo', 'medicamento', 'medicamento', 'vacuna', 'medicamento', 'otro', 'medicamento', 'otro', 'medicamento', 'medicamento', 'insumo', 'insumo', 'vacuna', 'insumo'];
    const cantidades = [45, 100, 27, 25, 190, 150, 15, 40, 60, 20, 35, 80, 50, 22, 70, 55, 120, 90, 18, 10];
    const precios = [12.5, 25, 80, 120, 1.5, 3, 45, 35, 55, 130, 18, 10, 22, 40, 30, 28, 0.8, 2.5, 110, 15];
    for (let i = 0; i < 20; i++) {
      const venc = i % 3 === 0 ? addMonths(today, 6) : null;
      await conn.execute(
        'INSERT INTO inventario (nombre, tipo, cantidad, precio, proveedor, lote, fecha_vencimiento, descripcion) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [prodNombres[i], tiposInv[i], cantidades[i], precios[i], i % 2 === 0 ? 'Farmavet' : 'Distrivet', `LOT-${String(i + 1).padStart(3, '0')}`, venc, `Descripción del producto ${i + 1}`]
      );
    }
    console.log('✓ Inventario (20)');

    for (let i = 0; i < 20; i++) {
      await conn.execute(
        'INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, motivo) VALUES (?, ?, ?, ?)',
        [i + 1, 'entrada', cantidades[i], 'Stock inicial']
      );
    }
    console.log('✓ Movimientos inventario (20)');

    console.log('\n✔ 20 datos de prueba por módulo insertados correctamente.');
  } catch (err) {
    console.error('Error:', err.message);
  }

  await conn.end();
}

main();
