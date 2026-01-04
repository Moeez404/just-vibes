# Lofi Audio & Visual Studio - Developer Handover Guide

This document provides a technical overview of the codebase for developers taking over the project.

## 1. Core Functionality
The application is a browser-based tool for transforming standard audio tracks into "Lofi" versions. It allows users to:
- Upload local audio files.
- Apply real-time audio filters (Pitch, EQ, Distortion, Reverb, Echo, Wobble).
- Overlay custom visuals (Images/Videos) and a synced audio visualizer.
- Export the processed audio as a `.wav` file.
- Export a high-definition video of the song with the visualizer as a `.webm` file.

## 2. Architecture & Backend
**Zero Backend Requirements:** This is a 100% client-side application. 
- All audio processing happens in the browser via the **Web Audio API**.
- All video rendering happens via the **Canvas API** and **MediaRecorder API**.
- No data is sent to a server; everything is processed in the user's RAM.

## 3. Audio Processing Engine (`LofiPlayer.tsx`)

The heart of the app is the `setupAudioGraph` function. It builds a serial/parallel chain of `AudioNodes`:

### Chain Structure:
1.  **SourceNode:** The raw audio buffer.
2.  **LFO (OscillatorNode):** A slow sine wave (0.5Hz) connected to the `SourceNode.detune` to simulate "Tape Wobble."
3.  **StereoPannerNode:** Handles spatial positioning.
4.  **WaveShaperNode:** Implements a custom mathematical curve to create saturation/distortion.
5.  **BiquadFilterNodes (EQ):** Three filters (lowshelf, peaking, highshelf) providing a 3-band equalizer.
6.  **BiquadFilterNode (Master Filter):** A Lowpass or Highpass filter to create the "muffled" lofi sound.
7.  **Dry/Wet Mix Logic:**
    *   **ConvolverNode:** Handles convolution-based reverb using a generated impulse response.
    *   **DelayNode:** Handles feedback-loop echo.
8.  **NoiseSource:** A dedicated buffer playing generated "Brown Noise" (simulating vinyl crackle or tape hiss) mixed in at the end.
9.  **AnalyserNode:** Captures frequency data for the UI visualizer.

### Rendering Strategy:
- **Real-time:** Uses `AudioContext` for low-latency playback.
- **Audio Export:** Uses `OfflineAudioContext`. This allows the browser to render the entire song faster than real-time to a buffer, which is then converted to a WAV blob.

## 4. Visuals & Video Export

### Visualizer Overlay:
The visualizer is rendered on a `<canvas>` at 30-60FPS. It uses `analyser.getByteFrequencyData` to fetch frequency magnitudes.
- **Styles:** Circle, Bars, and Waveform.
- **Pulse Effect:** The background image/video scales slightly based on the average bass frequency (indices 0-8 of the frequency data).

### Video Export Logic:
When a user clicks "Video Export":
1.  A hidden 1920x1080 canvas is created.
2.  An `AudioContext` destination stream is captured using `ctx.createMediaStreamDestination()`.
3.  A `MediaRecorder` instance consumes both the Canvas stream and the Audio stream.
4.  The app "replays" the song internally at normal speed to the recorder.
5.  On completion, the chunks are compiled into a `video/webm` Blob.

## 5. UI & State Management
- **React:** Used for the UI layer and settings state.
- **Lucide-React:** For iconography.
- **Tailwind CSS:** For styling.
- **Presets:** Stored as static configurations in `LofiPlayer.tsx`. Applying a preset simply batch-updates the `settings` state, which triggers `useEffect` hooks to update the active `AudioNode` parameters.

## 6. Key Files
- `App.tsx`: Layout and global state for selected files/visuals.
- `LofiPlayer.tsx`: All audio/video logic. This is the most complex file.
- `VisualsStudio.tsx`: Purely UI for selecting background assets.
- `types.ts`: Shared interfaces for lofi settings and asset definitions.

## 7. Developer Tips
- **Memory Management:** When exporting video, the `MediaRecorder` stores chunks in RAM. Extremely long songs (10min+) might crash mobile browsers.
- **Cross-Origin Images:** To use external URLs for the visualizer background, the server must provide `CORS` headers, and the code must set `img.crossOrigin = "anonymous"`.
- **Audio Decoding:** `audioContext.decodeAudioData` is a heavy operation. It is performed once per file upload.
