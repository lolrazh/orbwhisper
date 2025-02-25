const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 70,  // Start with a small bubble size
    height: 70,
    frame: false, // Frameless window
    transparent: true, // Allow transparency
    alwaysOnTop: true, // Always on top of other windows
    skipTaskbar: true, // Don't show in taskbar
    resizable: false, // Not resizable
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'src', 'preload.js')
    }
  });

  // Load the index.html of the app
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Position window in the bottom-right corner of the screen
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  mainWindow.setPosition(width - 100, height - 100);

  // Emitted when the window is closed
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  // Register a global shortcut for Win+H (or another combination)
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (mainWindow) {
      // Send toggle message to the renderer process
      mainWindow.webContents.send('toggle-dictation');
    }
  });

  app.on('activate', function () {
    // On macOS it's common to re-create a window when the dock icon is clicked
    if (mainWindow === null) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Unregister all shortcuts when quitting
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Set up IPC communication with renderer process
ipcMain.on('expand-window', (event, { width, height }) => {
  if (mainWindow) {
    mainWindow.setSize(width, height);
  }
});

ipcMain.on('collapse-window', () => {
  if (mainWindow) {
    mainWindow.setSize(70, 70);
  }
}); 