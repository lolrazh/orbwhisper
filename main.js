const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');

// Import our modules
const whisperApi = require('./src/whisper-api');
const keyboardSim = require('./src/keyboard-sim');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

function createWindow() {
  // Get primary display dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  // Create the browser window with fixed size
  mainWindow = new BrowserWindow({
    width: 270,  // Fixed width to accommodate expansion
    height: 70,
    x: screenWidth - 280,  // Position in bottom right, accounting for window size
    y: screenHeight - 80,
    frame: false, // Frameless window
    transparent: true, // Allow transparency
    alwaysOnTop: true, // Always on top of other windows
    skipTaskbar: true, // Don't show in taskbar
    resizable: false, // Not resizable
    movable: false,  // We'll implement custom move
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
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
    // Open in detached mode and position it away from our app
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Emitted when the window is closed
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
  
  // Prevent the window from being closed when its close button is clicked
  // Instead, hide it (this prevents accidental closure)
  mainWindow.on('close', function (event) {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    return true;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  // Initialize Whisper API with placeholder key for now
  // In a real app, we would load this from an environment variable
  // or prompt the user to enter their API key
  whisperApi.initOpenAI('dummy-api-key');

  // Register a global shortcut for Win+H (or another combination)
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (mainWindow) {
      // Send toggle message to the renderer process
      mainWindow.webContents.send('toggle-dictation');
      
      // Show window if it's hidden
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
    }
  });
  
  // Add a second shortcut to close/hide the app
  globalShortcut.register('CommandOrControl+Shift+Escape', () => {
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.hide();
    }
  });

  app.on('activate', function () {
    // On macOS it's common to re-create a window when the dock icon is clicked
    if (mainWindow === null) createWindow();
    else if (!mainWindow.isVisible()) mainWindow.show();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Make sure we properly quit the app when explicitly asked to
app.on('before-quit', () => {
  app.isQuitting = true;
});

// Unregister all shortcuts when quitting
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Handle window movement
ipcMain.on('move-window', (event, { moveX, moveY }) => {
  if (mainWindow) {
    const [x, y] = mainWindow.getPosition();
    
    // Ensure the window stays visible on screen
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    const [winWidth, winHeight] = mainWindow.getSize();
    
    // Calculate new position
    let newX = x + moveX;
    let newY = y + moveY;
    
    // Apply bounds checking
    newX = Math.max(0, Math.min(screenWidth - winWidth, newX));
    newY = Math.max(0, Math.min(screenHeight - winHeight, newY));
    
    mainWindow.setPosition(newX, newY);
  }
});

// Handle audio recording requests
ipcMain.handle('start-recording', async () => {
  try {
    return await whisperApi.startRecording();
  } catch (err) {
    console.error('Error starting recording:', err);
    return false;
  }
});

// Handle audio transcription requests
ipcMain.handle('stop-recording-and-transcribe', async () => {
  try {
    // Stop recording and get the transcription
    return await whisperApi.getDictationText();
  } catch (err) {
    console.error('Error transcribing audio:', err);
    return { error: err.message };
  }
});

// Handle typing text
ipcMain.handle('type-text', async (event, text) => {
  try {
    // Simulate typing the text
    return await keyboardSim.typeText(text);
  } catch (err) {
    console.error('Error typing text:', err);
    return { error: err.message };
  }
});

// Handle close app request
ipcMain.on('close-app', () => {
  app.isQuitting = true;
  app.quit();
}); 