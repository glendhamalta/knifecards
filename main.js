const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Caminho do iCloud Drive
const iCloudPath = path.join(
  os.homedir(),
  'Library/Mobile Documents/com~apple~CloudDocs'
);
const appDataPath = path.join(iCloudPath, 'KnifeCards');

// Garantir que pasta existe
if (!fs.existsSync(appDataPath)) {
  fs.mkdirSync(appDataPath, { recursive: true });
}

const STORAGE_FILE = path.join(appDataPath, 'data.json');

let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile('KnifeCards.html');
  mainWindow.webContents.openDevTools(); // Remover em produção
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC: Carregar dados do iCloud
ipcMain.handle('load-from-icloud', () => {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      return JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf-8'));
    }
    return null;
  } catch (error) {
    console.error('Erro ao carregar:', error);
    return null;
  }
});

// IPC: Salvar dados no iCloud
ipcMain.handle('save-to-icloud', (event, data) => {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
    console.log(`✓ Salvo em: ${STORAGE_FILE}`);
    return true;
  } catch (error) {
    console.error('Erro ao salvar:', error);
    return false;
  }
});

// IPC: Obter caminho (para debug)
ipcMain.handle('get-storage-path', () => STORAGE_FILE);
