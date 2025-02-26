// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const appContainer = document.getElementById('app-container');
  const bubble = document.getElementById('bubble');
  const expandedPanel = document.getElementById('expanded-panel');
  const statusText = document.getElementById('status-text');
  const debugPanel = document.getElementById('debug-panel');
  const transcribedTextElement = document.getElementById('transcribed-text');
  
  // Check if we're in development mode
  const isDev = window.location.href.includes('dev');
  
  // Show debug panel in dev mode
  if (isDev) {
    debugPanel.classList.remove('hidden');
  }
  
  // Track dictation state
  let isDictating = false;
  let isPasting = false;
  
  // WebRTC Audio Recording variables
  let mediaRecorder = null;
  let mediaStream = null;
  
  // Create context menu
  function createContextMenu(x, y) {
    // Remove any existing context menus
    removeContextMenu();
    
    // Create context menu element
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    
    // Add menu items - updated per request
    const menuItems = [
      { label: 'Hide App', action: dummyAction, isDummy: true },
      { label: 'Hotkey', action: dummyAction, isDummy: true },
      { type: 'separator' },
      { label: 'Close App', action: closeApp }
    ];
    
    menuItems.forEach(item => {
      if (item.type === 'separator') {
        const separator = document.createElement('div');
        separator.className = 'context-menu-separator';
        contextMenu.appendChild(separator);
      } else {
        const menuItem = document.createElement('div');
        menuItem.className = 'context-menu-item';
        
        // Add a class for dummy buttons
        if (item.isDummy) {
          menuItem.className += ' dummy-button';
        }
        
        menuItem.textContent = item.label;
        menuItem.addEventListener('click', () => {
          item.action();
          removeContextMenu();
        });
        contextMenu.appendChild(menuItem);
      }
    });
    
    // Add to body
    document.body.appendChild(contextMenu);
    
    // No position calculations needed - CSS handles positioning centered above orb
    
    // Handle clicking outside the menu to close it
    document.addEventListener('click', removeContextMenu, { once: true });
  }
  
  // Remove context menu
  function removeContextMenu() {
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }
  }
  
  // Dummy action for non-functional buttons
  function dummyAction() {
    // Do nothing - this is a placeholder for future functionality
    console.log('This button is not yet implemented');
  }
  
  // Context menu actions
  function showAbout() {
    // Display a temporary message in the status text
    statusText.textContent = 'SandyWhisper v1.0 - Powered by OpenAI Whisper';
    setTimeout(() => {
      if (!isDictating) {
        statusText.textContent = 'Ready to dictate';
      }
    }, 3000);
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
  
  // Initialize WebRTC recording on startup
  setupAudioRecording().catch(error => {
    console.error('Error setting up audio recording:', error);
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
      statusText.textContent = 'Processing...';
      
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
              })
              .catch(err => {
                console.error('Typing error:', err);
                statusText.textContent = 'Typing failed';
                bubble.classList.remove('pasting');
                isPasting = false;
              });
            
            // Reset status after a short delay
            setTimeout(() => {
              if (!isDictating && !isPasting) {
                statusText.textContent = 'Ready to dictate';
              }
            }, 3000);
          } else if (result.error) {
            statusText.textContent = `Error: ${result.error}`;
            bubble.classList.remove('pasting');
            isPasting = false;
            
            setTimeout(() => {
              if (!isDictating && !isPasting) {
                statusText.textContent = 'Ready to dictate';
              }
            }, 3000);
          }
        })
        .catch(err => {
          console.error('Transcription error:', err);
          statusText.textContent = 'Transcription failed';
          bubble.classList.remove('pasting');
          isPasting = false;
          
          setTimeout(() => {
            if (!isDictating && !isPasting) {
              statusText.textContent = 'Ready to dictate';
            }
          }, 3000);
        });
      
      // Collapse the UI
      appContainer.classList.add('collapsed');
    }
  }
  
  // Click events for UI elements
  
  // Handle bubble clicks
  bubble.addEventListener('click', () => {
    toggleDictation();
  });
  
  // Handle clicking on expanded panel
  expandedPanel.addEventListener('click', () => {
    toggleDictation();
  });
  
  // Context menu (right-click) handler
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    createContextMenu(e.clientX, e.clientY);
  });
  
  // Listen for toggle event from main process (global hotkey)
  window.api.onToggleDictation(() => {
    toggleDictation();
  });
  
  // Handle keyboard shortcut (space) for testing in the UI
  document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      toggleDictation();
    }
  });
}); 