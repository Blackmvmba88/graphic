const { app, BrowserWindow, Menu, session, systemPreferences } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const entry = path.join(__dirname, '..', 'dist', 'client', 'index.html');
const entryURL = pathToFileURL(entry).href;
let window;
function isApp(url) { return url === entryURL; }
function createWindow() {
  window = new BrowserWindow({
    width: 1500, height: 980, minWidth: 760, minHeight: 620,
    title: 'BlackMamba Music Engine', backgroundColor: '#13101f',
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, spellcheck: false },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => { if (!isApp(url)) event.preventDefault(); });
  window.on('closed', () => { window = null; });
  window.loadFile(entry);
}
app.whenReady().then(() => {
  session.defaultSession.setPermissionCheckHandler((contents, permission, origin, details) =>
    permission === 'media' && !!contents && isApp(contents.getURL()) && details.mediaType === 'audio');
  session.defaultSession.setPermissionRequestHandler(async (contents, permission, callback, details) => {
    if (permission !== 'media' || !contents || !isApp(contents.getURL()) ||
      !details.mediaTypes?.length || details.mediaTypes.some(type => type !== 'audio')) return callback(false);
    try { callback(process.platform !== 'darwin' || await systemPreferences.askForMediaAccess('microphone')); }
    catch { callback(false); }
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: app.name, submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] },
    { label: 'Edición', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'Vista', submenu: [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
    { label: 'Ventana', submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'close' }] },
  ]));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => app.quit());
