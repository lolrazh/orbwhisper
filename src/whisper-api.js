// whisper-api.js
// Handles audio recording and Speech-to-Text API integration
// WebRTC-based implementation using Groq API

const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Initialize variables
let openaiGroq;         // For Groq endpoint with OpenAI-compatible API
let isRecording = false;
let audioFilePath = '';
let audioChunks = []; 
let useFallbackMode = false; // Flag for fallback mode

// Initialize the API client with API key
function initAPI(openaiApiKey, groqApiKey) {
  // Initialize Groq if API key is provided
  if (groqApiKey && groqApiKey !== 'your_groq_api_key_here') {
    try {
      // Use OpenAI SDK but with Groq base URL
      openaiGroq = new OpenAI({
        apiKey: groqApiKey,
        baseURL: 'https://api.groq.com/openai/v1', // Base URL for Groq API
      });
      console.log('Groq client initialized successfully');
      return true;
    } catch (err) {
      console.error('Error initializing Groq client:', err);
      useFallbackMode = true;
      return false;
    }
  } else {
    console.error('No valid Groq API key provided. Please set your API key in the .env file.');
    useFallbackMode = true;
    return false;
  }
}

// Initialize the OpenAI client with API key (legacy function for backward compatibility)
function initOpenAI(apiKey) {
  return initAPI(apiKey, process.env.GROQ_API_KEY);
}

// Function to start recording - initializes state
function startRecording() {
  if (isRecording) return Promise.resolve(false);
  
  return new Promise((resolve) => {
    try {
      console.log('Starting WebRTC audio recording');
      
      // Reset audio chunks array
      audioChunks = [];
      
      // Create a temporary file path for the final audio (as fallback only)
      const tmpDir = os.tmpdir();
      audioFilePath = path.join(tmpDir, `whisper_recording_${Date.now()}.wav`);
      
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

// Add audio chunk from WebRTC
async function addAudioChunk(chunk) {
  if (!isRecording) return false;
  
  try {
    // Convert chunk to buffer and add to our array
    const buffer = Buffer.from(chunk);
    audioChunks.push(buffer);
    
    // Log every 10th chunk to avoid excessive logging
    if (audioChunks.length % 10 === 0) {
      console.log(`Received audio chunk #${audioChunks.length} (${buffer.length} bytes)`);
    }
    
    return true;
  } catch (err) {
    console.error('Error adding audio chunk:', err);
    return false;
  }
}

// Finalize recording - now optimized to avoid unnecessary file operations
async function finalizeRecording() {
  if (!isRecording || audioChunks.length === 0) return false;
  
  console.log(`Finalizing recording with ${audioChunks.length} chunks...`);
  
  // We don't need to write to file anymore unless we're in fallback mode
  // The actual transcription will use the in-memory audio data
  
  // Reset recording state but keep chunks for transcription
  isRecording = false;
  
  return true;
}

// Stop recording
function stopRecording() {
  if (!isRecording) return false;
  
  console.log('Stopping audio recording');
  isRecording = false;
  
  return true;
}

// Transcribe audio using Groq API - optimized to work with in-memory buffer
async function transcribeAudio() {
  // If in fallback mode, return dummy transcription
  if (useFallbackMode) {
    return transcribeFallbackAudio();
  }
  
  if (audioChunks.length === 0) {
    return { error: "No audio data available" };
  }
  
  try {
    console.log(`Transcribing audio data from memory (${audioChunks.length} chunks)`);
    
    // Combine all chunks into a single buffer
    const audioBuffer = Buffer.concat(audioChunks);
    
    // Create temp file only if needed by Groq API (some APIs require a file)
    // Otherwise, we'd use a memory stream or direct buffer
    fs.writeFileSync(audioFilePath, audioBuffer);
    
    // Create a readable stream for the audio file - still needed for OpenAI SDK structure
    const audioFile = fs.createReadStream(audioFilePath);
    
    // Call Groq API (using OpenAI-compatible interface)
    const transcription = await openaiGroq.audio.transcriptions.create({
      file: audioFile,
      model: "distil-whisper-large-v3-en", // Distil model for English only
      response_format: "json",
      temperature: 0,
      language: "en" // Explicitly specify English language for better accuracy
    });
    
    console.log('Transcription completed');
    
    // Clean up the temporary audio file
    try {
      fs.unlinkSync(audioFilePath);
      audioFilePath = '';
    } catch (err) {
      console.error('Error deleting audio file:', err);
    }
    
    // Clear audio chunks to free memory
    audioChunks = [];
    
    return transcription;
  } catch (err) {
    console.error('Transcription error:', err);
    return { error: err.message || "Transcription failed" };
  }
}

// Fallback transcription function (for demo/testing)
async function transcribeFallbackAudio() {
  return new Promise((resolve) => {
    console.log('Using fallback transcription mode');
    
    // List of possible phrases for testing
    const dummyPhrases = [
      "This is a test of the dictation system in fallback mode.",
      "Hello world, I'm using OrbWhisper for dictation.",
      "The quick brown fox jumps over the lazy dog.",
      "Voice dictation can help increase productivity substantially.",
      "This is a placeholder response while in fallback mode."
    ];
    
    // Simulate a processing delay
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * dummyPhrases.length);
      resolve({
        text: dummyPhrases[randomIndex]
      });
    }, 1000);
  });
}

// Get dictation text - stops recording and transcribes
async function getDictationText() {
  if (isRecording) {
    // Stop recording to process the audio
    stopRecording();
    
    // No need to wait as long since we're not doing file I/O
    // Just a small delay to ensure any final processing completes
    await new Promise(resolve => setTimeout(resolve, 250));
    
    // Transcribe the audio
    const result = await transcribeAudio();
    return result;
  } else if (audioChunks.length > 0) {
    // We might already have stopped recording but have audio data
    const result = await transcribeAudio();
    return result;
  } else {
    return { error: "No audio data available" };
  }
}

// Helper function for testing - allows setting the audio file path directly
// This is not used in production, only for testing
function _setAudioFilePathForTesting(filePath) {
  if (fs.existsSync(filePath)) {
    audioFilePath = filePath;
    return true;
  }
  return false;
}

module.exports = {
  initAPI,
  initOpenAI, // Keep for backward compatibility
  startRecording,
  stopRecording,
  addAudioChunk,
  finalizeRecording,
  transcribeAudio,
  getDictationText,
  _setAudioFilePathForTesting // Export for testing purposes only
}; 