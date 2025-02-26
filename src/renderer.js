// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const appContainer = document.getElementById('app-container');
  const bubble = document.getElementById('bubble');
  const expandedPanel = document.getElementById('expanded-panel');
  const statusText = document.getElementById('status-text');
  const debugPanel = document.getElementById('debug-panel');
  const transcribedTextElement = document.getElementById('transcribed-text');
  
  // Ensure status text is properly set at startup
  statusText.textContent = 'Ready to dictate';
  
  // Check if we're in development mode
  const isDev = window.location.href.includes('dev');
  
  // Show debug panel in dev mode
  if (isDev) {
    debugPanel.classList.remove('hidden');
  }
  
  // Track dictation state
  let isDictating = false;
  let isPasting = false;
  
  // Track hotkey configuration
  let currentKeyCombo = '';
  
  // WebRTC Audio Recording variables
  let mediaRecorder = null;
  let mediaStream = null;
  
  // Create context menu - completely new implementation
  function createContextMenu(x, y) {
    // Remove any existing menu first
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }
    
    // Create a new menu
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    document.body.appendChild(menu);
    
    // Add menu items
    const menuItems = [
      { label: 'Hide App', action: hideApp, isDummy: false },
      { label: 'Hotkey', action: showHotkeyConfig, isDummy: false },
      { type: 'separator' },
      { label: 'Close App', action: closeApp }
    ];
    
    // Add items to menu
    menuItems.forEach(item => {
      if (item.type === 'separator') {
        const separator = document.createElement('div');
        separator.className = 'context-menu-separator';
        menu.appendChild(separator);
      } else {
        const menuItem = document.createElement('div');
        menuItem.className = 'context-menu-item';
        if (item.isDummy) menuItem.className += ' dummy-button';
        menuItem.textContent = item.label;
        
        // Add click handler
        menuItem.addEventListener('click', () => {
          hideContextMenu();
          item.action();
        });
        
        menu.appendChild(menuItem);
      }
    });
    
    // Function to hide context menu
    function hideContextMenu() {
      if (menu && document.body.contains(menu)) {
        document.body.removeChild(menu);
        window.removeEventListener('blur', hideContextMenu);
        document.removeEventListener('click', handleOutsideClick);
        document.removeEventListener('keydown', handleEscapeKey);
      }
    }
    
    // Handle clicks outside the menu
    function handleOutsideClick(event) {
      // Check if the click was outside the menu
      if (menu && !menu.contains(event.target)) {
        hideContextMenu();
      }
    }
    
    // Handle escape key press
    function handleEscapeKey(event) {
      if (event.key === 'Escape') {
        hideContextMenu();
      }
    }
    
    // Close menu when window loses focus
    window.addEventListener('blur', hideContextMenu);
    
    // Use a short timeout to avoid the same click that opened the menu
    setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
      document.addEventListener('keydown', handleEscapeKey);
    }, 100);
    
    // Clean up if app recording starts
    bubble.addEventListener('click', hideContextMenu, { once: true });
    
    // Also make sure menu is removed when hotkey is pressed
    window.api.onToggleDictation(() => {
      hideContextMenu();
    });
  }
  
  // Show hotkey configuration UI
  function showHotkeyConfig() {
    // Remove existing hotkey config panel if it exists
    const existingPanel = document.querySelector('.hotkey-config');
    if (existingPanel) {
        existingPanel.remove();
    }

    // Create hotkey config panel
    const hotkeyConfig = document.createElement('div');
    hotkeyConfig.className = 'hotkey-config';
    
    const title = document.createElement('div');
    title.className = 'hotkey-title';
    title.textContent = 'Configure Hotkey';
    
    const instructions = document.createElement('div');
    instructions.className = 'hotkey-instructions';
    instructions.textContent = 'Press a key combination:';
    
    const display = document.createElement('div');
    display.className = 'hotkey-display';
    
    // Function to truncate long hotkey strings
    const formatHotkeyDisplay = (hotkeyStr) => {
        if (!hotkeyStr) return 'None';
        // If longer than 20 characters, truncate
        return hotkeyStr.length > 20 
            ? hotkeyStr.substring(0, 18) + '...' 
            : hotkeyStr;
    };
    
    // Get current hotkey from main process
    window.api.getCurrentHotkey().then(currentHotkey => {
        display.textContent = formatHotkeyDisplay(currentHotkey);
        // Add title attribute for tooltip on hover
        display.title = currentHotkey || 'None';
        currentKeyCombo = currentHotkey;
    });
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'hotkey-buttons';
    
    const saveButton = document.createElement('button');
    saveButton.className = 'hotkey-save';
    saveButton.textContent = 'Save';
    saveButton.disabled = true;
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'hotkey-cancel';
    cancelButton.textContent = 'Cancel';
    
    buttonsContainer.appendChild(saveButton);
    buttonsContainer.appendChild(cancelButton);
    
    hotkeyConfig.appendChild(title);
    hotkeyConfig.appendChild(instructions);
    hotkeyConfig.appendChild(display);
    hotkeyConfig.appendChild(buttonsContainer);
    
    document.body.appendChild(hotkeyConfig);
    
    // Position the panel - center it in the window for simplicity
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const panelWidth = 200; // Slightly wider than before
    const panelHeight = 150;
    
    const left = (windowWidth - panelWidth) / 2;
    const top = (windowHeight - panelHeight) / 2;
    
    hotkeyConfig.style.left = `${left}px`;
    hotkeyConfig.style.top = `${top}px`;
    
    // Track key combinations
    let keysPressed = new Set();
    let keyCombo = '';
    
    // Key handlers
    function handleKeyDown(e) {
        e.preventDefault();
        
        // Ignore escape by itself (used to close the panel)
        if (e.key === 'Escape' && keysPressed.size === 0) {
            return;
        }
        
        // Add key to tracked keys
        keysPressed.add(e.key);
        
        // Convert to Electron accelerator format
        let combo = [];
        
        if (keysPressed.has('Control')) combo.push('CommandOrControl');
        if (keysPressed.has('Alt')) combo.push('Alt');
        if (keysPressed.has('Shift')) combo.push('Shift');
        
        // Add non-modifier keys
        const nonModifiers = Array.from(keysPressed).filter(key => 
            !['Control', 'Alt', 'Shift', 'Meta'].includes(key)
        );
        
        // Only add one non-modifier key (the last one pressed)
        if (nonModifiers.length > 0) {
            const lastKey = nonModifiers[nonModifiers.length - 1];
            combo.push(lastKey);
        }
        
        keyCombo = combo.join('+');
        
        // Update display
        if (nonModifiers.length > 0) {
            display.textContent = formatHotkeyDisplay(keyCombo);
            display.title = keyCombo; // Add title attribute for tooltip
            display.classList.add('key-pressed');
            saveButton.disabled = false;
        } else {
            display.textContent = 'Press a key...';
            display.title = ''; // Clear title tooltip
            display.classList.remove('key-pressed');
            saveButton.disabled = true;
        }
    }
    
    function handleKeyUp(e) {
        keysPressed.delete(e.key);
        
        if (keysPressed.size === 0) {
            display.classList.remove('key-pressed');
        }
    }
    
    // Slight delay for UI to render before adding event listeners
    setTimeout(() => {
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        
        // Handle button clicks
        saveButton.addEventListener('click', () => {
            if (keyCombo) {
                saveButton.textContent = 'Saving...';
                saveButton.disabled = true;
                
                window.api.setHotkey(keyCombo).then(success => {
                    if (success) {
                        // Show saved confirmation
                        display.textContent = 'Hotkey saved!';
                        display.classList.add('success');
                        saveButton.textContent = 'Save';
                        
                        // Close after a brief delay
                        setTimeout(() => {
                            closeHotkeyConfig();
                        }, 1000);
                    } else {
                        saveButton.textContent = 'Save';
                        saveButton.disabled = false;
                        display.textContent = 'Invalid hotkey';
                        display.classList.add('error');
                        setTimeout(() => {
                            display.classList.remove('error');
                            display.textContent = formatHotkeyDisplay(currentKeyCombo);
                        }, 2000);
                    }
                });
            }
        });
        
        cancelButton.addEventListener('click', closeHotkeyConfig);
        
        // Handle clicking outside to close - with delay to prevent immediate closing
        setTimeout(() => {
            document.addEventListener('click', handleOutsideClick);
        }, 300);
    }, 100);
    
    function closeHotkeyConfig() {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
        document.removeEventListener('click', handleOutsideClick);
        
        if (hotkeyConfig && hotkeyConfig.parentNode) {
            hotkeyConfig.remove();
        }
    }
    
    function handleOutsideClick(e) {
        // Only process outside clicks after a short delay
        if (hotkeyConfig && !hotkeyConfig.contains(e.target) && e.target !== hotkeyConfig) {
            closeHotkeyConfig();
        }
    }
    
    // Handle escape key to close
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            document.removeEventListener('keydown', escHandler);
            closeHotkeyConfig();
        }
    });
  }
  
  function hideApp() {
    // Stop any ongoing recording first
    if (isDictating) {
      stopWebRTCRecording().catch(console.error);
      isDictating = false;
      bubble.classList.remove('active');
      appContainer.classList.remove('recording');
      appContainer.classList.add('collapsed');
    }
    
    window.api.hideApp();
  }
  
  function closeApp() {
    // Stop any ongoing recording
    if (isDictating) {
      stopWebRTCRecording().catch(console.error);
    }
    
    // Stop and release media stream if it exists
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
    
    window.api.closeApp();
  }
  
  // Function to setup WebRTC audio recording
  async function setupAudioRecording() {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Store the stream for later use
      mediaStream = stream;
      
      // Create recorder with WebM format
      const options = { mimeType: 'audio/webm' };
      mediaRecorder = new MediaRecorder(stream, options);
      
      // Event handler for data available event
      mediaRecorder.addEventListener('dataavailable', async (event) => {
        if (event.data.size > 0) {
          // Convert blob to array buffer for sending to main process
          const arrayBuffer = await event.data.arrayBuffer();
          
          // Send the audio chunk to the main process
          try {
            await window.api.sendAudioChunk(arrayBuffer);
          } catch (error) {
            console.error('Error sending audio chunk:', error);
          }
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      statusText.textContent = 'Microphone access denied';
      return false;
    }
  }
  
  // Function to start WebRTC recording
  function startWebRTCRecording() {
    if (!mediaRecorder || mediaRecorder.state === 'recording') {
      return false;
    }
    
    try {
      // Start recording with 1-second chunks
      mediaRecorder.start(1000);
      return true;
    } catch (error) {
      console.error('Error starting WebRTC recording:', error);
      return false;
    }
  }
  
  // Function to stop WebRTC recording
  async function stopWebRTCRecording() {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') {
      return false;
    }
    
    return new Promise((resolve) => {
      mediaRecorder.addEventListener('stop', async () => {
        // Finalize the recording in the main process
        try {
          await window.api.finalizeAudioRecording();
          resolve(true);
        } catch (error) {
          console.error('Error finalizing recording:', error);
          resolve(false);
        }
      }, { once: true });
      
      // Stop the recording
      mediaRecorder.stop();
    });
  }
  
  // Helper function to reset the status text after a delay
  function resetStatusTextAfterDelay() {
    setTimeout(() => {
      if (!isDictating && !isPasting) {
        // Always reset to "Ready to dictate" to avoid incorrect text
        statusText.textContent = 'Ready to dictate';
      }
    }, 3000);
  }
  
  // Initialize WebRTC recording on startup
  setupAudioRecording().catch(error => {
    console.error('Error setting up audio recording:', error);
    // Even if mic setup fails, ensure the status message is correct
    statusText.textContent = 'Ready to dictate';
  });
  
  // Function to toggle dictation mode
  async function toggleDictation() {
    if (isPasting) return; // Don't toggle if currently pasting
    
    isDictating = !isDictating;
    
    if (isDictating) {
      // Expand the UI
      appContainer.classList.remove('collapsed');
      appContainer.classList.add('recording'); // Add recording class to hide status text
      bubble.classList.add('active');
      
      // Start recording - first in main process to set up state
      const mainProcessStarted = await window.api.startRecording();
      
      // Then start WebRTC recording in renderer
      if (mainProcessStarted) {
        const webrtcStarted = startWebRTCRecording();
        
        if (!webrtcStarted) {
          statusText.textContent = 'Failed to start recording';
          isDictating = false;
          bubble.classList.remove('active');
          appContainer.classList.remove('recording');
        }
      } else {
        statusText.textContent = 'Failed to start recording';
        isDictating = false;
        bubble.classList.remove('active');
        appContainer.classList.remove('recording');
      }
    } else {
      // Add pasting state
      isPasting = true;
      bubble.classList.remove('active');
      bubble.classList.add('pasting');
      appContainer.classList.remove('recording');
      
      // Stop WebRTC recording first
      await stopWebRTCRecording();
      
      // Then get transcription via main process
      window.api.stopRecordingAndTranscribe()
        .then(result => {
          if (result && result.text) {
            // Show the transcribed text briefly
            statusText.textContent = `Typing: "${result.text.substring(0, 20)}${result.text.length > 20 ? '...' : ''}"`;
            
            // For debugging, show the transcribed text
            if (isDev && transcribedTextElement) {
              const timestamp = new Date().toLocaleTimeString();
              transcribedTextElement.textContent = `[${timestamp}] ${result.text}\n${transcribedTextElement.textContent}`;
            }
            
            // Simulate typing the text
            window.api.typeText(result.text)
              .then(typeResult => {
                // Remove pasting state
                bubble.classList.remove('pasting');
                isPasting = false;
                
                if (typeResult.error) {
                  statusText.textContent = `Error: ${typeResult.error}`;
                }
                resetStatusTextAfterDelay();
              })
              .catch(err => {
                console.error('Typing error:', err);
                statusText.textContent = 'Typing failed';
                bubble.classList.remove('pasting');
                isPasting = false;
                resetStatusTextAfterDelay();
              });
          } else if (result.error) {
            statusText.textContent = `Error: ${result.error}`;
            bubble.classList.remove('pasting');
            isPasting = false;
            resetStatusTextAfterDelay();
          }
        })
        .catch(err => {
          console.error('Transcription error:', err);
          statusText.textContent = 'Transcription failed';
          bubble.classList.remove('pasting');
          isPasting = false;
          resetStatusTextAfterDelay();
        });
      
      // Collapse the UI
      appContainer.classList.add('collapsed');
    }
  }
  
  // Set up event listeners
  
  // Handle bubble clicks
  bubble.addEventListener('click', toggleDictation);
  
  // Handle clicking on expanded panel
  expandedPanel.addEventListener('click', toggleDictation);
  
  // Context menu (right-click) handler
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    createContextMenu(e.clientX, e.clientY);
  });
  
  // Listen for toggle event from main process (global hotkey)
  window.api.onToggleDictation(toggleDictation);
  
  // Handle keyboard shortcut (space) for testing in the UI
  if (isDev) {
    document.addEventListener('keydown', (event) => {
      if (event.code === 'Space') {
        toggleDictation();
      }
    });
  }
}); 