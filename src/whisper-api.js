// whisper-api.js
// Handles audio recording and OpenAI Whisper API integration
// SIMPLIFIED VERSION FOR PHASE 2

const { OpenAI } = require('openai');

// Initialize OpenAI with API key
let openai;
let isRecording = false;
let recordingTimeout = null;

// Function to initialize the OpenAI client
function initOpenAI(apiKey) {
  openai = new OpenAI({
    apiKey: apiKey
  });
  return openai !== undefined;
}

// Simplified function for "recording" audio - just a placeholder
function startRecording() {
  if (isRecording) return false;
  
  console.log('Started simulated recording');
  isRecording = true;
  
  // For demo purposes, we'll auto-stop after 5 seconds
  recordingTimeout = setTimeout(() => {
    if (isRecording) {
      console.log('Auto-stopping recording after timeout');
      stopRecording();
    }
  }, 5000);
  
  return Promise.resolve(true);
}

// Function to stop recording
function stopRecording() {
  if (!isRecording) return false;
  
  console.log('Stopped simulated recording');
  isRecording = false;
  
  if (recordingTimeout) {
    clearTimeout(recordingTimeout);
    recordingTimeout = null;
  }
  
  return true;
}

// Function that returns dummy transcription data
function transcribeAudio() {
  return new Promise((resolve) => {
    // List of possible phrases for the demo
    const dummyPhrases = [
      "This is a test of the dictation system.",
      "Hello world, I'm using SandyWhisper for dictation.",
      "The quick brown fox jumps over the lazy dog.",
      "I'm testing this application to see how well it works.",
      "In the future, this will use the actual Whisper API for transcription.",
      "Voice dictation can help increase productivity substantially.",
      "I think this app will be great once it's fully implemented.",
      "OpenAI's Whisper model provides accurate transcription in many languages."
    ];
    
    // Return a random phrase
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * dummyPhrases.length);
      resolve({
        text: dummyPhrases[randomIndex]
      });
    }, 1000); // Simulate processing delay
  });
}

// Function that will be called from renderer to get transcription
async function getDictationText() {
  if (!isRecording) {
    return { error: "Not recording" };
  }
  
  // Stop recording to process the audio
  stopRecording();
  
  // For now, just use the placeholder transcription
  const result = await transcribeAudio();
  
  return result;
}

module.exports = {
  initOpenAI,
  startRecording,
  stopRecording,
  transcribeAudio,
  getDictationText
}; 