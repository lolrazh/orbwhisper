// ffmpeg-utils.js
// Module for FFmpeg integration and audio format conversion

const ffmpeg = require('@ffmpeg/ffmpeg');
const { createFFmpeg, fetchFile } = ffmpeg;
const fs = require('fs');
const path = require('path');
const os = require('os');

// Create FFmpeg instance with logging enabled for debugging
const ffmpegInstance = createFFmpeg({
  log: true,
  logger: ({ message }) => console.log(`FFmpeg: ${message}`),
  corePath: require.resolve('@ffmpeg/core')
});

// Track loading state
let ffmpegLoaded = false;

/**
 * Ensures FFmpeg is loaded before any operations
 * @returns {Promise<void>}
 */
async function ensureFFmpegLoaded() {
  if (!ffmpegLoaded) {
    try {
      console.log('Loading FFmpeg...');
      await ffmpegInstance.load();
      ffmpegLoaded = true;
      console.log('FFmpeg loaded successfully');
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      throw error;
    }
  }
}

/**
 * Converts audio buffer to FLAC format for optimal transcription
 * 
 * @param {Buffer} audioBuffer - Raw audio buffer
 * @returns {Promise<{buffer: Buffer, path: string}>} FLAC audio buffer and temp file path
 */
async function convertToOptimizedFlac(audioBuffer) {
  try {
    // Make sure FFmpeg is loaded
    await ensureFFmpegLoaded();
    
    // Generate unique input and output file names to avoid conflicts
    const timestamp = Date.now();
    const inputName = `input_${timestamp}.wav`;
    const outputName = `output_${timestamp}.flac`;
    
    // Write the buffer to FFmpeg's virtual filesystem
    ffmpegInstance.FS('writeFile', inputName, new Uint8Array(audioBuffer));
    
    // Convert to 16kHz mono FLAC for optimal processing
    await ffmpegInstance.run(
      '-i', inputName,                 // Input file
      '-ar', '16000',                  // 16kHz sample rate (optimal for speech)
      '-ac', '1',                      // Mono audio
      '-c:a', 'flac',                  // FLAC codec
      '-compression_level', '8',       // Maximum compression
      outputName                       // Output file
    );
    
    // Read the processed file
    const data = ffmpegInstance.FS('readFile', outputName);
    
    // Create a temp file path for compatibility with existing code
    const tempDir = os.tmpdir();
    const outputPath = path.join(tempDir, `whisper_recording_${timestamp}.flac`);
    
    // Write the FLAC file to disk (only needed if the API requires a file path)
    fs.writeFileSync(outputPath, Buffer.from(data));
    
    // Clean up files in virtual filesystem
    ffmpegInstance.FS('unlink', inputName);
    ffmpegInstance.FS('unlink', outputName);
    
    console.log(`Audio converted to optimized FLAC format (${data.length} bytes)`);
    
    return {
      buffer: Buffer.from(data),
      path: outputPath
    };
  } catch (error) {
    console.error('Error converting audio to FLAC:', error);
    throw error;
  }
}

/**
 * Gets information about an audio buffer
 * 
 * @param {Buffer} audioBuffer - Audio buffer to analyze
 * @returns {Promise<Object>} Audio information
 */
async function getAudioInfo(audioBuffer) {
  try {
    // Make sure FFmpeg is loaded
    await ensureFFmpegLoaded();
    
    const inputName = `info_${Date.now()}.wav`;
    ffmpegInstance.FS('writeFile', inputName, new Uint8Array(audioBuffer));
    
    // Run FFprobe functionality through FFmpeg to get info
    await ffmpegInstance.run(
      '-i', inputName,
      '-hide_banner',
      '-f', 'null',
      '-'
    );
    
    // Clean up
    ffmpegInstance.FS('unlink', inputName);
    
    // Basic info extraction (simplified for now)
    return {
      format: 'Audio format information not available in this version',
      duration: 'Duration information not available in this version'
    };
  } catch (error) {
    console.error('Error getting audio info:', error);
    return { error: error.message };
  }
}

// Clean up FFmpeg resources
function cleanup() {
  // Nothing specific to clean up with this version of FFmpeg
  console.log('FFmpeg resources cleaned up');
  return Promise.resolve();
}

module.exports = {
  ensureFFmpegLoaded,
  convertToOptimizedFlac,
  getAudioInfo,
  cleanup
}; 