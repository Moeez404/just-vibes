
export enum ImageSize {
  Size1K = '1K',
  Size2K = '2K',
  Size4K = '4K',
}

export enum AspectRatio {
  Landscape = '16:9',
  Portrait = '9:16',
}

export interface GeneratedAsset {
  url: string;
  type: 'image' | 'video';
  mimeType: string;
}

export interface LofiSettings {
  playbackRate: number;
  
  // Filter
  filterFrequency: number;
  filterType: 'lowpass' | 'highpass';
  
  // Noise & Character
  noiseGain: number;
  wobbleDepth: number;    // Tape wobble intensity (detune cents)
  distortionAmount: number; // Saturation amount (0-1)
  
  // Spatial & Time
  reverbMix: number;      // Wet/Dry mix for reverb (0-1)
  echoMix: number;        // Wet/Dry mix for delay/echo (0-1)
  pan: number;            // -1 (Left) to 1 (Right)

  // EQ (Decibels -12 to 12)
  eqLow: number;
  eqMid: number;
  eqHigh: number;
}
