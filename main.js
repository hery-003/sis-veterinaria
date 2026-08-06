const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./src/database/db');
const { registerHandlers, clearSession } = require('./src/controllers/registerHandlers');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const wcId = mainWindow.webContents.id;
  mainWindow.webContents.on('destroyed', () => {
    clearSession(wcId);
  });

  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));

  if (process.env.DEBUG || process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

let lastDbError = '';

async function tryInitializeDatabase() {
  try {
    await db.initializeDatabase();
    console.log('Base de datos inicializada correctamente');
    lastDbError = '';
    return true;
  } catch (err) {
    lastDbError = String(err && err.message ? err.message : err);
    console.error('Error al inicializar la base de datos:', lastDbError, err && err.code);
    db.log.error('Error al inicializar la base de datos', { error: lastDbError, code: err && err.code ? err.code : null });
    return false;
  }
}

app.whenReady().then(async () => {
  registerHandlers();
  let ok = await tryInitializeDatabase();
  while (!ok) {
    const choice = await dialog.showMessageBox({
      type: 'error',
      title: 'Error de conexión a la base de datos',
      message: 'No se pudo conectar a la base de datos MySQL.',
      detail:
        'Verifica que el servicio MySQL esté activo y que los datos del archivo .env sean correctos.\n\n' +
        `Detalle técnico: ${lastDbError || 'error desconocido'}`,
      buttons: ['Reintentar', 'Salir'],
      defaultId: 0,
    });
    if (choice.response === 0) {
      ok = await tryInitializeDatabase();
    } else {
      db.closePool().catch(() => {});
      app.quit();
      return;
    }
  }
  createWindow();
});

ipcMain.handle('notify:desktop', async (_, { title, body }) => {
  const { Notification } = require('electron');
  if (Notification.isSupported()) {
    new Notification({ title, body, icon: path.join(__dirname, 'dist', 'favicon.ico') }).show();
  }
});

const photosDir = path.join(app.getPath('userData'), 'photos');

ipcMain.handle('photos:select', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const srcPath = result.filePaths[0];
  const ext = path.extname(srcPath);
  const fileName = Date.now() + ext;
  const destPath = path.join(photosDir, fileName);

  try {
    if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    return destPath;
  } catch (err) {
    console.error('Error al copiar foto:', err);
    return null;
  }
});

ipcMain.handle('photos:getDataUrl', async (_, filePath) => {
  if (!filePath || typeof filePath !== 'string' || !fs.existsSync(filePath)) return null;
  const resolved = path.resolve(filePath);
  const base = path.resolve(photosDir);
  const rel = path.relative(base, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  const ext = path.extname(resolved).slice(1).toLowerCase();
  if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return null;
  try {
    const mime = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', gif: 'gif', webp: 'webp' }[ext] || 'jpeg';
    const data = fs.readFileSync(resolved);
    return `data:image/${mime};base64,${data.toString('base64')}`;
  } catch {
    return null;
  }
});

ipcMain.handle('dialog:saveFile', async (_, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || 'backup.sql',
    filters: [{ name: 'SQL Backup', extensions: ['sql'] }],
  });
  if (result.canceled) return null;
  return result.filePath;
});

ipcMain.handle('dialog:selectFile', async (_, extensions) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Archivos', extensions: extensions || ['sql'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('pdf:save', async (_, { fileName, data }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: fileName || 'documento.pdf',
    filters: [{ name: 'Documento PDF', extensions: ['pdf'] }],
  });
  if (result.canceled || !result.filePath) return { saved: false };
  try {
    fs.writeFileSync(result.filePath, Buffer.from(data, 'base64'));
    return { saved: true, filePath: result.filePath };
  } catch (err) {
    console.error('Error al guardar PDF:', err);
    return { saved: false, error: String(err) };
  }
});

app.on('window-all-closed', () => {
  db.closePool().then(() => {
    if (process.platform !== 'darwin') app.quit();
  }).catch(() => {
    if (process.platform !== 'darwin') app.quit();
  });
});

app.on('before-quit', () => {
  db.closePool().catch(() => {});
});
