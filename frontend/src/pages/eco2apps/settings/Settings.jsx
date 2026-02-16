import React from 'react';
import { User, Shield, Zap, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useView } from '../../../context/ViewContext';
import DisplaySettings from './sections/DisplaySettings';

export default function Settings() {
    const { user, guestName, mode, logout } = useAuth();
    const { isProMode, toggleView } = useView();
    const navigate = useNavigate();

    const isGuest = mode === 'guest';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="h-full flex flex-col p-6 space-y-6 select-none text-[var(--text-primary)] transition-colors duration-300" style={{ "height": "fit-content" }}>
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Settings</h1>
                <p className="text-[var(--text-secondary)] mt-1">Manage your account and preferences</p>
            </div>

            {/* Account Section */}
            <div className="bg-[var(--bg-window)] backdrop-blur-md rounded-2xl p-6 border border-[var(--border-subtle)] shadow-lg transition-colors duration-300">
                <h2 className="text-xs font-semibold text-[var(--accent-primary)] uppercase tracking-wider mb-6">Account</h2>

                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-5">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-inner ring-2 ring-[var(--border-subtle)] overflow-hidden">
                            {!isGuest && user?.prof_image ? (
                                <img
                                    src={user.prof_image}
                                    alt={user.name || "User"}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                isGuest ? (guestName?.[0]?.toUpperCase() || 'G') : (user?.name?.[0]?.toUpperCase() || 'U')
                            )}
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                                {isGuest ? (guestName || 'Guest User') : (user?.name || 'User')}
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">
                                {isGuest ? 'Guest Session' : (user?.email || 'Logged In')}
                            </p>
                        </div>
                    </div>

                    {isGuest && (
                        <span className="px-3 py-1 text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full">
                            Guest
                        </span>
                    )}
                </div>

                {!isGuest && (
                    <div className="mt-8 pt-6 border-t border-[var(--border-subtle)]">
                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-2 text-red-500 hover:text-red-400 transition-colors text-sm font-medium group"
                        >
                            <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Display Settings - New Modular Section */}
            <DisplaySettings isGuest={isGuest} />

            {/* Preferences Section */}
            <div className="mb-[5px] bg-[var(--bg-window)] backdrop-blur-md rounded-2xl p-6 border border-[var(--border-subtle)] shadow-lg transition-colors duration-300">
                <h2 className="text-xs font-semibold text-[var(--accent-primary)] uppercase tracking-wider mb-6">Preferences</h2>

                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-xl transition-colors duration-300 ${isProMode ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/30' : 'bg-[var(--bg-glass)] text-[var(--text-secondary)]'}`}>
                            <Zap className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-3">
                                Pro Mode
                                {isProMode && <span className="text-[10px] font-bold px-2 py-0.5 bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] rounded-full uppercase tracking-wider border border-[var(--accent-primary)]/20">ACTIVE</span>}
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">
                                Unlock advanced features and tools
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        {isGuest && (
                            <span className="text-xs text-[var(--text-secondary)] italic">Login required</span>
                        )}
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isProMode}
                                onChange={toggleView}
                                disabled={isGuest}
                            />
                            <div className="w-14 h-7 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--accent-primary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[var(--accent-primary)] opacity-100 disabled:opacity-50 disabled:cursor-not-allowed border border-[var(--border-subtle)]"></div>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
