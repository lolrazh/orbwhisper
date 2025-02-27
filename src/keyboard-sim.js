// keyboard-sim.js
// Handles keyboard input simulation
// For Phase 3, using clipboard-based approach since robotjs requires additional setup

// Will be set from main process
let clipboard;
const { exec } = require('child_process');
const os = require('os');

// Function to receive clipboard from main process
function setClipboard(clipboardObj) {
  clipboard = clipboardObj;
}

// Helper function for sleeping (creating delays between keypresses)
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to execute platform-specific paste command
async function simulatePaste() {
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    let command;
    
    if (platform === 'win32') {
      // Windows: Use PowerShell to send Ctrl+V 
      command = 'powershell -command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys(\'^v\')"';
    } else if (platform === 'darwin') {
      // macOS: Use AppleScript to send Cmd+V
      command = 'osascript -e \'tell application "System Events" to keystroke "v" using command down\'';
    } else if (platform === 'linux') {
      // Linux: Use xdotool to send Ctrl+V
      command = 'xdotool key ctrl+v';
    } else {
      reject(new Error(`Unsupported platform: ${platform}`));
      return;
    }
    
    exec(command, (error) => {
      if (error) {
        console.error(`Error simulating paste: ${error.message}`);
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

// Simulate typing using clipboard and keyboard shortcuts
// This is a simplified approach that works without native modules
async function typeText(text) {
  if (!text || typeof text !== 'string') {
    return { error: "Invalid text input" };
  }
  
  if (!clipboard) {
    return { error: "Clipboard not initialized" };
  }
  
  try {
    console.log(`Simulating typing via clipboard: "${text}"`);
    
    // Store original clipboard content
    const originalClipboard = clipboard.readText();
    
    // Set the text to clipboard - minimize delay
    clipboard.writeText(text);
    
    // Reduce clipboard wait time to minimum viable
    await sleep(75);
    
    // Actually simulate Ctrl+V (paste)
    console.log('Simulating Ctrl+V keystroke to paste text');
    try {
      await simulatePaste();
    } catch (pasteError) {
      console.error('Paste simulation failed:', pasteError);
      return { error: "Failed to simulate paste: " + pasteError.message };
    }
    
    // Reduce post-paste wait time
    await sleep(100);
    
    // Restore original clipboard content
    clipboard.writeText(originalClipboard);
    console.log('Original clipboard content restored');
    
    return { success: true, message: "Text pasted via clipboard", text: text };
  } catch (err) {
    console.error('Error in typeText:', err);
    return { error: err.message || "Failed to type text" };
  }
}

module.exports = {
  typeText,
  sleep,
  setClipboard
}; 