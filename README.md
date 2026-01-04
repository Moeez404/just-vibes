# Just Vibes 🎧

**Just Vibes** is a browser-based audio workstation that lets you instantly transform any song into a Lofi, Slowed & Reverb, or Nightcore masterpiece. It combines a powerful client-side audio engine with an aesthetic visualizer studio to create shareable video content directly in your browser.

![Just Vibes App Screenshot](https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1920&auto=format&fit=crop)

## ✨ Features

### 🎛️ Audio Processing Engine
- **Real-time Filters:** Highpass/Lowpass filters to create that "muffled" underwater or radio sound.
- **Tape Simulation:** Adds procedural "Wobble" (detuning) and "Hiss" (brown noise) to mimic vintage cassette tapes.
- **Space & Time:** Convolution Reverb and Delay effects for atmospheric depth.
- **Dynamic EQ:** 3-band equalizer to boost bass or cut harsh highs.
- **Tempo Control:** Slow down (Chopped & Screwed) or speed up (Nightcore) your tracks without artifacts.

### 🎨 Visual Studio
- **Dynamic Backgrounds:** Choose from curated high-res aesthetic presets (Rainy, Neon City, Vintage) or **upload your own image/video**.
- **Audio Visualizer:** Three distinct styles (Circle, Bars, Wave) that react to frequency data in real-time.
- **Customization:** Change visualizer colors and positioning to match your vibe.

### 💾 Export Studio
- **High-Res Video Export:** Render your remix as a **1080p video** (12 Mbps bitrate) ready for YouTube or TikTok.
- **WAV Audio Export:** Download the processed audio file in lossless format.
- **Client-Side Processing:** All rendering happens in your browser. No files are ever uploaded to a server, ensuring 100% privacy.

## 🚀 Tech Stack

- **Frontend:** [React](https://react.dev/) (TypeScript)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Audio:** **Web Audio API** (AudioContext, OfflineAudioContext for rendering)
- **Video:** **Canvas API** & **MediaRecorder API** (for real-time frame capture)
- **Icons:** [Lucide React](https://lucide.dev/)

## 🛠️ Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/just-vibes.git
   cd just-vibes
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server**
   ```bash
   npm start
   # or
   yarn start
   ```

4. Open `http://localhost:3000` to view the app.

## 🎚️ How It Works (Technical)

**Audio Graph:**
When you upload a file, the app decodes it into an `AudioBuffer`. We construct an audio graph connecting several nodes:
`Source -> Panner -> Distortion -> EQ -> Filter -> Reverb/Delay -> Analyzer -> Destination`.
Tape wobble is achieved by connecting a low-frequency `OscillatorNode` to the source's `detune` parameter.

**Video Export:**
To export video without a backend:
1. We create a hidden `<canvas>` set to 1920x1080.
2. We connect the audio output to a `MediaStreamDestination`.
3. We capture the canvas stream and merge it with the audio stream into a `MediaRecorder`.
4. We "play" the song internally (while rendering frames to the canvas) and capture the resulting blobs.

## ❤️ Credits

Made with love by **Moeez Ahmed**.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
