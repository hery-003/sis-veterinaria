const { contextBridge, ipcRenderer } = require('electron');

async function invoke(channel, ...args) {
  const result = await ipcRenderer.invoke(channel, ...args);
  if (!result.ok) {
    const err = new Error(result.error || 'Error en la operación');
    if (result.errors) err.fieldErrors = result.errors;
    throw err;
  }
  return result.data;
}

function getUserFromStorage() {
  try {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

contextBridge.exposeInMainWorld('api', {
  getUser: () => getUserFromStorage(),
  hasRole: (roles) => {
    const user = getUserFromStorage();
    if (!user) return false;
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(user.rol);
  },

  login: (username, password) => invoke('auth:login', { username, password }),
  logout: () => invoke('auth:logout'),
  getMe: () => invoke('auth:me'),
  setUser: (user) => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
    return invoke('auth:setUser', user);
  },

  getPropietarios: (params) => invoke('propietarios:list', params),
  getPropietario: (id) => invoke('propietarios:get', id),
  createPropietario: (data) => invoke('propietarios:create', data),
  updatePropietario: (data) => invoke('propietarios:update', data),
  deletePropietario: (id) => invoke('propietarios:delete', id),
  restorePropietario: (id) => invoke('propietarios:restore', id),
  checkCiDuplicate: (ci, excludeId) => invoke('propietarios:checkCi', ci, excludeId),

  getMascotas: (params) => invoke('mascotas:list', params),
  getMascota: (id) => invoke('mascotas:get', id),
  createMascota: (data) => invoke('mascotas:create', data),
  updateMascota: (data) => invoke('mascotas:update', data),
  deleteMascota: (id) => invoke('mascotas:delete', id),
  restoreMascota: (id) => invoke('mascotas:restore', id),

  getHistorial: (mascotaId) => invoke('historial:list', mascotaId),
  getHistorialAll: (filters) => invoke('historial:listAll', filters),
  createHistorial: (data) => invoke('historial:create', data),
  updateHistorial: (data) => invoke('historial:update', data),
  deleteHistorial: (id) => invoke('historial:delete', id),

  getVacunas: (mascotaId) => invoke('vacunas:list', mascotaId),
  createVacuna: (data) => invoke('vacunas:create', data),
  updateVacuna: (data) => invoke('vacunas:update', data),
  deleteVacuna: (id) => invoke('vacunas:delete', id),

  getDesparasitaciones: (mascotaId) => invoke('desparasitaciones:list', mascotaId),
  createDesparasitacion: (data) => invoke('desparasitaciones:create', data),
  updateDesparasitacion: (data) => invoke('desparasitaciones:update', data),
  deleteDesparasitacion: (id) => invoke('desparasitaciones:delete', id),

  getCitasByDate: (fecha) => invoke('citas:listByDate', fecha),
  getCitasByMonth: (year, month) => invoke('citas:listByMonth', { year, month }),
  createCita: (data) => invoke('citas:create', data),
  updateCita: (data) => invoke('citas:update', data),
  deleteCita: (id) => invoke('citas:delete', id),
  getMascotasForCitas: () => invoke('citas:mascotas'),
  checkCitaConflict: (fecha, hora, excludeId) => invoke('citas:checkConflict', { fecha, hora, excludeId }),

  getDashboardSummary: (params) => invoke('dashboard:summary', params),

  getUsuarios: (params) => invoke('usuarios:list', params),
  getUsuario: (id) => invoke('usuarios:get', id),
  changePassword: (data) => invoke('usuarios:changePassword', data),
  createUsuario: (data) => invoke('usuarios:create', data),
  updateUsuario: (data) => invoke('usuarios:update', data),
  deleteUsuario: (id) => invoke('usuarios:delete', id),
  restoreUsuario: (id) => invoke('usuarios:restore', id),

  getInventario: (params) => invoke('inventario:list', params),
  getInventarioItem: (id) => invoke('inventario:get', id),
  createInventarioItem: (data) => invoke('inventario:create', data),
  updateInventarioItem: (data) => invoke('inventario:update', data),
  deleteInventarioItem: (id) => invoke('inventario:delete', id),
  restoreInventarioItem: (id) => invoke('inventario:restore', id),
  getInventarioMovimientos: (productoId) => invoke('inventario:movimientos', productoId),
  registrarMovimientoInventario: (data) => invoke('inventario:registrarMovimiento', data),
  getInventarioStock: (productoId) => invoke('inventario:getStock', productoId),

  checkReminders: () => invoke('recordatorios:check'),
  getAuditLog: (params) => invoke('audit:list', params),
  globalSearch: (query) => invoke('search:global', { query }),

  exportBackup: (filePath) => invoke('backup:export', filePath),
  importBackup: (filePath) => invoke('backup:import', filePath),
  selectFile: (extensions) => ipcRenderer.invoke('dialog:selectFile', extensions),
  saveFile: (defaultName) => ipcRenderer.invoke('dialog:saveFile', defaultName),
  savePdf: (fileName, data) => ipcRenderer.invoke('pdf:save', { fileName, data }),

  selectPhoto: () => ipcRenderer.invoke('photos:select'),
  getPhotoDataUrl: (filePath) => ipcRenderer.invoke('photos:getDataUrl', filePath),
  notifyDesktop: (title, body) => ipcRenderer.invoke('notify:desktop', { title, body }),
});
