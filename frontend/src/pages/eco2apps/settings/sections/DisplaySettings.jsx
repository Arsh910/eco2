import React from 'react';
import { Monitor, Image as ImageIcon, Box } from 'lucide-react';
import { useView } from '../../../../context/ViewContext';

const DisplaySettings = ({ disabled }) => {
    const { backgroundSettings, updateBackgroundSettings } = useView();

    const handleTypeChange = (type) => {
        if (disabled) return;
        updateBackgroundSettings({ type: type });
    };

    const handleValueChange = (e) => {
        if (disabled) return;
        updateBackgroundSettings({ value: e.target.value });
    };

    return (
        <div className={`bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-lg transition-opacity ${disabled ? 'opacity-75 pointer-events-none' : ''}`}>
            <h2 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-6 flex items-center justify-between">
                <span>Display Settings</span>
                {disabled && <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px] border border-white/5">LOGIN REQUIRED</span>}
            </h2>

            {/* Background Type Toggle */}
            <div className="flex bg-slate-800/50 p-1 rounded-xl mb-6 border border-white/5">
                <button
                    onClick={() => handleTypeChange('model')}
                    className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${backgroundSettings.type === 'model' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <Box className="w-4 h-4" />
                    <span>3D Model</span>
                </button>
                <button
                    onClick={() => handleTypeChange('image')}
                    className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${backgroundSettings.type === 'image' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <ImageIcon className="w-4 h-4" />
                    <span>Image</span>
                </button>
            </div>

            {/* Configuration Options */}
            <div className="space-y-4">
                {backgroundSettings.type === 'model' ? (
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Effect Style</label>
                        <select
                            value={backgroundSettings.value}
                            onChange={(e) => updateBackgroundSettings({ value: e.target.value })}
                            className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        >
                            <option value="globe">Cyber Globe</option>
                            <option value="net" disabled>Neural Net (Coming Soon)</option>
                            <option value="dots" disabled>Particle Field (Coming Soon)</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-2">
                            Interactive 3D background powered by WebGL.
                        </p>
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Image URL</label>
                        <input
                            type="text"
                            value={backgroundSettings.value === 'globe' ? '' : backgroundSettings.value}
                            onChange={handleValueChange}
                            placeholder="https://example.com/wallpaper.jpg"
                            className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            Enter a direct link to an image file (JPG, PNG).
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DisplaySettings;
