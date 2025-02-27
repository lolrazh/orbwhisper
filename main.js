const { app, BrowserWindow, globalShortcut, ipcMain, screen, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
// Load environment variables from .env file
require('dotenv').config();

// Import our modules
const whisperApi = require('./src/whisper-api');
const keyboardSim = require('./src/keyboard-sim');
const settings = require('./src/settings');

// Get path to settings file
const SETTINGS_FILE_PATH = path.join(__dirname, 'settings.json');

// Make clipboard available to keyboard-sim module
keyboardSim.setClipboard(clipboard);

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

// Store the current global hotkey - will be loaded from settings
let currentHotkey;

function createWindow() {
  // Get primary display dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  // Window dimensions
  const winWidth = 200;
  const winHeight = 500;
  
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
    movable: false,  // Fixed position
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

  // Initialize API with Groq API key from environment variable
  whisperApi.initAPI(null, process.env.GROQ_API_KEY);

  // Load the hotkey from settings
  currentHotkey = settings.getSetting('hotkey');
  console.log(`Loaded hotkey from settings: ${currentHotkey}`);

  // Register a global shortcut for dictation toggle
  registerGlobalHotkey(currentHotkey);
  
  // Add a shortcut to close/hide the app
  globalShortcut.register('CommandOrControl+Shift+Escape', () => {
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.hide();
    }
  });
  
  // Watch for changes to settings.json
  fs.watch(SETTINGS_FILE_PATH, (eventType) => {
    if (eventType === 'change') {
      // Small delay to ensure file is fully written
      setTimeout(() => {
        try {
          // Read the new hotkey from settings
          const newHotkey = settings.getSetting('hotkey');
          
          // Only update if the hotkey has changed
          if (newHotkey && newHotkey !== currentHotkey) {
            console.log(`Settings file changed. Updating hotkey from ${currentHotkey} to ${newHotkey}`);
            registerGlobalHotkey(newHotkey);
          }
        } catch (err) {
          console.error('Error processing settings file change:', err);
        }
      }, 100);
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

//=====================================================================
// Audio Processing IPC Handlers
//=====================================================================

// Generic error handler for IPC calls
function handleIpcError(operation, err) {
  console.error(`Error during ${operation}:`, err);
  return err.message ? { error: err.message } : false;
}

// Start recording
ipcMain.handle('start-recording', async () => {
  try {
    return await whisperApi.startRecording();
  } catch (err) {
    return handleIpcError('starting recording', err);
  }
});

// Handle WebRTC audio chunks from renderer
ipcMain.handle('send-audio-chunk', async (event, chunk) => {
  try {
    return await whisperApi.addAudioChunk(chunk);
  } catch (err) {
    return handleIpcError('processing audio chunk', err);
  }
});

// Handle finalizing WebRTC audio recording
ipcMain.handle('finalize-audio-recording', async () => {
  try {
    return await whisperApi.finalizeRecording();
  } catch (err) {
    return handleIpcError('finalizing recording', err);
  }
});

// Handle audio transcription requests
ipcMain.handle('stop-recording-and-transcribe', async () => {
  try {
    return await whisperApi.getDictationText();
  } catch (err) {
    return handleIpcError('transcribing audio', err);
  }
});

// Handle typing text
ipcMain.handle('type-text', async (event, text) => {
  try {
    return await keyboardSim.typeText(text);
  } catch (err) {
    return handleIpcError('typing text', err);
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

//=====================================================================
// Settings & Configuration IPC Handlers
//=====================================================================

// Set global hotkey
ipcMain.handle('set-hotkey', async (event, hotkeyString) => {
  try {
    const success = registerGlobalHotkey(hotkeyString);
    if (success) {
      // Save the new hotkey to settings
      settings.updateSetting('hotkey', hotkeyString);
      console.log(`Hotkey updated in settings: ${hotkeyString}`);
    }
    return success;
  } catch (err) {
    console.error('Error setting hotkey:', err);
    return false;
  }
});

// Get current global hotkey
ipcMain.handle('get-current-hotkey', async () => {
  // Always get the latest from settings file
  currentHotkey = settings.getSetting('hotkey');
  return currentHotkey;
});

// Set app position
ipcMain.handle('set-position', async (event, positionCode) => {
  try {
    // Validate position code
    const validPositions = ['LT', 'MT', 'RT', 'LM', 'RM', 'LB', 'MB', 'RB'];
    if (!validPositions.includes(positionCode)) {
      console.error(`Invalid position code: ${positionCode}`);
      return false;
    }
    
    // Save the position to settings
    settings.updateSetting('position', positionCode);
    console.log(`Position updated in settings: ${positionCode}`);
    
    // Later we would implement the actual repositioning of the window
    // For now, we just save the setting
    
    return true;
  } catch (err) {
    console.error('Error setting position:', err);
    return false;
  }
});

// Get current position
ipcMain.handle('get-current-position', async () => {
  const position = settings.getSetting('position') || 'MB';
  return position;
});

// Function to register the global hotkey
function registerGlobalHotkey(hotkeyString) {
  // Validate input
  if (!hotkeyString || typeof hotkeyString !== 'string') {
    console.error('Invalid hotkey string:', hotkeyString);
    return false;
  }
  
  // First unregister any existing hotkey
  try {
    if (currentHotkey) {
      globalShortcut.unregister(currentHotkey);
    }
  } catch (err) {
    console.error('Error unregistering hotkey:', err);
    // Continue anyway - we'll try to register the new one
  }
  
  // Now register the new hotkey
  try {
    const success = globalShortcut.register(hotkeyString, () => {
      if (mainWindow) {
        // Send toggle message to the renderer process
        mainWindow.webContents.send('toggle-dictation');
        
        // Show window if it's hidden
        if (!mainWindow.isVisible()) {
          mainWindow.show();
        }
      }
    });
    
    if (success) {
      // Update current hotkey only if registration was successful
      currentHotkey = hotkeyString;
      console.log(`Successfully registered hotkey: ${hotkeyString}`);
      return true;
    } else {
      console.error(`Failed to register hotkey: ${hotkeyString}`);
      
      // If we failed to register a new hotkey, and we had a previous one,
      // try to restore the previous one (only once, no recursion)
      if (currentHotkey && currentHotkey !== hotkeyString) {
        try {
          const restored = globalShortcut.register(currentHotkey, () => {
            if (mainWindow) {
              mainWindow.webContents.send('toggle-dictation');
              if (!mainWindow.isVisible()) {
                mainWindow.show();
              }
            }
          });
          
          if (restored) {
            console.log(`Restored previous hotkey: ${currentHotkey}`);
          } else {
            console.error(`Failed to restore previous hotkey: ${currentHotkey}`);
            currentHotkey = null; // Clear since we couldn't restore it
          }
        } catch (e) {
          console.error('Error restoring previous hotkey:', e);
          currentHotkey = null; // Clear since we couldn't restore it
        }
      }
      
      return false;
    }
  } catch (err) {
    console.error('Error registering hotkey:', err);
    return false;
  }
} 