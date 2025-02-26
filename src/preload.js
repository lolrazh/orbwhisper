// preload.js
// This file is loaded before the renderer process
// and provides a secure bridge between Node.js and the renderer

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // App control functions
    closeApp: () => ipcRenderer.send('close-app'),
    hideApp: () => ipcRenderer.send('hide-app'),
    
    // Audio recording and transcription functions
    startRecording: () => ipcRenderer.invoke('start-recording'),
    stopRecordingAndTranscribe: () => ipcRenderer.invoke('stop-recording-and-transcribe'),
    
    // WebRTC audio functions
    sendAudioChunk: (chunk) => ipcRenderer.invoke('send-audio-chunk', chunk),
    finalizeAudioRecording: () => ipcRenderer.invoke('finalize-audio-recording'),
    
    // Keyboard simulation
    typeText: (text) => ipcRenderer.invoke('type-text', text),
    
    // Hotkey configuration
    setHotkey: (hotkeyString) => ipcRenderer.invoke('set-hotkey', hotkeyString),
    getCurrentHotkey: () => ipcRenderer.invoke('get-current-hotkey'),
    
    // Position configuration
    setPosition: (positionCode) => ipcRenderer.invoke('set-position', positionCode),
    getCurrentPosition: () => ipcRenderer.invoke('get-current-position'),
    
    // Receive toggle-dictation event from main process
    onToggleDictation: (callback) => {
      ipcRenderer.on('toggle-dictation', () => callback());
    }
  }
); 