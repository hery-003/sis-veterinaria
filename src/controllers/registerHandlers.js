const { ipcMain } = require('electron');
const db = require('../database/db');
const authService = require('../services/authService');
const propietarioService = require('../services/propietarioService');
const mascotaService = require('../services/mascotaService');
const historialService = require('../services/historialService');
const vacunaService = require('../services/vacunaService');
const desparasitacionService = require('../services/desparasitacionService');
const dashboardService = require('../services/dashboardService');
const usuarioService = require('../services/usuarioService');
const citaService = require('../services/citaService');
const inventarioService = require('../services/inventarioService');
const backupService = require('../services/backupService');
const recordatorioService = require('../services/recordatorioService');
const auditService = require('../services/auditService');
const searchService = require('../services/searchService');

const ROL_PERMISSIONS = {
  admin: ['*'],
  veterinario: [
    'mascotas:*', 'historial:*', 'citas:*', 'dashboard:*',
    'propietarios:read', 'inventario:read', 'usuarios:read',
  ],
  recepcionista: [
    'propietarios:*', 'mascotas:read', 'citas:*', 'dashboard:*',
    'inventario:read',
  ],
};

const loginAttempts = new Map();
const sessions = new Map();

function getSenderId(event) {
  return event?.sender?.id;
}

function getUser(event) {
  const senderId = getSenderId(event);
  if (!senderId) return null;
  return sessions.get(senderId) || null;
}

function setUser(event, user) {
  const senderId = getSenderId(event);
  if (!senderId) return;
  if (user) sessions.set(senderId, user);
  else sessions.delete(senderId);
}

function clearSession(senderId) {
  if (senderId !== undefined && sessions.has(senderId)) {
    sessions.delete(senderId);
  }
}

function hasPermission(rol, permission) {
  const granted = ROL_PERMISSIONS[rol] || [];
  if (granted.includes('*')) return true;
  if (granted.includes(permission)) return true;
  const entity = permission.split(':')[0];
  return granted.includes(entity + ':*');
}

function wrapHandler(handler, options = {}) {
  return async (event, ...args) => {
    try {
      const requiresAuth = options.requiresAuth !== false;
      const currentUser = getUser(event);
      if (requiresAuth && !currentUser) {
        throw new Error('No autenticado');
      }

      if (options.roles && options.roles !== '*') {
        const allowedRoles = Array.isArray(options.roles) ? options.roles : [options.roles];
        if (!currentUser || !allowedRoles.includes(currentUser.rol)) {
          throw new Error('Sin permisos para esta acción');
        }
      }

      if (options.permission && (!currentUser || !hasPermission(currentUser.rol, options.permission))) {
        throw new Error('Sin permisos para esta acción');
      }

      const result = await handler(...args);
      return { ok: true, data: result };
    } catch (err) {
      console.error(`[IPC Error]:`, err.message, err.stack);
      return { ok: false, error: err.message, errors: err.errors || null };
    }
  };
}

function wrapHandlerWithUser(handler, options = {}) {
  return async (event, ...args) => {
    try {
      const currentUser = getUser(event);
      if (!currentUser) {
        throw new Error('No autenticado');
      }

      if (options.roles && options.roles !== '*') {
        const allowedRoles = Array.isArray(options.roles) ? options.roles : [options.roles];
        if (!currentUser || !allowedRoles.includes(currentUser.rol)) {
          throw new Error('Sin permisos para esta acción');
        }
      }

      if (options.permission && !hasPermission(currentUser.rol, options.permission)) {
        throw new Error('Sin permisos para esta acción');
      }

      const result = await handler(currentUser, ...args);
      return { ok: true, data: result };
    } catch (err) {
      console.error(`[IPC Error]:`, err.message, err.stack);
      return { ok: false, error: err.message, errors: err.errors || null };
    }
  };
}

function rateLimitLogin(username) {
  const now = Date.now();
  const entry = loginAttempts.get(username) || { count: 0, resetAt: now };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + 60000;
  }
  entry.count++;
  loginAttempts.set(username, entry);
  if (entry.count > 5) {
    const waitSeconds = Math.ceil((entry.resetAt - now) / 1000);
    throw new Error(`Demasiados intentos. Espere ${waitSeconds} segundos.`);
  }
}

