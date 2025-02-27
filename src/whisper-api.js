// whisper-api.js
// Handles audio recording and Speech-to-Text API integration
// WebRTC-based implementation using Groq API

const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ffmpegUtils = require('./ffmpeg-utils');
const FormData = require('form-data');

// Initialize variables
let openaiGroq;         // For Groq endpoint with OpenAI-compatible API
let isRecording = false;
let audioFilePath = '';
let audioChunks = []; 
let useFallbackMode = false; // Flag for fallback mode
let ffmpegPreloaded = false; // Track if FFmpeg is preloaded
let recordingStartTime = 0;  // Track when recording started
const MIN_RECORDING_MS = 1000; // Minimum recording duration (1 second)
const MIN_CHUNKS = 10;         // Minimum number of audio chunks

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
      
      // Preload FFmpeg in the background
      if (!ffmpegPreloaded) {
        console.log('Preloading FFmpeg from whisper-api module...');
        ffmpegUtils.ensureFFmpegLoaded()
          .then(() => {
            ffmpegPreloaded = true;
            console.log('FFmpeg preloaded successfully from whisper-api module');
          })
          .catch(err => {
            console.error('Failed to preload FFmpeg from whisper-api module:', err);
          });
      }
      
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
      audioFilePath = path.join(tmpDir, `whisper_recording_${Date.now()}.flac`); // Changed to .flac
      
      // Mark as recording and record start time
      isRecording = true;
      recordingStartTime = Date.now();
      
      resolve(true);
    } catch (err) {
      console.error('Error in startRecording:', err);
      useFallbackMode = true;
      isRecording = true; // Still mark as recording for the fallback mode
      recordingStartTime = Date.now();
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
  
  // Check if we've recorded for the minimum duration
  const recordingDuration = Date.now() - recordingStartTime;
  console.log(`Finalizing recording with ${audioChunks.length} chunks (duration: ${recordingDuration}ms)...`);
  
  // Ensure we have enough audio data
  if (recordingDuration < MIN_RECORDING_MS || audioChunks.length < MIN_CHUNKS) {
    console.warn(`Recording too short (${recordingDuration}ms, ${audioChunks.length} chunks). Adding artificial delay.`);
    // Add a small delay to ensure we capture enough audio
    await new Promise(resolve => setTimeout(resolve, MIN_RECORDING_MS - recordingDuration));
  }
  
  // Reset recording state but keep chunks for transcription
  isRecording = false;
  recordingStartTime = 0;
  
  return true;
}

// Stop recording
function stopRecording() {
  if (!isRecording) return false;
  
  console.log('Stopping audio recording');
  isRecording = false;
  
  return true;
}

// Function to handle fallback mode (for testing only)
function transcribeFallbackAudio() {
  console.log('Using fallback transcription mode');
  return { text: "This is a fallback transcription for testing. The real API is not available." };
}

// Transcribe audio using Groq API - optimized to work with FLAC format
async function transcribeAudio() {
  // If in fallback mode, return dummy transcription
  if (useFallbackMode) {
    return transcribeFallbackAudio();
  }
  
  if (audioChunks.length === 0) {
    return { error: "No audio data available" };
  }
  
  // Check if we have enough audio data to transcribe
  if (audioChunks.length < 5) {
    console.warn(`Very few audio chunks (${audioChunks.length}). Transcription may be incomplete.`);
  }
  
  const startTime = Date.now();
  let tempFilePath = null;
  
  try {
    console.log(`Transcribing audio from ${audioChunks.length} chunks...`);
    
    // Combine all chunks into a single buffer
    const audioBuffer = Buffer.concat(audioChunks);
    
    // Make sure FFmpeg is loaded
    if (!ffmpegPreloaded) {
      await ffmpegUtils.ensureFFmpegLoaded();
      ffmpegPreloaded = true;
    }
    
    // Single-step conversion to optimized FLAC
    const conversionStartTime = Date.now();
    const flacBuffer = await ffmpegUtils.convertToOptimizedFlac(audioBuffer);
    const conversionTime = Date.now() - conversionStartTime;
    
    // We need to write to temp file due to API limitations
    tempFilePath = path.join(os.tmpdir(), `groq_audio_${Date.now()}.flac`);
    fs.writeFileSync(tempFilePath, flacBuffer);
    
    // Send to Groq API
    const apiStartTime = Date.now();
    const transcription = await openaiGroq.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "distil-whisper-large-v3-en", 
      response_format: "json",
      temperature: 0,
      language: "en"
    });
    const apiTime = Date.now() - apiStartTime;
    
    const totalTime = Date.now() - startTime;
    console.log(`Processing times - Total: ${totalTime}ms, Conversion: ${conversionTime}ms, API: ${apiTime}ms`);
    
    // Clean up memory
    audioChunks = [];
    
    return transcription;
  } catch (err) {
    console.error(`Transcription error:`, err);
    
    // Try direct submission if conversion failed
    if (audioChunks.length > 0) {
      try {
        // Direct WebM submission as fallback
        const audioBuffer = Buffer.concat(audioChunks);
        tempFilePath = path.join(os.tmpdir(), `fallback_${Date.now()}.webm`);
        fs.writeFileSync(tempFilePath, audioBuffer);
        
        const transcription = await openaiGroq.audio.transcriptions.create({
          file: fs.createReadStream(tempFilePath),
          model: "distil-whisper-large-v3-en",
          response_format: "json",
          temperature: 0,
          language: "en"
        });
        
        return transcription;
      } catch {
        return { error: "Transcription failed" };
      }
    }
    
    return { error: "Transcription failed" };
  } finally {
    // Clean up temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch {}
    }
  }
}

// Function to retrieve dictation text - main function called by IPC
async function getDictationText() {
  try {
    // Finalize recording process
    await finalizeRecording();
    
    // Use Groq API to transcribe
    const result = await transcribeAudio();
    
    // Handle errors
    if (result.error) {
      return { error: result.error, text: null };
    }
    
    // Return the transcribed text
    console.log('Dictation text result:', result);
    return { 
      text: result.text, 
      error: null 
    };
  } catch (err) {
    console.error('Error retrieving dictation text:', err);
    return {
      text: null,
      error: err.message || "Failed to retrieve dictation text"
    };
  }
}

module.exports = {
  initAPI,
  initOpenAI,
  startRecording,
  addAudioChunk,
  finalizeRecording,
  stopRecording,
  transcribeAudio,
  getDictationText
}; 