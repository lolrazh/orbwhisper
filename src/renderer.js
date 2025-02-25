// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const appContainer = document.getElementById('app-container');
  const bubble = document.getElementById('bubble');
  const dragHandle = document.getElementById('drag-handle');
  const expandedPanel = document.getElementById('expanded-panel');
  const statusText = document.getElementById('status-text');
  const closeButton = document.getElementById('close-button');
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
  
  // Function to toggle dictation mode
  function toggleDictation() {
    isDictating = !isDictating;
    
    if (isDictating) {
      // Expand the UI
      appContainer.classList.remove('collapsed');
      bubble.classList.add('active');
      statusText.textContent = 'Listening...';
      
      // Start recording audio
      window.api.startRecording()
        .then(success => {
          if (!success) {
            statusText.textContent = 'Failed to start recording';
            toggleDictation(); // Toggle back to inactive state
          }
        })
        .catch(err => {
          console.error('Recording error:', err);
          statusText.textContent = 'Microphone error';
          toggleDictation(); // Toggle back to inactive state
        });
    } else {
      // Stop recording and get transcription
      window.api.stopRecordingAndTranscribe()
        .then(result => {
          if (result.text) {
            // Show the transcribed text briefly
            statusText.textContent = `Typing: "${result.text.substring(0, 20)}${result.text.length > 20 ? '...' : ''}"`;
            
            // For debugging, show the transcribed text
            if (isDev && transcribedTextElement) {
              const timestamp = new Date().toLocaleTimeString();
              transcribedTextElement.textContent = `[${timestamp}] ${result.text}\n${transcribedTextElement.textContent}`;
            }
            
            // Simulate typing the text
            window.api.typeText(result.text);
            
            // Reset status after a short delay
            setTimeout(() => {
              if (!isDictating) {
                statusText.textContent = 'Ready to dictate';
              }
            }, 3000);
          } else if (result.error) {
            statusText.textContent = `Error: ${result.error}`;
          }
        })
        .catch(err => {
          console.error('Transcription error:', err);
          statusText.textContent = 'Transcription failed';
        });
      
      // Collapse the UI
      appContainer.classList.add('collapsed');
      bubble.classList.remove('active');
    }
  }
  
  // ===== CLEAN DRAG FUNCTIONALITY =====
  
  // Variables to track drag state
  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  
  // Track the drag distance to differentiate between clicks and drags
  let dragDistance = 0;
  
  // Mouse down on drag handle - start potential drag
  dragHandle.addEventListener('mousedown', (e) => {
    // Only handle left mouse button
    if (e.button !== 0) return;
    
    isDragging = true;
    dragDistance = 0;
    dragHandle.classList.add('dragging');
    bubble.classList.add('dragging');
    
    // Store the initial mouse position
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    
    // Prevent default behavior and text selection
    e.preventDefault();
  });
  
  // Mouse move - handle dragging
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    // Calculate movement
    const deltaX = e.clientX - lastMouseX;
    const deltaY = e.clientY - lastMouseY;
    
    // Update drag distance
    dragDistance += Math.abs(deltaX) + Math.abs(deltaY);
    
    // Move the window if we have actual movement
    if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
      window.api.moveWindow(deltaX, deltaY);
      
      // Update the reference position
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    }
  });
  
  // Mouse up - end dragging or trigger click
  document.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    
    dragHandle.classList.remove('dragging');
    bubble.classList.remove('dragging');
    
    // If minimal drag occurred, treat as a click
    if (dragDistance < 5) {
      toggleDictation();
    }
    
    // Reset drag state
    isDragging = false;
  });
  
  // Mouse leave - end dragging if mouse leaves window
  document.addEventListener('mouseleave', () => {
    if (isDragging) {
      dragHandle.classList.remove('dragging');
      bubble.classList.remove('dragging');
      isDragging = false;
    }
  });
  
  // Click events for specific UI elements
  
  // Handle bubble clicks (when not dragging)
  bubble.addEventListener('click', (e) => {
    // Only handle if we're not at the end of a drag operation
    // The dragHandle will handle cases where the click follows a mousedown+mouseup without movement
    if (e.target !== dragHandle && !isDragging) {
      toggleDictation();
    }
  });
  
  // Handle clicking on expanded panel
  expandedPanel.addEventListener('click', () => {
    toggleDictation();
  });
  
  // Close button handler
  closeButton.addEventListener('click', (e) => {
    e.stopPropagation();
    window.api.closeApp();
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