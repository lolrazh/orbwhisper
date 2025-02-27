// ffmpeg-utils.js
// Streamlined FFmpeg integration for direct WebM to FLAC conversion

const ffmpeg = require('@ffmpeg/ffmpeg');
const { createFFmpeg } = ffmpeg;

// Create FFmpeg instance with minimal logging for maximum performance
const ffmpegInstance = createFFmpeg({
  log: false,
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
 * Direct optimized conversion from WebM audio to FLAC
 * Streamlined single-step process for maximum efficiency
 * 
 * @param {Buffer} audioBuffer - WebM audio buffer from WebRTC
 * @returns {Promise<Buffer>} - Optimized FLAC buffer for API
 */
async function convertToOptimizedFlac(audioBuffer) {
  try {
    // Ensure FFmpeg is loaded
    await ensureFFmpegLoaded();
    
    // Generate unique input/output names to avoid conflicts
    const timestamp = Date.now();
    const inputName = `in_${timestamp}.webm`;
    const outputName = `out_${timestamp}.flac`;
    
    // Write buffer to virtual filesystem
    ffmpegInstance.FS('writeFile', inputName, new Uint8Array(audioBuffer));
    
    // Single-step direct conversion with optimized parameters
    // This matches exactly what the Groq documentation recommends
    await ffmpegInstance.run(
      '-i', inputName,
      '-ar', '16000',    // 16kHz sample rate
      '-ac', '1',        // Mono audio
      '-map', '0:a',     // Audio stream only
      '-c:a', 'flac',    // FLAC codec
      outputName
    );
    
    // Read processed file
    const data = ffmpegInstance.FS('readFile', outputName);
    
    // Clean up
    ffmpegInstance.FS('unlink', inputName);
    ffmpegInstance.FS('unlink', outputName);
    
    return Buffer.from(data);
  } catch (error) {
    console.error('FFmpeg conversion error:', error);
    // Return original buffer as fallback
    return audioBuffer;
  }
}

// Clean up FFmpeg resources
function cleanup() {
  return Promise.resolve();
}

module.exports = {
  ensureFFmpegLoaded,
  convertToOptimizedFlac,
  cleanup
}; 