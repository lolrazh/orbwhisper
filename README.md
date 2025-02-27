# OrbWhisper

A lightweight AI-powered desktop dictation tool that uses Groq's speech-to-text API.

## Features

- Global hotkey activation for quick dictation
- Floating bubble UI for audio recording status
- Fast transcription using Groq's distil-whisper-large-v3-en model
- Text pasting directly into your active application

## Setup

1. Clone this repository
2. Install dependencies with `npm install`
3. Create a `.env` file based on `.env.example`
4. Add your Groq API key to the `.env` file (sign up at https://console.groq.com/)
5. Start the application with `npm start`

## API Integration

OrbWhisper uses Groq's API for speech-to-text transcription, specifically the `distil-whisper-large-v3-en` model. This provides fast and accurate transcriptions optimized for English language.

### Testing the API Integration

You can test the Groq API integration by:

1. Adding a sample audio file named `test-audio.wav` to the project root
2. Running `node test-groq-transcription.js`

## Configuration

You can customize OrbWhisper by:

- Modifying the global hotkey in the settings menu (default: Ctrl+Shift+H)
- Adjusting the bubble UI position
- Setting up audio sensitivity

## Technical Details

OrbWhisper is built with:

- Electron for cross-platform desktop support
- WebRTC for audio capture
- Groq API for transcription
- Custom WebView UI for minimal footprint

## License

ISC License 