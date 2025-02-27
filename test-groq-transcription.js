// test-groq-transcription.js
// Test script to verify the Groq transcription API integration

require('dotenv').config(); // Load environment variables from .env file
const fs = require('fs');
const path = require('path');
const whisperApi = require('./src/whisper-api');

// Path to a sample audio file for testing
// Replace this with the path to your own audio file
const SAMPLE_AUDIO_PATH = path.join(__dirname, 'test-audio.wav');

// Function to test transcription
async function testTranscription() {
  console.log('Testing Groq API transcription...');
  
  // Check if the sample audio file exists
  if (!fs.existsSync(SAMPLE_AUDIO_PATH)) {
    console.error(`Sample audio file not found at: ${SAMPLE_AUDIO_PATH}`);
    console.log('Please create a test-audio.wav file in the project root directory.');
    return;
  }
  
  // Initialize the Groq API
  const apiInitialized = whisperApi.initAPI(null, process.env.GROQ_API_KEY);
  
  if (!apiInitialized) {
    console.error('Failed to initialize Groq API. Check if GROQ_API_KEY is set in your .env file.');
    return;
  }
  
  try {
    // Create a temporary audio file path
    const tmpDir = require('os').tmpdir();
    const tmpAudioFilePath = path.join(tmpDir, `test_whisper_recording_${Date.now()}.wav`);
    
    // Copy the sample audio file to the temporary location
    fs.copyFileSync(SAMPLE_AUDIO_PATH, tmpAudioFilePath);
    console.log(`Copied sample audio to: ${tmpAudioFilePath}`);
    
    // Manually set the audio file path for transcription
    whisperApi._setAudioFilePathForTesting(tmpAudioFilePath);
    
    // Call the transcribeAudio function
    console.log('Calling transcribeAudio...');
    const result = await whisperApi.transcribeAudio();
    
    // Check the result
    if (result.error) {
      console.error('Transcription error:', result.error);
    } else {
      console.log('Transcription successful!');
      console.log('Transcribed text:', result.text);
    }
  } catch (err) {
    console.error('Test failed with error:', err);
  }
}

// Run the test
testTranscription().then(() => {
  console.log('Test completed.');
}); 