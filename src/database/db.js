const mysql = require('mysql2/promise');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const LOG_FILE = path.join(__dirname, '..', '..', 'logs', 'app.log');

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};
const currentLevel = parseInt(process.env.LOG_LEVEL || '2', 10);

function ensureLogsDir() {
  const logDir = path.dirname(LOG_FILE);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

function formatLog(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  return JSON.stringify(entry);
}

function writeLog(level, message, meta) {
  if (logLevels[level] > currentLevel) return;
  ensureLogsDir();
  const timestamp = new Date().toISOString();
  const entry = formatLog(level, message, meta) + '\n';
  fs.appendFileSync(LOG_FILE, entry, 'utf8');
  if (level === 'error') {
    console.error(`[${timestamp}] ${level.toUpperCase()}: ${message}`, meta);
  } else {
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, meta);
  }
}

const log = {
  error: (msg, meta) => writeLog('error', msg, meta),
  warn: (msg, meta) => writeLog('warn', msg, meta),
  info: (msg, meta) => writeLog('info', msg, meta),
  debug: (msg, meta) => writeLog('debug', msg, meta),
};

let config;
try {
  config = require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') }).parsed || {};
} catch {
  config = {};
}

const dbConfig = {
  host: config.DB_HOST || 'localhost',
  user: config.DB_USER || 'root',
  password: config.DB_PASSWORD || '',
  database: config.DB_NAME || 'veterinaria',
  waitForConnections: true,
  connectionLimit: parseInt(config.DB_POOL_LIMIT || '10', 10),
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  dateStrings: true,
  connectTimeout: 10000,
};

const CONNECTION_ERROR_CODES = new Set([
  'PROTOCOL_CONNECTION_LOST',
  'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
  'PROTOCOL_PACKETS_OUT_OF_ORDER',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ER_CON_COUNT_ERROR',
  'ER_SERVER_SHUTDOWN',
  'ER_CONNECTION_COUNT_ERROR',
  'ER_ACCESS_DENIED_ERROR',
]);

function isConnectionError(err) {
  return err && typeof err === 'object' && CONNECTION_ERROR_CODES.has(err.code);
}

async function invalidatePool() {
  if (pool) {
    try {
      await pool.end();
    } catch {}
    pool = null;
    log.info('Connection pool invalidated');
  }
}

const ADMIN_USERNAME = config.ADMIN_USERNAME || process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = config.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
const ADMIN_NOMBRE = config.ADMIN_NOMBRE || 'Administrador';

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    log.info('Connection pool created', { host: dbConfig.host, database: dbConfig.database });
  }
  return pool;
}

async function closePool() {
  if (pool) {
    try {
      await pool.end();
    } catch (err) {
      log.error('Error closing pool', { error: String(err) });
    }
    pool = null;
    log.info('Connection pool closed');
  }
}

function describeError(err) {
  return {
    error: String(err && err.message ? err.message : err),
    code: err && err.code ? err.code : null,
    errno: err && err.errno != null ? err.errno : null,
  };
}

async function query(sql, params) {
  let conn = getPool();
  try {
    const [results] = await conn.query(sql, params);
    return results;
  } catch (err) {
    log.error('Query error', { sql: sql.substring(0, 200), ...describeError(err) });
    if (isConnectionError(err)) {
      await invalidatePool();
      conn = getPool();
      try {
        const [results] = await conn.query(sql, params);
        return results;
      } catch (err2) {
        log.error('Query retry failed', { sql: sql.substring(0, 200), ...describeError(err2) });
        throw err2;
      }
    }
    throw err;
  }
}

async function queryOne(sql, params) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function execute(sql, params) {
  let conn = getPool();
  try {
    const [result] = await conn.execute(sql, params);
    return result;
  } catch (err) {
    log.error('Execute error', { sql: sql.substring(0, 200), ...describeError(err) });
    if (isConnectionError(err)) {
      await invalidatePool();
      conn = getPool();
      try {
        const [result] = await conn.execute(sql, params);
        return result;
      } catch (err2) {
        log.error('Execute retry failed', { sql: sql.substring(0, 200), ...describeError(err2) });
        throw err2;
      }
    }
    throw err;
  }
}

async function getConnection() {
  try {
    const conn = await getPool().getConnection();
    return conn;
  } catch (err) {
    log.error('Get connection error', { ...describeError(err) });
    if (isConnectionError(err)) {
      await invalidatePool();
      const conn = await getPool().getConnection();
      return conn;
    }
    throw err;
  }
}

async function withTransaction(callback) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    log.error('Transaction rolled back', { ...describeError(err) });
    throw err;
  } finally {
    conn.release();
  }
}

const PBKDF2_ITERATIONS = 600000;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 64, 'sha512').toString('hex');
  return PBKDF2_ITERATIONS + ':' + salt + ':' + hash;
}

