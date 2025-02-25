// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const bubble = document.getElementById('bubble');
  const expandedPanel = document.getElementById('expanded-panel');
  const statusText = document.getElementById('status-text');
  
  // Track dictation state
  let isDictating = false;
  
  // Function to toggle dictation mode
  function toggleDictation() {
    isDictating = !isDictating;
    
    if (isDictating) {
      // Expand the UI
      bubble.classList.add('active');
      expandedPanel.classList.remove('hidden');
      statusText.textContent = 'Listening...';
      
      // Tell the main process to resize the window
      window.api.expandWindow({ width: 270, height: 70 });
      
      // Start the frequency animation (already handled by CSS)
      // In the future, this is where we'd start recording audio
    } else {
      // Collapse the UI
      bubble.classList.remove('active');
      expandedPanel.classList.add('hidden');
      statusText.textContent = 'Ready to dictate';
      
      // Tell the main process to resize the window back to bubble size
      window.api.collapseWindow();
      
      // Stop the frequency animation (handled by CSS)
      // In the future, this is where we'd stop recording audio
    }
  }
  
  // Toggle dictation when the bubble is clicked
  bubble.addEventListener('click', toggleDictation);
  
  // Toggle dictation when the expanded panel is clicked
  expandedPanel.addEventListener('click', toggleDictation);
  
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