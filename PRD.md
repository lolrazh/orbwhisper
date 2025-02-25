# SandyWhisper PRD & Roadmap

---

## 1. Project Brief

**Project Name:** SandyWhisper

**Objective:**  
Build a **lightweight**, always-on desktop dictation tool using AI-powered speech recognition (via the OpenAI Whisper API) to transcribe speech in real time and simulate typing at the current text cursor. The app will feature a **cute, unobtrusive** floating bubble UI that expands on activation (via a global hotkey) and shows live frequency animations during dictation.

**Target Audience:**  
- Professionals who need fast, accurate dictation in any text field.  
- Early adopters and tech-savvy users, especially those excited by new productivity tools (aiming for a Product Hunt launch).

**Key Features:**  
- **Floating Bubble UI:** Minimal, frameless, rounded bubble (always-on-top) positioned on the screen.  
- **Global Hotkey Activation:** Use a system-wide hotkey (e.g., Win+H) to toggle dictation mode.  
- **Voice Transcription:** Integrate with Whisper for near real-time, accurate speech-to-text conversion.  
- **Simulated Typing:** Automatically types transcribed text into whichever text field is active.  
- **Visual Feedback:** Display frequency bars or wave animations during dictation to signal “active listening.”  
- **Responsive, Modern Design:** A sleek, animated interface that remains unobtrusive.

**Launch Goal:**  
Deliver a polished MVP with core functionality and stability that can be showcased on Product Hunt. Prioritize a seamless user experience, even if that means re-engineering our approach (i.e., switching to Electron).

---

## 2. Technical Stack

**Frontend/UI:**  
- **Electron:** Use Electron to create a frameless, always-on-top desktop window with full control over window behavior.  
- **HTML, CSS, JavaScript:** Develop the bubble UI and animations with standard web technologies.  
  - Optionally integrate a lightweight CSS framework (e.g., ShadCN UI) for quicker styling.

**Backend (Node.js):**  
- **Node.js:** Handle backend logic within Electron.  
  - **OpenAI Whisper API:** Integrate for real-time speech-to-text processing.
  - **Global Hotkey Registration:** Use Electron’s built-in globalShortcut module.
  - **Simulated Typing:** Leverage Node.js libraries like `robotjs` for simulating keystrokes in any active window.

**Interprocess Communication:**  
- Use Electron’s IPC modules to communicate between the main process (handling backend operations) and the renderer process (managing UI interactions).

**Deployment:**  
- **Electron Builder/Packager:** Bundle the app into a standalone Windows executable, ensuring lightweight performance and proper always-on-top behavior.

---

## 3. Roadmap & Step-by-Step Development

### **Phase 1: UI & Basic Application Framework**

1. **Project Setup:**
   - Establish the following directory structure:
     ```
     sandywhisper/
       ├── main.js         # Electron main process file
       ├── package.json
       └── src/
           ├── index.html  # Main UI page
           ├── style.css   # UI styles
           └── renderer.js # UI behavior
     ```
   - Initialize your project with npm and install Electron, robotjs (for simulated typing), and any other needed libraries.
   - **Test:** Verify that your environment is set up and all dependencies install correctly.

2. **Minimal Electron Application:**
   - Create `main.js` to launch a frameless, always-on-top window that loads `index.html`.
   - **Test:** Run `npm start` (or the equivalent command) to ensure the window appears as expected.

3. **Basic Bubble UI Design:**
   - In `index.html` and `style.css`, design a rounded bubble (roughly 50x50px) positioned at the bottom-right corner.
   - **Test:** Confirm the UI’s positioning, shape, and styling are as planned.

4. **UI Interactivity:**
   - In `renderer.js`, implement a toggle (triggered by a keypress, e.g., “Space”) that:
     - Expands the bubble into a small dictation panel.
     - Displays a placeholder for frequency animations (e.g., a simple gradient bar or wave).
   - **Test:** Ensure the UI transitions smoothly when toggled.

### **Phase 2: Backend Functionality**

5. **Simulated Dictation (Placeholder):**
   - In your backend code (either within the main process or via IPC from the renderer), create a function `startListening()` that returns a hardcoded string after a delay.
   - **Test:** Trigger this function from the renderer and display the dummy text in the UI.

6. **Simulated Typing Function:**
   - Implement a function `typeText(text)` using a Node.js library (e.g., `robotjs`) to simulate typing into the active window.
   - **Test:** Trigger `typeText("Hello World")` from the UI and verify it types in an external text editor.

7. **Global Hotkey Registration:**
   - Utilize Electron’s `globalShortcut` module in `main.js` to register a system-wide hotkey (e.g., Win+H).
   - **Test:** Confirm the hotkey works regardless of which application is in focus, toggling the dictation mode appropriately.

### **Phase 3: Integration & Refinement**

8. **Whisper API Integration:**
   - Replace the dummy dictation function with real audio capture and integration with the OpenAI Whisper API.
   - Handle network latency and error conditions gracefully.
   - **Test:** Speak a known phrase; verify the transcribed text is correctly displayed and then simulated as keystrokes.

9. **UI Enhancements & Animations:**
   - Refine the frequency bar or wave animation, ensuring it’s visually appealing and CPU-friendly.
   - Polish the bubble expansion/collapse transitions.
   - **Test:** Validate that the UI is responsive and visually smooth without hogging system resources.

10. **Packaging & Deployment:**
    - Use Electron Builder or Electron Packager to bundle the application into a standalone executable for Windows.
    - **Test:** Run the packaged app on a fresh Windows environment (without development tools) to ensure all features work as expected.

---

## 4. Milestones & Testing Checklist

1. **M1: Basic Electron App & Bubble UI**  
   - **Test:** Frameless, always-on-top window loads; bubble UI is visible and correctly positioned.

2. **M2: Interactive Bubble**  
   - **Test:** Hotkey (Space or similar) toggles the bubble into the expanded dictation panel with placeholder animations.

3. **M3: Simulated Dictation (Placeholder)**  
   - **Test:** Dummy transcription fetches and displays correctly when dictation is triggered.

4. **M4: Simulated Typing**  
   - **Test:** The `typeText` function successfully simulates typing in an external application.

5. **M5: Global Hotkey Registration**  
   - **Test:** The designated global hotkey triggers the dictation mode regardless of focus.

6. **M6: Whisper API Integration**  
   - **Test:** Actual voice input is transcribed and the text is simulated as keystrokes, with acceptable latency and accuracy.

7. **M7: Final UI/UX Polish & Packaging**  
   - **Test:** UI is polished and smooth, and the packaged app runs robustly on Windows.

---

## 5. Additional Notes & Considerations

- **Performance & Resource Usage:**  
  - Real-time speech recognition is resource-intensive. Monitor performance and optimize as needed.

- **Network Reliability & Error Handling:**  
  - Gracefully handle API timeouts or network issues, informing the user if transcription fails.

- **Hotkey Conflicts:**  
  - Provide options for users to remap the default global hotkey if conflicts arise with other system shortcuts.

- **Security & Privacy:**  
  - Clearly communicate that audio is captured and sent to OpenAI’s servers for transcription. Implement appropriate privacy safeguards and disclaimers.

- **Multi-Microphone Environments:**  
  - Allow users to select their preferred microphone if multiple devices are connected.

- **Future Iterations:**  
  - Consider advanced features such as refined punctuation handling, language auto-detection, or specialized domain dictionaries for improved transcription.

**Communication & Issue Tracking:**  
- Use version control (Git) and an issue board to track tasks, progress, and blockers.  
- Focus on delivering a stable MVP for the Product Hunt launch before adding extra features.