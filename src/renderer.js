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
    console.log('Creating context menu...');
    
    // Remove any existing menu first
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }
    
    // Create a new menu
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    document.body.appendChild(menu);
    
    // Add menu items - removed Hide App and added Screen Position
    const menuItems = [
      { label: 'Screen Position', action: () => {
        console.log('Screen Position clicked');
        showPositionConfig();
      }},
      { label: 'Hotkey', action: () => {
        console.log('Hotkey clicked');
        showHotkeyConfig();
      }},
      { type: 'separator' },
      { label: 'Close App', action: () => {
        console.log('Close App clicked');
        closeApp();
      }}
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
        menuItem.addEventListener('click', (event) => {
          console.log(`Menu item clicked: ${item.label}`);
          event.stopPropagation(); // Prevent the click from being captured elsewhere
          hideContextMenu();
          // Use setTimeout to ensure menu is hidden before action executes
          setTimeout(() => {
            item.action();
          }, 50);
        });
        
        menu.appendChild(menuItem);
      }
    });
    
    // Position the menu next to the bubble
    const bubbleRect = bubble.getBoundingClientRect();
    menu.style.bottom = `${window.innerHeight - bubbleRect.top + 10}px`;
    
    // Function to hide context menu
    function hideContextMenu() {
      console.log('Hiding context menu');
      if (menu && document.body.contains(menu)) {
        document.body.removeChild(menu);
        window.removeEventListener('blur', hideContextMenu);
        document.removeEventListener('click', handleOutsideClick);
        document.removeEventListener('keydown', handleEscapeKey);
      }
    }
    
    // Handle clicks outside the menu
    function handleOutsideClick(event) {
      // Check if the click was outside the menu and bubble
      if (menu && !menu.contains(event.target) && !bubble.contains(event.target)) {
        console.log('Click outside menu detected');
        hideContextMenu();
      }
    }
    
    // Handle escape key press
    function handleEscapeKey(event) {
      if (event.key === 'Escape') {
        console.log('Escape key pressed');
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
    
    // Expose the hideContextMenu function
    return { hideContextMenu };
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
  
  // Show screen position configuration UI
  function showPositionConfig() {
    console.log('Opening screen position configuration');
    
    // Remove existing position config panel if it exists
    const existingPanel = document.querySelector('.position-config');
    if (existingPanel) {
        existingPanel.remove();
    }

    // Create position config panel (similar to hotkey config)
    const positionConfig = document.createElement('div');
    positionConfig.className = 'position-config';
    
    const title = document.createElement('div');
    title.className = 'position-title';
    title.textContent = 'Screen Position';
    
    const instructions = document.createElement('div');
    instructions.className = 'position-instructions';
    instructions.textContent = 'Select where the app should appear:';
    
    // Create dropdown instead of grid
    const dropdown = document.createElement('select');
    dropdown.className = 'position-dropdown';
    
    // Position options for the dropdown
    const positions = [
      { code: 'LT', label: 'Top Left' },
      { code: 'MT', label: 'Top Center' },
      { code: 'RT', label: 'Top Right' },
      { code: 'LM', label: 'Middle Left' },
      { code: 'RM', label: 'Middle Right' },
      { code: 'LB', label: 'Bottom Left' },
      { code: 'MB', label: 'Bottom Center' },
      { code: 'RB', label: 'Bottom Right' }
    ];
    
    // Default to middle bottom if we can't get the setting
    let selectedPosition = 'MB';
    
    // Add options to dropdown
    positions.forEach(pos => {
      const option = document.createElement('option');
      option.value = pos.code;
      option.textContent = pos.label;
      dropdown.appendChild(option);
    });
    
    // Get current position from settings
    window.api.getCurrentPosition().then(position => {
      selectedPosition = position;
      dropdown.value = selectedPosition;
    });
    
    // Listen for changes
    dropdown.addEventListener('change', function() {
      selectedPosition = this.value;
    });
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'position-buttons';
    
    const saveButton = document.createElement('button');
    saveButton.className = 'position-save';
    saveButton.textContent = 'Save';
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'position-cancel';
    cancelButton.textContent = 'Cancel';
    
    buttonsContainer.appendChild(saveButton);
    buttonsContainer.appendChild(cancelButton);
    
    positionConfig.appendChild(title);
    positionConfig.appendChild(instructions);
    positionConfig.appendChild(dropdown);
    positionConfig.appendChild(buttonsContainer);
    
    document.body.appendChild(positionConfig);
    
    // Position the panel - at same position as the context menu would appear
    const bubbleRect = bubble.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    
    // Same positioning as used for context menu
    positionConfig.style.position = 'absolute';
    positionConfig.style.bottom = `${windowHeight - bubbleRect.top + 10}px`;
    positionConfig.style.left = '50%';
    positionConfig.style.transform = 'translateX(-50%)';
    
    // Handle button clicks
    saveButton.addEventListener('click', () => {
      saveButton.textContent = 'Saving...';
      saveButton.disabled = true;
      
      // Save position to settings
      window.api.setPosition(selectedPosition).then(success => {
        if (success) {
          // Show saved confirmation
          dropdown.style.display = 'none';
          
          const savedMessage = document.createElement('div');
          savedMessage.className = 'position-saved';
          savedMessage.textContent = 'Position saved!';
          savedMessage.style.textAlign = 'center';
          savedMessage.style.color = '#90ff91';
          savedMessage.style.marginBottom = '14px';
          
          positionConfig.insertBefore(savedMessage, buttonsContainer);
          
          // Close after a brief delay
          setTimeout(() => {
            closePositionConfig();
          }, 1000);
        } else {
          saveButton.textContent = 'Save';
          saveButton.disabled = false;
          console.error('Failed to save position');
        }
      });
    });
    
    cancelButton.addEventListener('click', closePositionConfig);
    
    // Handle clicks outside the panel
    document.addEventListener('click', handleOutsideClick);
    
    function closePositionConfig() {
      document.removeEventListener('click', handleOutsideClick);
      
      if (positionConfig.parentNode) {
        positionConfig.remove();
      }
    }
    
    function handleOutsideClick(e) {
      if (!positionConfig.contains(e.target) && e.target !== positionConfig) {
        closePositionConfig();
      }
    }
    
    // Handle escape key to close
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', escHandler);
        closePositionConfig();
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
  
  // Add event listeners for bubble interactions
  bubble.addEventListener('click', async () => {
    console.log('Bubble clicked');
    
    // If we're already dictating, stop
    if (isDictating) {
      await stopDictation();
    } else {
      await startDictation();
    }
  });
  
  // Add right-click event listener for context menu
  bubble.addEventListener('contextmenu', (event) => {
    console.log('Bubble right-clicked');
    event.preventDefault();
    
    // If we're dictating, stop first
    if (isDictating) {
      // We can't await here, but that's OK - just stop silently
      stopDictation().catch(console.error);
    }
    
    // Create and show the context menu
    createContextMenu(event.clientX, event.clientY);
  });
  
  // Handle clicking on expanded panel
  expandedPanel.addEventListener('click', toggleDictation);
  
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