function resetLoginAttempts(username) {
  loginAttempts.delete(username);
}

function registerHandlers() {
  ipcMain.handle('auth:login', async (event, { username, password }) => {
    try {
      rateLimitLogin(username);
      const user = await authService.login(username, password);
      if (user) {
        resetLoginAttempts(username);
        setUser(event, user);
        db.auditLog(user.id, 'LOGIN', 'usuario', user.id, null, { username: user.username });
        return { ok: true, data: user };
      }
      db.auditLog(null, 'LOGIN_FAILED', 'usuario', null, { username }, null);
      return { ok: true, data: null };
    } catch (err) {
      console.error(`[IPC Error] auth:login:`, err.message);
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('auth:logout', async (event) => {
    try {
      setUser(event, null);
      return { ok: true, data: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('auth:me', async (event) => {
    try {
      return { ok: true, data: getUser(event) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('auth:setUser', async (event, user) => {
    try {
      if (!user || !user.id || !user.username) {
        return { ok: false, error: 'Usuario inválido' };
      }
      const fresh = await db.queryOne(
        'SELECT id, username, nombre, rol, must_change_password FROM usuarios WHERE id = ? AND username = ? AND activo = TRUE',
        [user.id, user.username]
      );
      if (!fresh) {
        return { ok: false, error: 'Sesión inválida' };
      }
      const current = getUser(event);
      if (current && current.id !== fresh.id) {
        return { ok: false, error: 'Sesión no coincide' };
      }
      setUser(event, {
        id: fresh.id,
        username: fresh.username,
        nombre: fresh.nombre,
        rol: fresh.rol || 'veterinario',
        must_change_password: !!fresh.must_change_password,
      });
      return { ok: true, data: true };
    } catch (err) {
      console.error(`[IPC Error] auth:setUser:`, err.message);
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('propietarios:list', wrapHandler(async (params) => {
    return await propietarioService.list(params);
  }, { permission: 'propietarios:read' }));
  ipcMain.handle('propietarios:get', wrapHandler(async (id) => {
    return await propietarioService.get(id);
  }, { permission: 'propietarios:read' }));
  ipcMain.handle('propietarios:create', wrapHandlerWithUser(async (user, data) => {
    return await propietarioService.create(data, user.id);
  }, { permission: 'propietarios:write' }));
  ipcMain.handle('propietarios:update', wrapHandlerWithUser(async (user, { id, ...data }) => {
    return await propietarioService.update(id, data, user.id);
  }, { permission: 'propietarios:write' }));
  ipcMain.handle('propietarios:delete', wrapHandlerWithUser(async (user, id) => {
    return await propietarioService.remove(id, user.id);
  }, { permission: 'propietarios:write' }));
  ipcMain.handle('propietarios:restore', wrapHandlerWithUser(async (user, id) => {
    return await propietarioService.restore(id, user.id);
  }, { permission: 'propietarios:write' }));
  ipcMain.handle('propietarios:checkCi', wrapHandler(async (ci, excludeId) => {
    return await propietarioService.checkCi(ci, excludeId);
  }, { permission: 'propietarios:read' }));

  ipcMain.handle('mascotas:list', wrapHandler(async (params) => {
    return await mascotaService.list(params);
  }, { permission: 'mascotas:read' }));
  ipcMain.handle('mascotas:get', wrapHandler(async (id) => {
    return await mascotaService.get(id);
  }, { permission: 'mascotas:read' }));
  ipcMain.handle('mascotas:create', wrapHandlerWithUser(async (user, data) => {
    return await mascotaService.create(data, user.id);
  }, { permission: 'mascotas:write' }));
  ipcMain.handle('mascotas:update', wrapHandlerWithUser(async (user, { id, ...data }) => {
    return await mascotaService.update(id, data, user.id);
  }, { permission: 'mascotas:write' }));
  ipcMain.handle('mascotas:delete', wrapHandlerWithUser(async (user, id) => {
    return await mascotaService.remove(id, user.id);
  }, { permission: 'mascotas:write' }));
  ipcMain.handle('mascotas:restore', wrapHandlerWithUser(async (user, id) => {
    return await mascotaService.restore(id, user.id);
  }, { permission: 'mascotas:write' }));

  ipcMain.handle('dashboard:summary', wrapHandler((params) => dashboardService.getSummary(params || {}), { permission: 'dashboard:read' }));

  ipcMain.handle('usuarios:list', wrapHandler(usuarioService.list, { roles: 'admin' }));
  ipcMain.handle('usuarios:get', wrapHandler(async (id) => {
    return await usuarioService.get(id);
  }, { roles: 'admin' }));
  ipcMain.handle('usuarios:changePassword', wrapHandlerWithUser(async (user, { id, currentPassword, newPassword, force }) => {
    return await usuarioService.changePassword(user, id, currentPassword, newPassword, force);
  }));
  ipcMain.handle('usuarios:create', wrapHandlerWithUser(async (user, data) => {
    return await usuarioService.create(data, user.id);
  }, { roles: 'admin' }));
  ipcMain.handle('usuarios:update', wrapHandlerWithUser(async (user, { id, ...data }) => {
    return await usuarioService.update(id, data, user.id);
  }, { roles: 'admin' }));
  ipcMain.handle('usuarios:delete', wrapHandlerWithUser(async (user, id) => {
    return await usuarioService.remove(id, user.id);
  }, { roles: 'admin' }));
  ipcMain.handle('usuarios:restore', wrapHandlerWithUser(async (user, id) => {
    return await usuarioService.restore(id, user.id);
  }, { roles: 'admin' }));

  ipcMain.handle('citas:listByDate', wrapHandler(async (fecha) => {
    return await citaService.listByDate(fecha);
  }, { permission: 'citas:read' }));
  ipcMain.handle('citas:listByMonth', wrapHandler(async ({ year, month }) => {
    return await citaService.listByMonth(year, month);
  }, { permission: 'citas:read' }));
  ipcMain.handle('citas:create', wrapHandlerWithUser(async (user, data) => {
    return await citaService.create(data, user.id);
  }, { permission: 'citas:write' }));
  ipcMain.handle('citas:update', wrapHandlerWithUser(async (user, { id, ...data }) => {
    return await citaService.update(id, data, user.id);
  }, { permission: 'citas:write' }));
  ipcMain.handle('citas:delete', wrapHandlerWithUser(async (user, id) => {
    return await citaService.remove(id, user.id);
  }, { permission: 'citas:write' }));
  ipcMain.handle('citas:mascotas', wrapHandler(citaService.getMascotas, { permission: 'citas:read' }));
  ipcMain.handle('citas:checkConflict', wrapHandler(async ({ fecha, hora, excludeId }) => {
    return await citaService.checkConflict(fecha, hora, excludeId);
  }, { permission: 'citas:read' }));

  ipcMain.handle('historial:list', wrapHandler(async (mascotaId) => {
    return await historialService.list(mascotaId);
  }, { permission: 'historial:read' }));
  ipcMain.handle('historial:listAll', wrapHandler(async (filters) => {
    return await historialService.listAll(filters || {});
  }, { permission: 'historial:read' }));
  ipcMain.handle('historial:create', wrapHandlerWithUser(async (user, data) => {
    return await historialService.create(data, user.id);
  }, { permission: 'historial:write' }));
  ipcMain.handle('historial:update', wrapHandlerWithUser(async (user, { id, ...data }) => {
    return await historialService.update(id, data, user.id);
  }, { permission: 'historial:write' }));
  ipcMain.handle('historial:delete', wrapHandlerWithUser(async (user, id) => {
    return await historialService.remove(id, user.id);
  }, { permission: 'historial:write' }));

  ipcMain.handle('vacunas:list', wrapHandler(async (mascotaId) => {
    return await vacunaService.list(mascotaId);
  }, { permission: 'historial:read' }));
  ipcMain.handle('vacunas:create', wrapHandlerWithUser(async (user, data) => {
    return await vacunaService.create(data, user.id);
  }, { permission: 'historial:write' }));
  ipcMain.handle('vacunas:update', wrapHandlerWithUser(async (user, { id, ...data }) => {
    return await vacunaService.update(id, data, user.id);
  }, { permission: 'historial:write' }));
  ipcMain.handle('vacunas:delete', wrapHandlerWithUser(async (user, id) => {
    return await vacunaService.remove(id, user.id);
  }, { permission: 'historial:write' }));

  ipcMain.handle('desparasitaciones:list', wrapHandler(async (mascotaId) => {
    return await desparasitacionService.list(mascotaId);
  }, { permission: 'historial:read' }));
  ipcMain.handle('desparasitaciones:create', wrapHandlerWithUser(async (user, data) => {
    return await desparasitacionService.create(data, user.id);
  }, { permission: 'historial:write' }));
  ipcMain.handle('desparasitaciones:update', wrapHandlerWithUser(async (user, { id, ...data }) => {
    return await desparasitacionService.update(id, data, user.id);
  }, { permission: 'historial:write' }));
  ipcMain.handle('desparasitaciones:delete', wrapHandlerWithUser(async (user, id) => {
    return await desparasitacionService.remove(id, user.id);
  }, { permission: 'historial:write' }));

  ipcMain.handle('inventario:list', wrapHandler(async (params) => {
    return await inventarioService.list(params);
  }, { permission: 'inventario:read' }));
  ipcMain.handle('inventario:get', wrapHandler(async (id) => {
    return await inventarioService.get(id);
  }, { permission: 'inventario:read' }));
  ipcMain.handle('inventario:create', wrapHandlerWithUser(async (user, data) => {
    return await inventarioService.create(data, user.id);
  }, { permission: 'inventario:write' }));
  ipcMain.handle('inventario:update', wrapHandlerWithUser(async (user, { id, ...data }) => {
    return await inventarioService.update(id, data, user.id);
  }, { permission: 'inventario:write' }));
  ipcMain.handle('inventario:delete', wrapHandlerWithUser(async (user, id) => {
    return await inventarioService.remove(id, user.id);
  }, { permission: 'inventario:write' }));
  ipcMain.handle('inventario:restore', wrapHandlerWithUser(async (user, id) => {
    return await inventarioService.restore(id, user.id);
  }, { permission: 'inventario:write' }));
  ipcMain.handle('inventario:movimientos', wrapHandler(async (productoId) => {
    return await inventarioService.movimientos(productoId);
  }, { permission: 'inventario:read' }));
  ipcMain.handle('inventario:registrarMovimiento', wrapHandlerWithUser(async (user, { producto_id, tipo, cantidad, motivo }) => {
    return await inventarioService.registrarMovimiento(producto_id, tipo, cantidad, motivo, user.id);
  }, { permission: 'inventario:write' }));
  ipcMain.handle('inventario:getStock', wrapHandler(async (productoId) => {
    const result = await require('../database/db').queryOne('SELECT cantidad FROM inventario WHERE id = ? AND activo = TRUE', [productoId]);
    return result ? result.cantidad : 0;
  }, { permission: 'inventario:read' }));

  ipcMain.handle('backup:export', wrapHandlerWithUser(async (user, filePath) => {
    return await backupService.exportBackup(filePath, user.id);
  }, { roles: 'admin' }));
  ipcMain.handle('backup:import', wrapHandlerWithUser(async (user, filePath) => {
    return await backupService.importBackup(filePath, user.id);
  }, { roles: 'admin' }));

  ipcMain.handle('recordatorios:check', wrapHandler(recordatorioService.checkReminders));

  ipcMain.handle('audit:list', wrapHandler(auditService.list, { roles: 'admin' }));

  ipcMain.handle('search:global', wrapHandler(({ query }) => searchService.globalSearch(query)));
}

module.exports = { registerHandlers, clearSession };
