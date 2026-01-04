import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Download, CloudRain, Coffee, Zap, Speaker, Radio, Waves, Video, Loader2, Palette, Activity, Music4, ArrowRight, Disc, Droplets } from 'lucide-react';
import { LofiSettings } from '../types';

interface VisualAsset {
  url: string;
  type: 'image' | 'video';
}

interface LofiPlayerProps {
  file: File | null;
  visualSource: VisualAsset | null;
  isExportMode?: boolean;
  onGoToExport?: () => void;
}

const createNoiseBuffer = (ctx: AudioContext | OfflineAudioContext): AudioBuffer => {
  const bufferSize = ctx.sampleRate * 2; 
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    data[i] = (white + (data[i - 1] || 0)) / 1.5; 
  }
  return buffer;
};

const createReverbImpulse = (ctx: AudioContext | OfflineAudioContext): AudioBuffer => {
  const duration = 2.0; const decay = 2.0; const length = ctx.sampleRate * duration;
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  const left = impulse.getChannelData(0); const right = impulse.getChannelData(1);
  for (let i = 0; i < length; i++) {
    const multiplier = Math.pow(1 - i / length, decay);
    left[i] = (Math.random() * 2 - 1) * multiplier;
    right[i] = (Math.random() * 2 - 1) * multiplier;
  }
  return impulse;
};

const createDistortionCurve = (amount: number): Float32Array => {
  const k = amount * 100; const n_samples = 44100; const curve = new Float32Array(n_samples); const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = i * 2 / n_samples - 1;
    curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
  }
  return curve;
};

const DEFAULT_SETTINGS: LofiSettings = {
    playbackRate: 1.0, filterFrequency: 20000, filterType: 'lowpass',
    noiseGain: 0, wobbleDepth: 0, reverbMix: 0, echoMix: 0,
    distortionAmount: 0, pan: 0, eqLow: 0, eqMid: 0, eqHigh: 0,
};

const PRESETS = [
  { id: 'clean', name: 'Clean', icon: <Disc className="w-4 h-4 text-[#a4b0be]" />, settings: { ...DEFAULT_SETTINGS } },
  { id: 'rainy', name: 'Rainy', icon: <CloudRain className="w-4 h-4 text-[#778beb]" />, settings: { ...DEFAULT_SETTINGS, playbackRate: 0.8, filterFrequency: 600, noiseGain: 0.12, wobbleDepth: 5, reverbMix: 0.4, distortionAmount: 0.05 } },
  { id: 'cafe', name: 'Cafe', icon: <Coffee className="w-4 h-4 text-[#cf9376]" />, settings: { ...DEFAULT_SETTINGS, playbackRate: 0.92, filterFrequency: 2500, noiseGain: 0.03, wobbleDepth: 10, reverbMix: 0.25, distortionAmount: 0.1, eqLow: 2, eqMid: 1 } },
  { id: 'nightcore', name: 'Nightcore', icon: <Zap className="w-4 h-4 text-[#f7d794]" />, settings: { ...DEFAULT_SETTINGS, playbackRate: 1.3, eqHigh: 4, eqLow: -2 } },
  { id: 'bass', name: 'Bass', icon: <Speaker className="w-4 h-4 text-[#e66767]" />, settings: { ...DEFAULT_SETTINGS, eqLow: 15, eqMid: -2, eqHigh: 1, distortionAmount: 0.08 } },
  { id: 'radio', name: 'Radio', icon: <Radio className="w-4 h-4 text-[#786fa6]" />, settings: { ...DEFAULT_SETTINGS, filterType: 'highpass' as const, filterFrequency: 750, distortionAmount: 0.25, noiseGain: 0.08, eqHigh: -4, eqLow: -12 } },
  { id: 'deep', name: 'Deep', icon: <Droplets className="w-4 h-4 text-[#48dbfb]" />, settings: { ...DEFAULT_SETTINGS, playbackRate: 0.9, filterFrequency: 400, reverbMix: 0.5, eqLow: 4 } },
  { id: 'cloud', name: 'Dreamy', icon: <Waves className="w-4 h-4 text-[#63cdda]" />, settings: { ...DEFAULT_SETTINGS, playbackRate: 0.9, reverbMix: 0.6, echoMix: 0.4, eqHigh: 3, pan: 0.2 } }
];

