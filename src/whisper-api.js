// whisper-api.js
// Handles audio recording and OpenAI Whisper API integration
// WebRTC version - no FFmpeg dependency

const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Initialize OpenAI with API key
let openai;
let isRecording = false;
let audioFilePath = '';
let recordingTimeout = null;
let audioChunks = []; // For storing WebRTC audio chunks
let audioContext = null;
let maxRecordingLength = 30000; // Maximum recording length in ms (30 seconds)
let useFallbackMode = false; // Flag for fallback mode

// Function to initialize the OpenAI client
function initOpenAI(apiKey) {
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    console.error('Invalid OpenAI API key. Please set your API key in the .env file.');
    return false;
  }
  
  openai = new OpenAI({
    apiKey: apiKey
  });
  
  console.log('OpenAI client initialized successfully');
  return openai !== undefined;
}

// Function to start recording - just initialize state, actual recording happens in renderer
function startRecording() {
  if (isRecording) return Promise.resolve(false);
  
  return new Promise((resolve) => {
    try {
      console.log('Starting audio recording with WebRTC');
      
      // Reset audio chunks array
      audioChunks = [];
      
      // Create a temporary file path for the final audio
      const tmpDir = os.tmpdir();
      audioFilePath = path.join(tmpDir, `whisper_recording_${Date.now()}.webm`);
      
      // Set a timeout to stop recording after the maximum duration
      recordingTimeout = setTimeout(() => {
        if (isRecording) {
          console.log('Auto-stopping recording after timeout');
          stopRecording();
        }
      }, maxRecordingLength);
      
      // Mark as recording and resolve
      isRecording = true;
      resolve(true);
    } catch (err) {
      console.error('Error in startRecording:', err);
      useFallbackMode = true;
      isRecording = true; // Still mark as recording for the fallback mode
      resolve(true);
    }
  });
}

// Add audio chunk from WebRTC recording
async function addAudioChunk(chunk) {
  if (!isRecording) return false;
  
  try {
    // Add the chunk to our array
    audioChunks.push(Buffer.from(chunk));
    return true;
  } catch (err) {
    console.error('Error adding audio chunk:', err);
    return false;
  }
}

// Finalize recording by concatenating chunks to a file
async function finalizeRecording() {
  if (!isRecording || audioChunks.length === 0) return false;
  
  try {
    // Combine all chunks into a single buffer
    const audioBuffer = Buffer.concat(audioChunks);
    
    // Write to the temporary file
    fs.writeFileSync(audioFilePath, audioBuffer);
    console.log(`Audio data saved to ${audioFilePath}`);
    
    return true;
  } catch (err) {
    console.error('Error finalizing audio recording:', err);
    return false;
  }
}

// Function to stop recording
function stopRecording() {
  if (!isRecording) return false;
  
  console.log('Stopping audio recording');
  isRecording = false;
  
  if (recordingTimeout) {
    clearTimeout(recordingTimeout);
    recordingTimeout = null;
  }
  
  return true;
}

// Function to transcribe audio using OpenAI Whisper API
async function transcribeAudio() {
  // If in fallback mode, return dummy transcription
  if (useFallbackMode) {
    return transcribeFallbackAudio();
  }
  
  if (!audioFilePath || !fs.existsSync(audioFilePath)) {
    return { error: "No audio recording found" };
  }
  
  try {
    console.log(`Transcribing audio file: ${audioFilePath}`);
    
    // Create a readable stream for the audio file
    const audioFile = fs.createReadStream(audioFilePath);
    
    // Call OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
      response_format: "json",
      temperature: 0
    });
    
    console.log('Transcription completed');
    
    // Clean up the temporary audio file
    try {
      fs.unlinkSync(audioFilePath);
      audioFilePath = '';
    } catch (err) {
      console.error('Error deleting audio file:', err);
    }
    
    return transcription;
  } catch (err) {
    console.error('Transcription error:', err);
    return { error: err.message || "Transcription failed" };
  }
}

// Fallback transcription function that returns dummy text
async function transcribeFallbackAudio() {
  return new Promise((resolve) => {
    console.log('Generating simulated transcription (fallback mode)');
    
    // List of possible phrases for testing
    const dummyPhrases = [
      "This is a test of the dictation system in fallback mode.",
      "Hello world, I'm using SandyWhisper for dictation.",
      "The quick brown fox jumps over the lazy dog.",
      "In WebRTC mode, we capture audio directly from the browser.",
      "Voice dictation can help increase productivity substantially.",
      "This is a placeholder response while in fallback mode.",
      "OpenAI's Whisper model provides accurate transcription in many languages."
    ];
    
    // Simulate a processing delay
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * dummyPhrases.length);
      resolve({
        text: dummyPhrases[randomIndex]
      });
    }, 1500);
  });
}

// Function that will be called from renderer to get transcription
async function getDictationText() {
  if (isRecording) {
    // Stop recording to process the audio
    stopRecording();
    
    // Wait a bit for any final chunks to be processed
    if (!useFallbackMode) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Transcribe the audio
    const result = await transcribeAudio();
    return result;
  } else {
    return { error: "Not recording" };
  }
}

module.exports = {
  initOpenAI,
  startRecording,
  stopRecording,
  addAudioChunk,
  finalizeRecording,
  transcribeAudio,
  getDictationText
}; 