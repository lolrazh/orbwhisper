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
        baseURL: 'https://api.groq.com/openai/v1',
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
      
      // Create a temporary file path for the final audio
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

// Finalize recording by saving audio data to file
async function finalizeRecording() {
  if (!isRecording || audioChunks.length === 0) return false;
  
  try {
    console.log(`Finalizing recording with ${audioChunks.length} chunks...`);
    
    // Combine all chunks into a single buffer
    const audioBuffer = Buffer.concat(audioChunks);
    
    // Write to the temporary file
    fs.writeFileSync(audioFilePath, audioBuffer);
    console.log(`Audio data saved to ${audioFilePath} (${audioBuffer.length} bytes)`);
    
    // Verify the file was written correctly
    if (!fs.existsSync(audioFilePath)) {
      console.error('Audio file was not created properly');
      return false;
    }
    
    // Add a small delay to ensure file system operations complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Reset the chunks array to free memory
    audioChunks = [];
    
    return true;
  } catch (err) {
    console.error('Error finalizing audio recording:', err);
    return false;
  }
}

// Stop recording
function stopRecording() {
  if (!isRecording) return false;
  
  console.log('Stopping audio recording');
  isRecording = false;
  
  return true;
}

// Transcribe audio using Groq API
async function transcribeAudio() {
  // If in fallback mode, return dummy transcription
  if (useFallbackMode) {
    return transcribeFallbackAudio();
  }
  
  if (!audioFilePath || !fs.existsSync(audioFilePath)) {
    return { error: "No audio recording found" };
  }
  
  try {
    console.log(`Transcribing audio file: ${audioFilePath} using Groq API`);
    
    // Create a readable stream for the audio file
    const audioFile = fs.createReadStream(audioFilePath);
    
    // Call Groq API (using OpenAI-compatible interface)
    const transcription = await openaiGroq.audio.transcriptions.create({
      file: audioFile,
      model: "distil-whisper-large-v3-en", // Distil model for English only
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
    
    // Wait longer for any final chunks to be processed
    if (!useFallbackMode) {
      console.log('Waiting for final audio chunks to be processed...');
      await new Promise(resolve => setTimeout(resolve, 750));
    }
    
    // Transcribe the audio
    const result = await transcribeAudio();
    return result;
  } else {
    return { error: "Not recording" };
  }
}

module.exports = {
  initAPI,
  initOpenAI, // Keep for backward compatibility
  startRecording,
  stopRecording,
  addAudioChunk,
  finalizeRecording,
  transcribeAudio,
  getDictationText
}; 