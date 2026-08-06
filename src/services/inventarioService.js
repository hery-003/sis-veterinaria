const db = require('../database/db');
const { validateInventario, validateMovimiento, throwIfErrors, sanitizeString } = require('../utils/validation');

async function list(params = {}) {
  const { page = 1, limit = 50, search = '', tipo, soloActivos = true, bajoStock } = params;
  const offset = (page - 1) * limit;
  const searchTerm = `%${search || ''}%`;

  const conditions = [];
  const values = [];

  if (soloActivos) conditions.push('i.activo = TRUE');
  if (tipo) {
    conditions.push('i.tipo = ?');
    values.push(tipo);
  }
  if (search) {
    conditions.push('(i.nombre LIKE ? OR i.proveedor LIKE ? OR i.lote LIKE ?)');
    values.push(searchTerm, searchTerm, searchTerm);
  }
  if (bajoStock) {
    conditions.push('i.cantidad <= 5');
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM inventario i ${whereClause}`,
    values
  );
  const total = countResult[0].total;

  const rows = await db.query(
    `SELECT i.*, 
     (SELECT COUNT(*) FROM movimientos_inventario mi WHERE mi.producto_id = i.id) as total_movimientos
     FROM inventario i
     ${whereClause}
     ORDER BY i.created_at DESC
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
  if (isNaN(numId)) throw new Error('ID de producto inválido');
  const row = await db.queryOne('SELECT id, nombre, tipo, cantidad, precio, proveedor, lote, fecha_vencimiento, descripcion, foto, activo, created_at FROM inventario WHERE id = ?', [numId]);
  return row || null;
}

async function create(data, userId) {
  const errors = validateInventario(data);
  throwIfErrors(errors);

  const result = await db.query(
    'INSERT INTO inventario (nombre, tipo, cantidad, precio, proveedor, lote, fecha_vencimiento, descripcion, foto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      sanitizeString(data.nombre, 100),
      data.tipo || 'otro',
      parseInt(data.cantidad) || 0,
      data.precio !== undefined && data.precio !== null && data.precio !== '' ? parseFloat(data.precio) : null,
      sanitizeString(data.proveedor, 100) || null,
      sanitizeString(data.lote, 50) || null,
      data.fecha_vencimiento || null,
      sanitizeString(data.descripcion, 500) || null,
      data.foto || null,
    ]
  );

  await db.auditLog(userId, 'CREATE', 'inventario', result.insertId, null, data);

  if (parseInt(data.cantidad) > 0) {
    await db.query(
      'INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, motivo) VALUES (?, ?, ?, ?)',
      [result.insertId, 'entrada', parseInt(data.cantidad), 'Stock inicial']
    );
  }

  return result.insertId;
}

