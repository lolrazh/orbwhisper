// preload.js
// This file is loaded before the renderer process
// and provides a secure bridge between Node.js and the renderer

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Window control functions
    toggleDictation: () => ipcRenderer.send('toggle-dictation'),
    moveWindow: (moveX, moveY) => ipcRenderer.send('move-window', { moveX, moveY }),
    setWindowPosition: (x, y) => ipcRenderer.send('set-window-position', { x, y }),
    getWindowPosition: () => ipcRenderer.invoke('get-window-position'),
    closeApp: () => ipcRenderer.send('close-app'),
    
    // Audio recording and transcription functions - WebRTC version
    startRecording: () => ipcRenderer.invoke('start-recording'),
    stopRecordingAndTranscribe: () => ipcRenderer.invoke('stop-recording-and-transcribe'),
    
    // New WebRTC audio functions
    sendAudioChunk: (chunk) => ipcRenderer.invoke('send-audio-chunk', chunk),
    finalizeAudioRecording: () => ipcRenderer.invoke('finalize-audio-recording'),
    
    // Keyboard simulation
    typeText: (text) => ipcRenderer.invoke('type-text', text),
    
    // Receive toggle-dictation event from main process
    onToggleDictation: (callback) => {
      ipcRenderer.on('toggle-dictation', () => callback());
    }
  }
); 