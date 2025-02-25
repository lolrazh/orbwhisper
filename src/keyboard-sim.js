// keyboard-sim.js
// Handles keyboard input simulation
// SIMPLIFIED VERSION FOR PHASE 2

// Helper function for sleeping (creating delays between keypresses)
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Since we're not using robotjs yet, this is a simplified placeholder
// In the future, this will simulate typing into the active window
async function typeText(text) {
  console.log(`Simulating typing: "${text}"`);
  
  // For Phase 2, just return the text that would be typed
  // This will be displayed in the debug panel
  return text;
}

module.exports = {
  typeText,
  sleep
}; 