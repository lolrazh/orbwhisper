const { app, BrowserWindow, globalShortcut, ipcMain, screen, clipboard } = require('electron');
const path = require('path');
// Load environment variables from .env file
require('dotenv').config();

// Import our modules
const whisperApi = require('./src/whisper-api');
const keyboardSim = require('./src/keyboard-sim');

// Make clipboard available to keyboard-sim module
keyboardSim.setClipboard(clipboard);

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

function createWindow() {
  // Get primary display dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  // Updated window dimensions to match CSS changes
  const winWidth = 200; // Reduced from 270px to 200px
  const winHeight = 200; // Increased to 200px to ensure context menu fits
  
  // Create the browser window - centered horizontally
  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: Math.floor((screenWidth - winWidth) / 2),  // Center horizontally
    y: screenHeight - winHeight - 10,  // Position at bottom with 10px margin
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
      preload: path.join(__dirname, 'src', 'preload.js'),
      webSecurity: false // Allow loading adapter.js from CDN
    }
  });

  // Load the index.html of the app
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
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

  // Initialize Whisper API with API key from environment variable
  whisperApi.initOpenAI(process.env.OPENAI_API_KEY);

  // Register a global shortcut for dictation toggle
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
  
  // Add a shortcut to close/hide the app
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

// Handle window movement (vertical only)
ipcMain.on('move-window', (event, { moveX, moveY }) => {
  if (mainWindow) {
    const [x, y] = mainWindow.getPosition();
    const primaryDisplay = screen.getPrimaryDisplay();
    const { height: screenHeight } = primaryDisplay.workAreaSize;
    const [winWidth, winHeight] = mainWindow.getSize();
    
    // Only allow vertical movement, ignore horizontal
    let newY = Math.round(y + moveY);
    
    // Apply bounds checking for vertical position
    newY = Math.max(0, Math.min(screenHeight - winHeight, newY));
    
    // Keep x position the same (centered)
    mainWindow.setPosition(x, newY, false);
  }
});

// Handle absolute window positioning (vertical only)
ipcMain.on('set-window-position', (event, { x, y }) => {
  if (mainWindow) {
    // Get current position to maintain horizontal center
    const [currentX, currentY] = mainWindow.getPosition();
    
    // Ensure the window stays visible on screen vertically
    const { height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    const [winWidth, winHeight] = mainWindow.getSize();
    
    // Apply bounds checking for vertical only
    const boundedY = Math.max(0, Math.min(screenHeight - winHeight, Math.round(y)));
    
    // Set the position - keep x the same, only change y
    mainWindow.setPosition(currentX, boundedY, false);
  }
});

// Get current window position
ipcMain.handle('get-window-position', () => {
  if (mainWindow) {
    return mainWindow.getPosition();
  }
  return [0, 0];
});

//=====================================================================
// Audio Processing IPC Handlers
//=====================================================================

// Start recording
ipcMain.handle('start-recording', async () => {
  try {
    return await whisperApi.startRecording();
  } catch (err) {
    console.error('Error starting recording:', err);
    return false;
  }
});

// Handle WebRTC audio chunks from renderer
ipcMain.handle('send-audio-chunk', async (event, chunk) => {
  try {
    return await whisperApi.addAudioChunk(chunk);
  } catch (err) {
    console.error('Error processing audio chunk:', err);
    return false;
  }
});

// Handle finalizing WebRTC audio recording
ipcMain.handle('finalize-audio-recording', async () => {
  try {
    return await whisperApi.finalizeRecording();
  } catch (err) {
    console.error('Error finalizing recording:', err);
    return false;
  }
});

// Handle audio transcription requests
ipcMain.handle('stop-recording-and-transcribe', async () => {
  try {
    return await whisperApi.getDictationText();
  } catch (err) {
    console.error('Error transcribing audio:', err);
    return { error: err.message };
  }
});

// Handle typing text
ipcMain.handle('type-text', async (event, text) => {
  try {
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

// Handle hide app request
ipcMain.on('hide-app', () => {
  if (mainWindow && mainWindow.isVisible()) {
    mainWindow.hide();
  }
}); 