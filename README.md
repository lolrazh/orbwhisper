# OrbWhisper

A lightweight desktop dictation tool with a floating bubble UI, powered by OpenAI's Whisper API.

## Features

- Floating bubble UI that's always on top
- Expand/collapse animation
- Real-time audio recording and transcription using WebRTC
- Visual frequency bars during dictation
- Global hotkey to activate dictation from any application

## Prerequisites

Before running SandyWhisper, ensure you have the following installed:

1. **Node.js and npm** - Download from [nodejs.org](https://nodejs.org/)
2. **OpenAI API Key** - Get one from [platform.openai.com](https://platform.openai.com/api-keys)

## Setup

1. Clone this repository
2. Run `npm install` to install dependencies
3. Create a `.env` file in the root directory with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_actual_api_key_here
   ```

## Usage

1. **Development mode**: `npm run dev`
2. **Production mode**: `npm start`
3. **Build the app**:
   - Windows: `npm run build:win`
   - macOS: `npm run build:mac`
   - Linux: `npm run build:linux`

## Global Hotkeys

- `Ctrl+Shift+H` (or `Cmd+Shift+H` on macOS): Toggle dictation
- `Ctrl+Shift+Escape` (or `Cmd+Shift+Escape` on macOS): Hide the app
- `Space` (when app is focused): Toggle dictation (for testing)

## How It Works

1. Click the bubble or use the global hotkey to start dictation
2. Speak clearly into your microphone
3. Click again or use the global hotkey to stop dictation and transcribe
4. The transcribed text is automatically pasted at your cursor position

## Troubleshooting

### Audio Recording Issues
- Make sure you've allowed microphone access in your system settings
- Check if your microphone is working in other applications
- Try running the app with administrator privileges

### Transcription Issues
- Verify your OpenAI API key is correct
- Ensure you have sufficient credits in your OpenAI account
- Check your internet connection

## Technologies Used

- Electron
- OpenAI Whisper API
- WebRTC for audio capture
- Cross-platform clipboard-based text insertion

## License

ISC 