import React from 'react';
import { Monitor, Image as ImageIcon, Box, Check, Moon, Sun } from 'lucide-react';
import { useView } from '../../../../context/ViewContext';
import useTheme from '../../../../context/themeContext';

const DisplaySettings = ({ isGuest }) => {
    const { backgroundSettings, updateBackgroundSettings, saveBackgroundSettings, isLoadingSettings } = useView();
    const { thememode, changeMode } = useTheme();
    const [isSaving, setIsSaving] = React.useState(false);
    const [isSaved, setIsSaved] = React.useState(false);

    const handleTypeChange = (type) => {
        if (isGuest) return;
        const newSettings = { type: type };
        if (type === 'model') {
            newSettings.value = 'globe';
        }
        updateBackgroundSettings(newSettings);
        setIsSaved(false);
    };

    const handleValueChange = (e) => {
        if (isGuest) return;
        updateBackgroundSettings({ value: e.target.value });
        setIsSaved(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await saveBackgroundSettings();
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2000);
        } catch (error) {
            // Optional: Error feedback
        } finally {
            setIsSaving(false);
        }
    };

    const handleThemeChange = (mode) => {
        if (thememode !== mode) {
            changeMode();
        }
    }

    return (
        <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-lg">
            <h2 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-6">
                Display Settings
            </h2>

            {/* Appearance Section */}
            <div className="mb-8">
                <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-slate-400" />
                    Appearance
                </h3>
                <div className="bg-slate-800/50 p-1 rounded-xl border border-white/5 flex">
                    <button
                        onClick={() => handleThemeChange('light')}
                        className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${thememode === 'light' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Sun className="w-4 h-4" />
                        <span>Light</span>
                    </button>
                    <button
                        onClick={() => handleThemeChange('dark')}
                        className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${thememode === 'dark' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Moon className="w-4 h-4" />
                        <span>Dark</span>
                    </button>
                </div>
            </div>

            {/* Background Settings Section */}
            <div className={`transition-opacity ${isGuest ? 'opacity-75 pointer-events-none select-none relative' : ''}`}>
                <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-slate-400" />
                        Background
                    </div>
                    {isGuest && <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px] border border-white/5">LOGIN REQUIRED</span>}
                </h3>

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
                                onChange={(e) => {
                                    updateBackgroundSettings({ value: e.target.value });
                                    setIsSaved(false);
                                }}
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

                {/* Save Button */}
                {!isGuest && (
                    <div className="mt-6 pt-6 border-t border-white/5 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={isSaving || isLoadingSettings || isSaved}
                            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-all transform active:scale-95 flex items-center space-x-2
                                ${isSaved
                                    ? 'bg-green-600 shadow-lg shadow-green-500/20'
                                    : isSaving
                                        ? 'bg-indigo-600/50 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'}`}
                        >
                            {isSaved ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    <span>Saved!</span>
                                </>
                            ) : (
                                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DisplaySettings;
