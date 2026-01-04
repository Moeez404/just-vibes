import React, { useState } from 'react';
import { Image as ImageIcon, Upload, Star, Sparkles } from 'lucide-react';

interface VisualsStudioProps {
  onAssetSelected: (url: string, type: 'image' | 'video') => void;
  standalone?: boolean;
}

const DEFAULT_PRESETS = [
  { name: 'Rainy Day', url: 'https://images.unsplash.com/photo-1493382051629-7eb03ec93ea2?q=80&w=1920&auto=format&fit=crop' },
  { name: 'Neon City', url: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=1920&auto=format&fit=crop' },
  { name: 'Pink Dusk', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1920&auto=format&fit=crop' },
  { name: 'Warm Cafe', url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=1920&auto=format&fit=crop' },
  { name: 'Misty Hill', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1920&auto=format&fit=crop' },
  { name: 'Midnight', url: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?q=80&w=1920&auto=format&fit=crop' },
  { name: 'Vintage Room', url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=1920&auto=format&fit=crop' },
  { name: 'Sunset Drive', url: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1920&auto=format&fit=crop' }
];

export const VisualsStudio: React.FC<VisualsStudioProps> = ({ onAssetSelected, standalone = true }) => {
  const [selectedPresetUrl, setSelectedPresetUrl] = useState<string | null>(null);

  const handlePresetClick = (url: string) => {
    setSelectedPresetUrl(url);
    onAssetSelected(url, 'image');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const url = reader.result as string;
        setSelectedPresetUrl(url);
        onAssetSelected(url, file.type.startsWith('video') ? 'video' : 'image');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`flex flex-col h-full ${standalone ? 'lofi-card glow-peach rounded-[2.5rem] p-8' : ''}`}>
      <div className="flex-1 overflow-y-auto space-y-12 pr-4 custom-scrollbar">
        {/* Presets Section */}
        <div className="space-y-6">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
            <Star className="w-3.5 h-3.5 text-[#f3a683] fill-current" /> Aesthetic Presets
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {DEFAULT_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePresetClick(preset.url)}
                className={`group relative rounded-3xl overflow-hidden border-2 transition-all duration-500 aspect-video ${
                  selectedPresetUrl === preset.url 
                    ? 'border-[#f3a683] scale-95 shadow-xl shadow-[#f3a683]/10' 
                    : 'border-white/5 hover:border-white/20'
                }`}
              >
                <img src={preset.url} alt={preset.name} className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <span className="text-[9px] text-white font-bold tracking-widest uppercase">{preset.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Upload Section */}
        <div className="space-y-6 pb-4">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
            <Upload className="w-3.5 h-3.5" /> Your Atmosphere
          </label>
          <div className="bg-white/5 border-2 border-dashed border-white/10 rounded-[2.5rem] p-12 text-center hover:border-[#f3a683]/30 transition-all cursor-pointer relative group">
            <input 
              type="file" 
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
            />
            <div className="space-y-4">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto transition-transform group-hover:scale-110 duration-500 border border-white/5">
                <ImageIcon className="w-7 h-7 text-[#f3a683]" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-slate-300 font-bold tracking-tight">Drop Image or Video</p>
                <p className="text-[9px] text-slate-500 uppercase font-black tracking-[0.3em]">Personalize your chill space</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};