function verifyPassword(password, stored) {
  const parts = stored.split(':');
  let iterations, salt, hash;
  if (parts.length === 3) {
    iterations = parseInt(parts[0], 10);
    salt = parts[1];
    hash = parts[2];
  } else {
    iterations = 1000;
    salt = parts[0];
    hash = parts[1];
  }
  const verify = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  return hash === verify;
}

async function initializeDatabase() {
  log.info('Initializing database');
  const tempConn = await mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
  });
  const dbName = dbConfig.database.replace(/[^a-zA-Z0-9_]/g, '');
  if (!dbName) throw new Error('Invalid database name');
  await tempConn.execute('CREATE DATABASE IF NOT EXISTS `' + dbName + '`');
  await tempConn.end();

  const pool = getPool();
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS propietarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ci VARCHAR(20),
      nombre VARCHAR(100) NOT NULL,
      telefono VARCHAR(20),
      direccion TEXT,
      email VARCHAR(100),
      activo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  try { await pool.execute('ALTER TABLE propietarios ADD COLUMN ci VARCHAR(20) AFTER id'); } catch {}
  try {
    const [indexes] = await pool.execute('SHOW INDEX FROM propietarios');
    const ciIndexes = (indexes || []).filter((ix) => ix.Column_name === 'ci' && ix.Non_unique === 0);
    for (const ix of ciIndexes) {
      try { await pool.execute('ALTER TABLE propietarios DROP INDEX `' + ix.Key_name + '`'); } catch {}
    }
  } catch {}
  try { await pool.execute('ALTER TABLE propietarios ADD COLUMN activo BOOLEAN DEFAULT TRUE AFTER email'); } catch {}
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS mascotas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      especie VARCHAR(50) NOT NULL,
      raza VARCHAR(50),
      edad INT,
      peso DECIMAL(5,2),
      foto VARCHAR(500),
      propietario_id INT NOT NULL,
      activo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (propietario_id) REFERENCES propietarios(id) ON DELETE CASCADE
    )
  `);
  try { await pool.execute('ALTER TABLE mascotas ADD COLUMN foto VARCHAR(500) AFTER peso'); } catch {}
  try {
    await pool.execute('ALTER TABLE mascotas ADD COLUMN activo BOOLEAN DEFAULT TRUE AFTER propietario_id');
  } catch {}
  try { await pool.execute("ALTER TABLE mascotas ADD COLUMN alergias TEXT NULL AFTER peso"); } catch {}
  try { await pool.execute("ALTER TABLE mascotas ADD COLUMN condiciones_cronicas TEXT NULL AFTER alergias"); } catch {}
  try {
    await pool.execute("UPDATE mascotas SET activo = TRUE WHERE activo IS NULL");
  } catch {}
  try {
    await pool.execute("UPDATE propietarios SET activo = TRUE WHERE activo IS NULL");
  } catch {}

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS historial_medico (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mascota_id INT NOT NULL,
      cita_id INT NULL,
      fecha DATE NOT NULL,
      tipo ENUM('consulta', 'vacuna', 'cirugia', 'receta') NOT NULL,
      descripcion TEXT,
      diagnostico TEXT,
      tratamiento TEXT,
      proxima_dosis DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (mascota_id) REFERENCES mascotas(id) ON DELETE CASCADE
    )
  `);
  try { await pool.execute('ALTER TABLE historial_medico ADD COLUMN proxima_dosis DATE AFTER tratamiento'); } catch {}
  try { await pool.execute('ALTER TABLE historial_medico ADD COLUMN cita_id INT NULL AFTER mascota_id'); } catch {}
  try { await pool.execute('ALTER TABLE historial_medico ADD COLUMN peso DECIMAL(5,2) NULL AFTER cita_id'); } catch {}
  try { await pool.execute('ALTER TABLE historial_medico ADD COLUMN autogenerado BOOLEAN DEFAULT FALSE AFTER peso'); } catch {}
  try { await pool.execute('ALTER TABLE historial_medico ADD COLUMN temperatura DECIMAL(4,1) NULL AFTER peso'); } catch {}
  try { await pool.execute('ALTER TABLE historial_medico ADD COLUMN frecuencia_cardiaca INT NULL AFTER temperatura'); } catch {}
  try { await pool.execute('ALTER TABLE historial_medico ADD COLUMN frecuencia_respiratoria INT NULL AFTER frecuencia_cardiaca'); } catch {}

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS vacunas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mascota_id INT NOT NULL,
      nombre_vacuna VARCHAR(100) NOT NULL,
      fecha DATE NOT NULL,
      proxima_dosis DATE NULL,
      lote VARCHAR(50),
      notas TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (mascota_id) REFERENCES mascotas(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS desparasitaciones (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mascota_id INT NOT NULL,
      producto VARCHAR(100) NOT NULL,
      fecha DATE NOT NULL,
      proxima_dosis DATE NULL,
      dosis VARCHAR(50),
      notas TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (mascota_id) REFERENCES mascotas(id) ON DELETE CASCADE
    )
  `);

  const [vacunasAntiguas] = await pool.execute(
    `SELECT id, mascota_id, fecha, descripcion, proxima_dosis FROM historial_medico WHERE tipo = 'vacuna'`
  );
  for (const v of vacunasAntiguas || []) {
    await pool.execute(
      'INSERT INTO vacunas (mascota_id, nombre_vacuna, fecha, proxima_dosis, notas) VALUES (?, ?, ?, ?, ?)',
      [v.mascota_id, v.descripcion || 'Vacuna', v.fecha, v.proxima_dosis || null, 'Migrado desde historial médico']
    );
  }
  if ((vacunasAntiguas || []).length > 0) {
    await pool.execute("DELETE FROM historial_medico WHERE tipo = 'vacuna'");
    log.info('Vacunas migradas a tabla dedicada', { count: vacunasAntiguas.length });
  }

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS citas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mascota_id INT NOT NULL,
      fecha DATE NOT NULL,
      hora TIME,
      motivo VARCHAR(255),
      estado ENUM('pendiente', 'realizada', 'cancelada') DEFAULT 'pendiente',
      notas TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (mascota_id) REFERENCES mascotas(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      nombre VARCHAR(100) NOT NULL,
      rol ENUM('admin', 'veterinario', 'recepcionista') DEFAULT 'veterinario',
      activo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  try { await pool.execute('ALTER TABLE usuarios ADD COLUMN rol ENUM(\'admin\', \'veterinario\', \'recepcionista\') DEFAULT \'veterinario\' AFTER nombre'); } catch {}
  try { await pool.execute('ALTER TABLE usuarios ADD COLUMN activo BOOLEAN DEFAULT TRUE AFTER rol'); } catch {}
  try { await pool.execute('ALTER TABLE usuarios ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE AFTER activo'); } catch {}

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS inventario (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      tipo ENUM('medicamento', 'vacuna', 'insumo', 'otro') NOT NULL,
      cantidad INT NOT NULL DEFAULT 0,
      precio DECIMAL(10,2),
      proveedor VARCHAR(100),
      lote VARCHAR(50),
      fecha_vencimiento DATE,
      descripcion TEXT,
      foto VARCHAR(500),
      activo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  try { await pool.execute('ALTER TABLE inventario ADD COLUMN foto VARCHAR(500) AFTER descripcion'); } catch {}
  try { await pool.execute('ALTER TABLE inventario ADD COLUMN activo BOOLEAN DEFAULT TRUE AFTER foto'); } catch {}
  try {
    await pool.execute("UPDATE inventario SET activo = TRUE WHERE activo IS NULL");
  } catch {}

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS movimientos_inventario (
      id INT AUTO_INCREMENT PRIMARY KEY,
      producto_id INT NOT NULL,
      tipo ENUM('entrada', 'salida') NOT NULL,
      cantidad INT NOT NULL,
      motivo VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (producto_id) REFERENCES inventario(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT,
      accion VARCHAR(50) NOT NULL,
      entidad VARCHAR(50) NOT NULL,
      entidad_id INT,
      datos_previos TEXT,
      datos_nuevos TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const existingUsers = await pool.execute('SELECT COUNT(*) AS count FROM usuarios');
  const count = existingUsers[0][0]?.count || 0;
  if (count === 0) {
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
      throw new Error('ADMIN_USERNAME y ADMIN_PASSWORD deben configurarse en .env o variables de entorno para crear el usuario administrador inicial.');
    }
    const hash = hashPassword(ADMIN_PASSWORD);
    await pool.execute(
      'INSERT INTO usuarios (username, password_hash, nombre, rol, must_change_password) VALUES (?, ?, ?, ?, TRUE)',
      [ADMIN_USERNAME, hash, ADMIN_NOMBRE, 'admin']
    );
    log.info('Admin user created', { username: ADMIN_USERNAME });
  }

  log.info('Database initialized successfully');
}

async function auditLog(usuarioId, accion, entidad, entidadId, datosPrevios, datosNuevos) {
  try {
    await query(
      'INSERT INTO audit_log (usuario_id, accion, entidad, entidad_id, datos_previos, datos_nuevos) VALUES (?, ?, ?, ?, ?, ?)',
      [
        usuarioId || null,
        accion,
        entidad,
        entidadId || null,
        datosPrevios ? JSON.stringify(datosPrevios) : null,
        datosNuevos ? JSON.stringify(datosNuevos) : null,
      ]
    );
  } catch (err) {
    log.error('Audit log failed', { ...describeError(err) });
  }
}

module.exports = {
  query,
  queryOne,
  execute,
  getConnection,
  withTransaction,
  initializeDatabase,
  closePool,
  hashPassword,
  verifyPassword,
  auditLog,
  log,
};
