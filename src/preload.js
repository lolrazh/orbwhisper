// preload.js
// This file is loaded before the renderer process
// and provides a secure bridge between Node.js and the renderer

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    toggleDictation: () => ipcRenderer.send('toggle-dictation'),
    expandWindow: (dimensions) => ipcRenderer.send('expand-window', dimensions),
    collapseWindow: () => ipcRenderer.send('collapse-window'),
    
    // Receive toggle-dictation event from main process
    onToggleDictation: (callback) => {
      ipcRenderer.on('toggle-dictation', () => callback());
    }
  }
); 