async function update(id, data, userId) {
  const errors = validateInventario(data);
  throwIfErrors(errors);

  const numId = parseInt(id, 10);
  if (isNaN(numId)) throw new Error('ID de producto inválido');

  const prev = await get(numId);
  if (!prev) throw new Error('Producto no encontrado');

  const cantidadPresente = data.cantidad !== undefined && data.cantidad !== null && data.cantidad !== '';
  const newCantidad = cantidadPresente ? parseInt(data.cantidad) : prev.cantidad;
  if (cantidadPresente && isNaN(newCantidad)) throw new Error('Cantidad inválida');
  const diff = newCantidad - (prev.cantidad || 0);

  const updateSql = 'UPDATE inventario SET nombre = ?, tipo = ?, cantidad = ?, precio = ?, proveedor = ?, lote = ?, fecha_vencimiento = ?, descripcion = ?, foto = ? WHERE id = ?';
  const updateParams = [
    data.nombre !== undefined ? sanitizeString(data.nombre, 100) : prev.nombre,
    data.tipo !== undefined ? (data.tipo || 'otro') : prev.tipo,
    newCantidad,
    data.precio !== undefined && data.precio !== null && data.precio !== '' ? parseFloat(data.precio) : prev.precio,
    data.proveedor !== undefined ? sanitizeString(data.proveedor, 100) || null : prev.proveedor,
    data.lote !== undefined ? sanitizeString(data.lote, 50) || null : prev.lote,
    data.fecha_vencimiento !== undefined ? (data.fecha_vencimiento || null) : prev.fecha_vencimiento,
    data.descripcion !== undefined ? sanitizeString(data.descripcion, 500) || null : prev.descripcion,
    data.foto !== undefined ? (data.foto || null) : prev.foto,
    numId,
  ];

  if (diff !== 0) {
    await db.withTransaction(async (conn) => {
      const [rows] = await conn.query('SELECT cantidad FROM inventario WHERE id = ? AND activo = TRUE FOR UPDATE', [numId]);
      const producto = rows[0];
      if (!producto) throw new Error('Producto no encontrado');
      await conn.query(updateSql, updateParams);
      await conn.query(
        'INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, motivo) VALUES (?, ?, ?, ?)',
        [numId, diff > 0 ? 'entrada' : 'salida', Math.abs(diff), 'Ajuste manual']
      );
    });
  } else {
    await db.query(updateSql, updateParams);
  }

  await db.auditLog(userId, 'UPDATE', 'inventario', numId, prev, { ...data, cantidad: newCantidad, ajuste: diff });
  return true;
}

async function remove(id, userId) {
  const prev = await get(id);
  if (!prev) throw new Error('Producto no encontrado');

  await db.query('UPDATE inventario SET activo = FALSE WHERE id = ?', [id]);
  await db.auditLog(userId, 'SOFT_DELETE', 'inventario', id, prev, { activo: false });
  return true;
}

async function restore(id, userId) {
  const prev = await get(id);
  if (!prev) throw new Error('Producto no encontrado');
  if (prev.activo) return true;

  await db.query('UPDATE inventario SET activo = TRUE WHERE id = ?', [id]);
  await db.auditLog(userId, 'RESTORE', 'inventario', id, { activo: false }, { activo: true });
  return true;
}

async function movimientos(productoId) {
  const numId = parseInt(productoId, 10);
  if (isNaN(numId)) throw new Error('ID de producto inválido');
  return await db.query(
    'SELECT id, producto_id, tipo, cantidad, motivo, created_at FROM movimientos_inventario WHERE producto_id = ? ORDER BY created_at DESC',
    [numId]
  );
}

async function registrarMovimiento(productoId, tipo, cantidad, motivo, userId) {
  const errors = validateMovimiento({ producto_id: productoId, tipo, cantidad });
  throwIfErrors(errors);
  const numId = parseInt(productoId, 10);
  if (isNaN(numId)) throw new Error('ID de producto inválido');

  let prevCantidad = null;
  let nuevaCantidad = null;
  await db.withTransaction(async (conn) => {
    const [rows] = await conn.query('SELECT cantidad FROM inventario WHERE id = ? AND activo = TRUE FOR UPDATE', [numId]);
    const producto = rows[0];
    if (!producto) throw new Error('Producto no encontrado');

    if (tipo === 'salida' && producto.cantidad < cantidad) {
      throw new Error(`Stock insuficiente. Disponible: ${producto.cantidad}`);
    }

    prevCantidad = producto.cantidad;
    nuevaCantidad = tipo === 'entrada' ? producto.cantidad + cantidad : producto.cantidad - cantidad;

    await conn.query('UPDATE inventario SET cantidad = ? WHERE id = ?', [nuevaCantidad, numId]);
    await conn.query(
      'INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, motivo) VALUES (?, ?, ?, ?)',
      [numId, tipo, cantidad, sanitizeString(motivo, 255) || null]
    );
  });

  await db.auditLog(userId, 'MOVIMIENTO', 'inventario', numId, { cantidad: prevCantidad }, { cantidad: nuevaCantidad, tipo, cantidad });
  return true;
}

module.exports = { list, get, create, update, remove, restore, movimientos, registrarMovimiento };
