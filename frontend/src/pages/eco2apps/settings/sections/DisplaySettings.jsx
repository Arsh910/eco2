import React from 'react';
import { Monitor, Image as ImageIcon, Box, Check, Moon, Sun } from 'lucide-react';
import { useView } from '../../../../context/ViewContext';

const DisplaySettings = ({ isGuest }) => {
    const { backgroundSettings, updateBackgroundSettings, saveBackgroundSettings, isLoadingSettings, theme, toggleTheme } = useView();
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

    return (
        <div className="bg-[var(--bg-window)] backdrop-blur-md rounded-2xl p-6 border border-[var(--border-subtle)] shadow-lg transition-colors duration-300">
            <h2 className="text-xs font-semibold text-[var(--accent-primary)] uppercase tracking-wider mb-6">
                Display Settings
            </h2>

            {/* Appearance Section */}
            <div className="mb-8">
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4 flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-[var(--text-secondary)]" />
                    Appearance
                </h3>
                <div className="bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)] flex">
                    <button
                        onClick={toggleTheme}
                        className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${theme === 'light' ? 'bg-[var(--accent-primary)] text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        <Sun className="w-4 h-4" />
                        <span>Light</span>
                    </button>
                    <button
                        onClick={toggleTheme}
                        className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${theme === 'dark' ? 'bg-[var(--accent-primary)] text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        <Moon className="w-4 h-4" />
                        <span>Dark</span>
                    </button>
                </div>
            </div>

            {/* Background Settings Section */}
            <div className={`transition-opacity ${isGuest ? 'opacity-75 pointer-events-none select-none relative' : ''}`}>
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-[var(--text-secondary)]" />
                        Background
                    </div>
                    {isGuest && <span className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] px-2 py-0.5 rounded text-[10px] border border-[var(--border-subtle)]">LOGIN REQUIRED</span>}
                </h3>

                {/* Background Type Toggle */}
                <div className="flex bg-[var(--bg-secondary)] p-1 rounded-xl mb-6 border border-[var(--border-subtle)]">
                    <button
                        onClick={() => handleTypeChange('model')}
                        className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${backgroundSettings.type === 'model' ? 'bg-[var(--accent-primary)] text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        <Box className="w-4 h-4" />
                        <span>3D Model</span>
                    </button>
                    <button
                        onClick={() => handleTypeChange('image')}
                        className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${backgroundSettings.type === 'image' ? 'bg-[var(--accent-primary)] text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        <ImageIcon className="w-4 h-4" />
                        <span>Image</span>
                    </button>
                </div>

                {/* Configuration Options */}
                <div className="space-y-4">
                    {backgroundSettings.type === 'model' ? (
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Effect Style</label>
                            <select
                                value={backgroundSettings.value}
                                onChange={(e) => {
                                    updateBackgroundSettings({ value: e.target.value });
                                    setIsSaved(false);
                                }}
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50"
                            >
                                <option value="globe" className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">Cyber Globe</option>
                                <option value="net" className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">Neural Net</option>
                            </select>
                            <p className="text-xs text-[var(--text-tertiary)] mt-2">
                                Interactive 3D background powered by WebGL.
                            </p>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Image URL</label>
                            <input
                                type="text"
                                value={backgroundSettings.value === 'globe' ? '' : backgroundSettings.value}
                                onChange={handleValueChange}
                                placeholder="https://example.com/wallpaper.jpg"
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50"
                            />
                            <p className="text-xs text-[var(--text-tertiary)] mt-2">
                                Enter a direct link to an image file (JPG, PNG).
                            </p>
                        </div>
                    )}
                </div>

                {/* Save Button */}
                {!isGuest && (
                    <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={isSaving || isLoadingSettings || isSaved}
                            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-all transform active:scale-95 flex items-center space-x-2
                                ${isSaved
                                    ? 'bg-green-600 shadow-lg shadow-green-500/20'
                                    : isSaving
                                        ? 'bg-[var(--accent-primary)]/50 cursor-not-allowed'
                                        : 'bg-[var(--accent-primary)] hover:opacity-90 shadow-lg shadow-[var(--accent-primary)]/20'}`}
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
