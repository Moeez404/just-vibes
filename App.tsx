import React, { useState, useEffect } from 'react';
import { Upload, Music2, Wind, Moon, ChevronRight, ChevronLeft, Sparkles, Sliders, Video, CheckCircle2 } from 'lucide-react';
import { LofiPlayer } from './components/LofiPlayer';
import { VisualsStudio } from './components/VisualsStudio';

interface VisualAsset {
  url: string;
  type: 'image' | 'video';
}

type Step = 'upload' | 'visuals' | 'mix' | 'export';

const App = () => {
  const [step, setStep] = useState<Step>('upload');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [currentVisual, setCurrentVisual] = useState<VisualAsset | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
      setStep('visuals');
    }
  };

  const handleVisualSelected = (url: string, type: 'image' | 'video') => {
    setCurrentVisual({ url, type });
  };

  const nextStep = () => {
    if (step === 'visuals') setStep('mix');
    else if (step === 'mix') setStep('export');
  };

  const prevStep = () => {
    if (step === 'visuals') setStep('upload');
    else if (step === 'mix') setStep('visuals');
    else if (step === 'export') setStep('mix');
  };

  // Steps indicator configuration
  const steps: { key: Step; label: string; icon: any }[] = [
    { key: 'upload', label: 'Sound', icon: Music2 },
    { key: 'visuals', label: 'Scene', icon: Sparkles },
    { key: 'mix', label: 'Vibe', icon: Sliders },
    { key: 'export', label: 'Finish', icon: CheckCircle2 },
  ];

  const getAudioName = () => {
    if (!audioFile) return 'Track';
    return audioFile.name.replace(/\.[^/.]+$/, "");
  };

  return (
    <div className="min-h-screen bg-[#0f0a13] text-[#e2e8f0] flex flex-col relative overflow-x-hidden">
      
      {/* Immersive Background */}
      <div className="fixed inset-0 z-0 transition-all duration-[3000ms] ease-in-out overflow-hidden pointer-events-none">
        {currentVisual ? (
             currentVisual.type === 'video' ? (
                <video 
                    src={currentVisual.url} 
                    autoPlay 
                    loop 
                    muted 
                    className={`w-full h-full object-cover transition-all duration-1000 ${step === 'mix' || step === 'export' ? 'blur-[4px] scale-105 opacity-40' : 'blur-[12px] opacity-20'}`} 
                />
             ) : (
                <img
                    src={currentVisual.url}
                    className={`w-full h-full object-cover transition-all duration-1000 ${step === 'mix' || step === 'export' ? 'blur-[4px] scale-105 opacity-40' : 'blur-[12px] opacity-20'}`}
                    alt="bg"
                />
             )
        ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1a1625] via-[#2d2942] to-[#0f0a13] opacity-50" />
        )}
      </div>

      {/* Aesthetic Grain & Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#f3a683]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Header / Stepper */}
      <header className="relative z-20 pt-8 pb-4">
        <div className="max-w-2xl mx-auto px-6">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-[#f3a683] p-2 rounded-xl shadow-lg shadow-[#f3a683]/10 rotate-3">
                    <Moon className="w-4 h-4 text-[#1a1625] fill-current" />
                </div>
                <h1 className="text-sm font-black tracking-[0.3em] uppercase text-[#f3a683]">Just Vibes</h1>
              </div>
              <div className="flex items-center gap-1.5">
                {steps.map((s, idx) => {
                    const Icon = s.icon;
                    const isActive = step === s.key;
                    const isPast = steps.findIndex(x => x.key === step) > idx;
                    return (
                        <React.Fragment key={s.key}>
                            <div className={`flex flex-col items-center gap-1 transition-all duration-500 ${isActive ? 'opacity-100 scale-110' : 'opacity-30'}`}>
                                <Icon className={`w-3.5 h-3.5 ${isActive || isPast ? 'text-[#f3a683]' : 'text-slate-400'}`} />
                            </div>
                            {idx < steps.length - 1 && <div className="w-4 h-[1px] bg-white/10 mx-1" />}
                        </React.Fragment>
                    );
                })}
              </div>
           </div>
        </div>
      </header>

      {/* Main Studio Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className={`lofi-card glow-peach w-full max-w-4xl transition-all duration-700 ease-in-out rounded-[3rem] overflow-hidden flex flex-col ${step === 'upload' ? 'max-w-xl sm:aspect-square min-h-[460px]' : 'min-h-[70vh]'}`}>
           
           {/* Step 1: Upload */}
           {step === 'upload' && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center space-y-8 sm:space-y-10">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 bg-[#f3a683]/5 rounded-[3rem] flex items-center justify-center border border-[#f3a683]/20 shadow-inner group relative">
                      <div className="absolute inset-0 bg-[#f3a683]/10 rounded-[3rem] animate-ping opacity-20 pointer-events-none" />
                      <Wind className="w-10 h-10 sm:w-12 sm:h-12 text-[#f3a683] group-hover:rotate-45 transition-transform duration-700" />
                  </div>
                  <div className="space-y-4">
                      <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">The Journey Begins</h2>
                      <p className="text-slate-400 max-w-xs mx-auto text-sm leading-relaxed tracking-wide">
                          Upload the melody you want to muffle in nostalgia.
                      </p>
                  </div>
                  <label className="cursor-pointer bg-[#f3a683] hover:bg-[#cf9376] text-[#1a1625] px-10 py-4 sm:px-12 sm:py-5 rounded-full font-black tracking-[0.2em] text-xs transition-all shadow-2xl shadow-[#f3a683]/20 active:scale-95">
                      SELECT AUDIO
                      <input type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
                  </label>
              </div>
           )}

           {/* Step 2: Visuals */}
           {step === 'visuals' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-8 pb-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                          <h2 className="text-2xl font-bold text-white">Set the Scene</h2>
                          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">Pick a visual to match your mood</p>
                      </div>
                      <button 
                        onClick={nextStep} 
                        disabled={!currentVisual}
                        className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-xs tracking-widest transition-all ${currentVisual ? 'bg-[#f3a683] text-[#1a1625] shadow-xl shadow-[#f3a683]/20' : 'bg-white/5 text-slate-600 grayscale pointer-events-none'}`}
                      >
                        CONTINUE <ChevronRight className="w-4 h-4" />
                      </button>
                  </div>
                  <div className="flex-1 overflow-hidden p-6 sm:p-8">
                      <VisualsStudio onAssetSelected={handleVisualSelected} standalone={false} />
                  </div>
              </div>
           )}

           {/* Step 3: Mixing & Step 4: Export (Handled by LofiPlayer controller) */}
           {(step === 'mix' || step === 'export') && (
              <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-8 pb-0 flex justify-between items-center relative z-20">
                      <button onClick={prevStep} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors font-bold text-[10px] tracking-widest uppercase">
                        <ChevronLeft className="w-4 h-4" /> Back
                      </button>
                      <h2 className="text-xl sm:text-2xl font-bold text-white truncate max-w-[200px] sm:max-w-md">
                        {step === 'mix' ? getAudioName() : 'Final Export'}
                      </h2>
                      <div className="w-12 sm:w-20" /> {/* Spacer for symmetry */}
                  </div>
                  <div className="flex-1 overflow-hidden">
                      <LofiPlayer 
                        file={audioFile} 
                        visualSource={currentVisual} 
                        isExportMode={step === 'export'}
                        onGoToExport={() => setStep('export')}
                      />
                  </div>
              </div>
           )}

        </div>
      </main>

      <footer className="relative z-20 py-8 text-center mt-auto">
         <p className="text-[9px] text-slate-600 uppercase tracking-[0.5em] font-black transition-opacity duration-1000">
            Made with love by Moeez Ahmed
         </p>
      </footer>
    </div>
  );
};

export default App;