export const LofiPlayer: React.FC<LofiPlayerProps> = ({ file, visualSource, isExportMode, onGoToExport }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportingVideo, setExportingVideo] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [activePresetId, setActivePresetId] = useState<string | null>('clean');
  
  const [visSettings, setVisSettings] = useState({
      style: 'circle' as 'circle' | 'bars' | 'wave',
      position: 'center' as 'center' | 'bottom' | 'top',
      color: '#f3a683',
      enable: true
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const nodesRef = useRef<any>({});
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const pauseTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [settings, setSettings] = useState<LofiSettings>({ ...DEFAULT_SETTINGS });

  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass();
    return () => { audioContextRef.current?.close(); };
  }, []);

  useEffect(() => {
    if (!file || !audioContextRef.current) return;
    const loadAudio = async () => {
      setIsProcessing(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        audioBufferRef.current = await audioContextRef.current!.decodeAudioData(arrayBuffer);
        setIsPlaying(false); stopAudio();
      } catch (err) { console.error(err); } finally { setIsProcessing(false); }
    };
    loadAudio();
  }, [file]);

  useEffect(() => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const t = ctx.currentTime;
    const nodes = nodesRef.current;
    if (sourceNodeRef.current) sourceNodeRef.current.playbackRate.setValueAtTime(settings.playbackRate, t);
    if (nodes.eqLow) nodes.eqLow.gain.setTargetAtTime(settings.eqLow, t, 0.1);
    if (nodes.eqMid) nodes.eqMid.gain.setTargetAtTime(settings.eqMid, t, 0.1);
    if (nodes.eqHigh) nodes.eqHigh.gain.setTargetAtTime(settings.eqHigh, t, 0.1);
    if (nodes.panner && 'pan' in nodes.panner) nodes.panner.pan.setTargetAtTime(settings.pan, t, 0.1);
    if (nodes.filter) {
        nodes.filter.type = settings.filterType;
        nodes.filter.frequency.setTargetAtTime(settings.filterFrequency, t, 0.1);
    }
    if (nodes.noiseGain) nodes.noiseGain.gain.setTargetAtTime(settings.noiseGain, t, 0.1);
    if (nodes.lfoGain) nodes.lfoGain.gain.setTargetAtTime(settings.wobbleDepth * 10, t, 0.1);
    if (nodes.reverbGain) nodes.reverbGain.gain.setTargetAtTime(settings.reverbMix, t, 0.1);
    if (nodes.echoGain) nodes.echoGain.gain.setTargetAtTime(settings.echoMix, t, 0.1);
    if (nodes.distortion) nodes.distortion.curve = createDistortionCurve(settings.distortionAmount);
  }, [settings]);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setSettings(preset.settings); setActivePresetId(preset.id);
  };

  const handleManualChange = (key: keyof LofiSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value })); setActivePresetId(null); 
  };

  const setupAudioGraph = (ctx: AudioContext | OfflineAudioContext, buffer: AudioBuffer, currentSettings: LofiSettings, forPlayback: boolean) => {
    const source = ctx.createBufferSource(); source.buffer = buffer; source.playbackRate.value = currentSettings.playbackRate; source.loop = forPlayback;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.5; lfo.type = 'sine';
    const lfoGain = ctx.createGain(); lfoGain.gain.value = currentSettings.wobbleDepth * 10;
    lfo.connect(lfoGain); lfoGain.connect(source.detune);

    let panner = (ctx as any).createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    if ('pan' in panner) (panner as any).pan.value = currentSettings.pan;
    const distortion = ctx.createWaveShaper(); distortion.curve = createDistortionCurve(currentSettings.distortionAmount); distortion.oversample = '4x';
    const eqLow = ctx.createBiquadFilter(); eqLow.type = 'lowshelf'; eqLow.frequency.value = 200; eqLow.gain.value = currentSettings.eqLow;
    const eqMid = ctx.createBiquadFilter(); eqMid.type = 'peaking'; eqMid.frequency.value = 1000; eqMid.Q.value = 1; eqMid.gain.value = currentSettings.eqMid;
    const eqHigh = ctx.createBiquadFilter(); eqHigh.type = 'highshelf'; eqHigh.frequency.value = 3000; eqHigh.gain.value = currentSettings.eqHigh;
    const filter = ctx.createBiquadFilter(); filter.type = currentSettings.filterType; filter.frequency.value = currentSettings.filterFrequency;

    source.connect(panner); panner.connect(distortion); distortion.connect(eqLow); eqLow.connect(eqMid); eqMid.connect(eqHigh); eqHigh.connect(filter);
    const masterGain = ctx.createGain(); masterGain.gain.value = 1.0;
    let analyser: any = null;
    if (forPlayback || ctx instanceof AudioContext) {
        analyser = ctx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.8;
        masterGain.connect(analyser); analyser.connect(ctx.destination);
    } else { masterGain.connect(ctx.destination); }

    const dryGain = ctx.createGain(); dryGain.gain.value = 1.0; filter.connect(dryGain); dryGain.connect(masterGain);
    const reverb = ctx.createConvolver(); reverb.buffer = createReverbImpulse(ctx);
    const reverbGain = ctx.createGain(); reverbGain.gain.value = currentSettings.reverbMix;
    filter.connect(reverb); reverb.connect(reverbGain); reverbGain.connect(masterGain);
    const delay = ctx.createDelay(); delay.delayTime.value = 0.4;
    const delayFeedback = ctx.createGain(); delayFeedback.gain.value = 0.4;
    const echoGain = ctx.createGain(); echoGain.gain.value = currentSettings.echoMix;
    filter.connect(delay); delay.connect(delayFeedback); delayFeedback.connect(delay); delay.connect(echoGain); echoGain.connect(masterGain);
    const noiseSource = ctx.createBufferSource(); noiseSource.buffer = createNoiseBuffer(ctx); noiseSource.loop = true;
    const noiseGain = ctx.createGain(); noiseGain.gain.value = currentSettings.noiseGain;
    noiseSource.connect(noiseGain); noiseGain.connect(masterGain);

    return { source, lfo, lfoGain, noiseSource, noiseGain, panner, distortion, eqLow, eqMid, eqHigh, filter, reverbGain, echoGain, dryGain, masterGain, analyser };
  };

  const playAudio = () => {
    if (!audioContextRef.current || !audioBufferRef.current) return;
    const ctx = audioContextRef.current; if (ctx.state === 'suspended') ctx.resume();
    const nodes = setupAudioGraph(ctx, audioBufferRef.current, settings, true);
    sourceNodeRef.current = nodes.source; nodesRef.current = nodes;
    const offset = pauseTimeRef.current % audioBufferRef.current.duration;
    nodes.source.start(0, offset); nodes.lfo.start(0); nodes.noiseSource.start(0);
    startTimeRef.current = ctx.currentTime - (offset / settings.playbackRate);
    setIsPlaying(true);
  };

  const stopAudio = () => {
    try { if (sourceNodeRef.current) sourceNodeRef.current.stop(); if (nodesRef.current.noiseGain) nodesRef.current.noiseGain.disconnect(); } catch (e) {}
    if (audioContextRef.current && isPlaying) pauseTimeRef.current = (audioContextRef.current.currentTime - startTimeRef.current) * settings.playbackRate;
    setIsPlaying(false);
  };

  const togglePlay = () => isPlaying ? stopAudio() : playAudio();

  const getExportFilename = () => {
    const baseName = file ? file.name.replace(/\.[^/.]+$/, "") : "track";
    return `${baseName} - JUST VIBES`;
  };

  const downloadProcessed = async () => {
    if (!audioBufferRef.current) return;
    const defaultName = getExportFilename();
    const fileName = window.prompt("Track Name:", defaultName) || defaultName;
    
    setIsProcessing(true);
    try {
        const renderDuration = audioBufferRef.current.duration / settings.playbackRate;
        const offlineCtx = new OfflineAudioContext(2, renderDuration * 44100, 44100);
        const nodes = setupAudioGraph(offlineCtx, audioBufferRef.current, settings, false);
        nodes.source.start(0); nodes.lfo.start(0); nodes.noiseSource.start(0);
        const renderedBuffer = await offlineCtx.startRendering();
        const wavBlob = bufferToWave(renderedBuffer, renderedBuffer.length);
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a'); a.href = url; a.download = `${fileName}.wav`; a.click();
        URL.revokeObjectURL(url);
    } catch (e) { alert("Processing failed."); } finally { setIsProcessing(false); }
  };

  const exportVideo = async () => {
    if (!audioBufferRef.current) return;
    
    // Stop any current playback
    if (isPlaying) stopAudio(); 
    
    const defaultName = getExportFilename();
    const fileName = window.prompt("Video Name:", defaultName) || defaultName;

    // Show UI progress screen immediately
    setExportingVideo(true); 
    setExportProgress(0);

    // Give React time to render the canvas ref
    await new Promise(r => setTimeout(r, 300));

    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (ctx.state === 'suspended') await ctx.resume();

        const dest = ctx.createMediaStreamDestination();
        const nodes = setupAudioGraph(ctx, audioBufferRef.current, settings, false);
        
        // Connect the master audio to the recorder
        nodes.masterGain.disconnect();
        nodes.masterGain.connect(nodes.analyser);
        nodes.analyser.connect(dest);

        const canvas = document.createElement('canvas'); 
        canvas.width = 1920; 
        canvas.height = 1080;
        const canvasCtx = canvas.getContext('2d')!;
        
        // Necessary for some browsers to capture stream
        canvas.style.position = 'fixed';
        canvas.style.top = '-9999px';
        document.body.appendChild(canvas);

        let drawVisual = () => {}, cleanupVisual = () => {};
        
        if (visualSource) {
            if (visualSource.type === 'video') {
                 const vid = document.createElement('video'); 
                 vid.src = visualSource.url; 
                 vid.muted = true; 
                 vid.loop = true; 
                 vid.crossOrigin = "anonymous";
                 await new Promise((resolve, reject) => {
                    vid.oncanplay = resolve;
                    vid.onerror = () => reject(new Error("Video asset failed to load."));
                    // Timeout after 10s
                    setTimeout(() => reject(new Error("Video loading timed out.")), 10000);
                    vid.load();
                 });
                 await vid.play();
                 drawVisual = () => canvasCtx.drawImage(vid, -canvas.width/2, -canvas.height/2, canvas.width, canvas.height);
                 cleanupVisual = () => { vid.pause(); vid.remove(); };
            } else {
                 const img = new Image(); 
                 img.crossOrigin = "anonymous"; 
                 img.src = visualSource.url; 
                 await new Promise((r, j) => { 
                   img.onload = r; 
                   img.onerror = () => j(new Error("Image asset failed to load.")); 
                   setTimeout(() => j(new Error("Image loading timed out.")), 10000);
                 });
                 drawVisual = () => canvasCtx.drawImage(img, -canvas.width/2, -canvas.height/2, canvas.width, canvas.height);
            }
        }

        const stream = canvas.captureStream(30); 
        const audioTrack = dest.stream.getAudioTracks()[0];
        if (audioTrack) stream.addTrack(audioTrack);

        const getMimeType = () => {
            const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
            for (const t of types) if (MediaRecorder.isTypeSupported(t)) return t;
            return '';
        };

        const supportedType = getMimeType();
        const chunks: Blob[] = []; 
        // Force higher bitrate (12 Mbps) for 1080p
        const recorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType, videoBitsPerSecond: 12000000 } : { videoBitsPerSecond: 12000000 });
        
        recorder.ondataavailable = e => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' }); 
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); 
            a.href = url; 
            a.download = `${fileName}.${recorder.mimeType.includes('mp4') ? 'mp4' : 'webm'}`; 
            a.click();
            URL.revokeObjectURL(url); 
            cleanupVisual(); 
            ctx.close(); 
            if (document.body.contains(canvas)) document.body.removeChild(canvas);
            setExportingVideo(false);
            setExportProgress(0);
        };

        let animationId: number; 
        const dataArray = new Uint8Array(nodes.analyser.frequencyBinCount);
        const startTime = ctx.currentTime;
        const duration = audioBufferRef.current.duration / settings.playbackRate;
        
        const renderLoop = () => {
             nodes.analyser.getByteFrequencyData(dataArray); 
             let bassSum = 0; for(let i=0; i<8; i++) bassSum += dataArray[i];
             const bassAvg = bassSum / 8; 
             const pulseScale = 1 + (Math.pow(bassAvg / 255, 2) * 0.05);

             // Draw Main Export Canvas
             canvasCtx.fillStyle = '#0f0a13'; 
             canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

             if (visualSource) {
                 canvasCtx.save(); 
                 canvasCtx.translate(canvas.width/2, canvas.height/2); 
                 canvasCtx.scale(pulseScale, pulseScale);
                 drawVisual(); 
                 canvasCtx.restore(); 
                 if (visSettings.enable) { 
                     canvasCtx.fillStyle = 'rgba(0,0,0,0.3)'; 
                     canvasCtx.fillRect(0, 0, canvas.width, canvas.height); 
                 }
             }

             if (visSettings.enable) {
                 canvasCtx.lineWidth = 10; 
                 canvasCtx.strokeStyle = visSettings.color; 
                 canvasCtx.lineCap = 'round';
                 const centerX = canvas.width/2; 
                 let centerY = canvas.height/2;
                 if (visSettings.position === 'bottom') centerY = canvas.height - 150;
                 if (visSettings.position === 'top') centerY = 150;

                 if (visSettings.style === 'circle') {
                     const radius = 300 + (bassAvg / 255) * 60;
                     canvasCtx.beginPath();
                     for (let i = 0; i < 64; i++) {
                         const angle = i * (Math.PI*2)/64; 
                         const val = dataArray[Math.floor(i * dataArray.length/128)];
                         const barLen = (val/255) * 240 * pulseScale;
                         canvasCtx.moveTo(centerX + Math.cos(angle)*radius, centerY + Math.sin(angle)*radius);
                         canvasCtx.lineTo(centerX + Math.cos(angle)*(radius+barLen), centerY + Math.sin(angle)*(radius+barLen));
                     }
                     canvasCtx.stroke();
                 } else if (visSettings.style === 'bars') {
                     const totalW = canvas.width * 0.85; 
                     const barW = (totalW / 100) - 8;
                     for (let i = 0; i < 100; i++) {
                         const h = (dataArray[Math.floor(i * dataArray.length/150)] / 255) * 500 * pulseScale;
                         const x = (canvas.width - totalW)/2 + i * (barW + 8);
                         canvasCtx.fillStyle = visSettings.color;
                         if (visSettings.position === 'center') canvasCtx.fillRect(x, centerY - h/2, barW, h);
                         else if (visSettings.position === 'top') canvasCtx.fillRect(x, centerY, barW, h);
                         else canvasCtx.fillRect(x, centerY - h, barW, h);
                     }
                 }
             }

             // Mirrror to UI Preview Canvas
             if (previewCanvasRef.current) {
                 const pCtx = previewCanvasRef.current.getContext('2d');
                 if (pCtx) {
                     pCtx.drawImage(canvas, 0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
                 }
             }

             const elapsed = ctx.currentTime - startTime;
             const progress = (elapsed / duration) * 100;
             setExportProgress(Math.min(progress, 99.9));
             
             if (elapsed >= duration) {
                if (recorder.state === 'recording') recorder.stop();
                cancelAnimationFrame(animationId);
                setExportProgress(100);
                return;
             }
             animationId = requestAnimationFrame(renderLoop);
        };

        // Fire everything up
        recorder.start(); 
        nodes.source.start(0); 
        nodes.lfo.start(0); 
        nodes.noiseSource.start(0);
        renderLoop(); 
        
        nodes.source.onended = () => { 
            if (recorder.state === 'recording') {
                recorder.stop(); 
                cancelAnimationFrame(animationId); 
            }
        };

    } catch (e) { 
        console.error("Export Failed:", e);
        setExportingVideo(false); 
        alert("Conversion Failed: " + (e as any).message || "Browser error occurred."); 
    }
  };

  const bufferToWave = (abuffer: AudioBuffer, len: number) => {
    let numOfChan = abuffer.numberOfChannels, length = len * numOfChan * 2 + 44, buffer = new ArrayBuffer(length), view = new DataView(buffer), channels = [], i, sample, offset = 0, pos = 0;
    const set32 = (d: number) => { view.setUint32(pos, d, true); pos += 4; }; const set16 = (d: number) => { view.setUint16(pos, d, true); pos += 2; };
    set32(0x46464952); set32(length - 8); set32(0x45564157); set32(0x20746d66); set32(16); set16(1); set16(numOfChan); set32(abuffer.sampleRate); set32(abuffer.sampleRate * 2 * numOfChan); set16(numOfChan * 2); set16(16); set32(0x61746164); set32(length - pos - 4);
    for(i = 0; i < numOfChan; i++) channels.push(abuffer.getChannelData(i));
    while(pos < length) { for(i = 0; i < numOfChan; i++) { sample = Math.max(-1, Math.min(1, channels[i][offset])); sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; view.setInt16(pos, sample, true); pos += 2; } offset++ }
    return new Blob([buffer], {type: "audio/wav"});
  };

  if (isExportMode) {
      return (
        <div className="h-full flex flex-col p-8 space-y-12 items-center justify-center">
             {exportingVideo ? (
                <div className="w-full max-w-xl space-y-10">
                    <div className="relative aspect-video rounded-3xl overflow-hidden border border-[#f3a683]/20 shadow-2xl bg-black">
                        <canvas ref={previewCanvasRef} className="w-full h-full object-cover" width={640} height={360} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-8 gap-4">
                            <div className="flex justify-between items-center text-[10px] font-black tracking-[0.4em] uppercase text-white">
                                <div className="flex items-center gap-3">
                                    <Loader2 className="w-4 h-4 animate-spin text-[#f3a683]" />
                                    <span>Exporting Track...</span>
                                </div>
                                <span className="text-[#f3a683]">{Math.round(exportProgress)}%</span>
                            </div>
                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-[#f3a683] transition-all duration-300 shadow-[0_0_20px_rgba(243,166,131,0.6)]" style={{ width: `${exportProgress}%` }} />
                            </div>
                        </div>
                    </div>
                    <p className="text-[10px] text-center text-slate-500 font-bold uppercase tracking-[0.3em] leading-relaxed max-w-xs mx-auto">Filming in high resolution. Keep the window focused for best results.</p>
                </div>
             ) : (
                <>
                    <div className="w-24 h-24 bg-[#f3a683]/5 rounded-full flex items-center justify-center border border-[#f3a683]/20">
                        <Music4 className="w-10 h-10 text-[#f3a683]" />
                    </div>
                    <div className="text-center space-y-3">
                        <h3 className="text-3xl font-bold">Ready to Export</h3>
                        <p className="text-slate-500 max-w-sm mx-auto text-sm leading-relaxed">Choose your format. Full video includes the visualizer and background.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-md">
                        <button onClick={downloadProcessed} className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 py-6 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all active:scale-95 group">
                            <Download className="w-6 h-6 text-[#f3a683] group-hover:-translate-y-1 transition-transform" />
                            <span className="text-[10px] font-black tracking-widest uppercase">Audio Track</span>
                        </button>
                        <button onClick={exportVideo} className="bg-[#f3a683] hover:bg-[#cf9376] text-[#1a1625] py-6 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all shadow-2xl shadow-[#f3a683]/20 active:scale-95 group">
                            <Video className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
                            <span className="text-[10px] font-black tracking-widest uppercase">Full Video</span>
                        </button>
                    </div>
                </>
             )}
        </div>
      );
  }

  return (
    <div className="h-full flex flex-col p-8 pt-4 space-y-10">
      {/* Player Section */}
      <div className="flex flex-col items-center space-y-10">
          <button 
            onClick={togglePlay} 
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${isPlaying ? 'bg-white/10 text-white shadow-white/5' : 'bg-[#f3a683] text-[#1a1625] shadow-[#f3a683]/20 hover:scale-105 active:scale-95'}`}
          >
            {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current translate-x-1" />}
          </button>

          <div className="w-full flex flex-col items-center gap-4">
              <div className="flex items-center gap-3 opacity-30 w-full">
                  <div className="h-px flex-1 bg-white" />
                  <span className="text-[9px] font-black tracking-[0.5em] uppercase whitespace-nowrap">Instant Vibe</span>
                  <div className="h-px flex-1 bg-white" />
              </div>
              <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 w-full">
                  {PRESETS.map(p => (
                      <button key={p.id} onClick={() => applyPreset(p)} className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${activePresetId === p.id ? 'bg-[#f3a683]/10 border-[#f3a683] text-[#f3a683]' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}>
                          {p.icon}
                          <span className="text-[8px] font-bold uppercase tracking-wider">{p.name}</span>
                      </button>
                  ))}
              </div>
          </div>
      </div>

      {/* Mixer Section */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-10 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-6">
                 <h4 className="text-[10px] font-black tracking-[0.4em] uppercase text-slate-500 flex items-center gap-2"><Palette className="w-3 h-3" /> Sonic Texture</h4>
                 <div className="space-y-6 bg-white/5 p-6 rounded-3xl border border-white/5">
                    <ControlSlider label="Tempo" value={Math.round(settings.playbackRate*100)} min={0.5} max={1.5} step={0.01} current={settings.playbackRate} onChange={v => handleManualChange('playbackRate', v)} suffix="%" />
                    <ControlSlider label="Muffle" value={settings.filterFrequency} min={200} max={10000} current={settings.filterFrequency} onChange={v => handleManualChange('filterFrequency', v)} suffix="Hz" />
                    <ControlSlider label="Grit" value={Math.round(settings.distortionAmount*100)} min={0} max={0.6} current={settings.distortionAmount} onChange={v => handleManualChange('distortionAmount', v)} suffix="%" />
                 </div>
             </div>
             <div className="space-y-6">
                 <h4 className="text-[10px] font-black tracking-[0.4em] uppercase text-slate-500 flex items-center gap-2"><Waves className="w-3 h-3" /> Space & Time</h4>
                 <div className="space-y-6 bg-white/5 p-6 rounded-3xl border border-white/5">
                    <ControlSlider label="Wobble" value={Math.round(settings.wobbleDepth)} min={0} max={40} current={settings.wobbleDepth} onChange={v => handleManualChange('wobbleDepth', v)} suffix="" />
                    <ControlSlider label="Room" value={Math.round(settings.reverbMix*100)} min={0} max={0.8} current={settings.reverbMix} onChange={v => handleManualChange('reverbMix', v)} suffix="%" />
                    <ControlSlider label="Hiss" value={Math.round(settings.noiseGain*1000)} min={0} max={0.15} current={settings.noiseGain} onChange={v => handleManualChange('noiseGain', v)} suffix="" />
                 </div>
             </div>
          </div>

          <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black tracking-[0.4em] uppercase text-slate-500 flex items-center gap-2"><Activity className="w-3 h-3" /> Visualizer Tuning</h4>
                <button onClick={() => setVisSettings(s => ({...s, enable: !s.enable}))} className={`text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${visSettings.enable ? 'bg-[#f3a683]/10 text-[#f3a683]' : 'bg-white/5 text-slate-600'}`}>{visSettings.enable ? 'ON' : 'OFF'}</button>
              </div>
              <div className="bg-white/5 p-6 rounded-3xl border border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-8">
                   <div className="space-y-3">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Style</label>
                        <div className="flex gap-2">
                            {['circle', 'bars', 'wave'].map(s => (
                                <button key={s} onClick={() => setVisSettings(p => ({...p, style: s as any}))} className={`flex-1 py-2 text-[9px] font-bold uppercase rounded-xl border transition-all ${visSettings.style === s ? 'bg-[#f3a683] border-[#f3a683] text-[#1a1625]' : 'bg-white/5 border-white/5 text-slate-500'}`}>{s}</button>
                            ))}
                        </div>
                   </div>
                   <div className="space-y-3">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Color</label>
                        <div className="flex gap-3 items-center h-8">
                            {['#f3a683', '#778beb', '#ffffff', '#22d3ee'].map(c => (
                                <button key={c} onClick={() => setVisSettings(p => ({...p, color: c}))} className={`w-5 h-5 rounded-full border-2 transition-all ${visSettings.color === c ? 'border-white scale-125' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                            ))}
                        </div>
                   </div>
                   <div className="flex items-end">
                       <button onClick={onGoToExport} className="w-full bg-[#f3a683] hover:bg-[#cf9376] text-[#1a1625] py-3 rounded-2xl flex items-center justify-center gap-2 font-black tracking-widest text-[10px] transition-all shadow-xl shadow-[#f3a683]/10">
                           FINALIZE <ArrowRight className="w-3.5 h-3.5" />
                       </button>
                   </div>
              </div>
          </div>
      </div>
    </div>
  );
};

const ControlSlider = ({ label, value, min, max, step, current, onChange, suffix }: any) => (
    <div className="space-y-2">
        <div className="flex justify-between items-center text-[10px] font-bold tracking-wider uppercase">
            <span className="text-slate-500">{label}</span>
            <span className="text-[#f3a683]">{value}{suffix}</span>
        </div>
        <input type="range" min={min} max={max} step={step || (max > 50 ? 1 : 0.01)} value={current} onChange={e => onChange(parseFloat(e.target.value))} className="w-full" />
    </div>
);