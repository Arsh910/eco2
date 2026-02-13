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
        <div className="h-full flex flex-col p-6 space-y-6 select-none text-slate-200">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Settings</h1>
                <p className="text-slate-400 mt-1">Manage your account and preferences</p>
            </div>

            {/* Account Section */}
            <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-lg">
                <h2 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-6">Account</h2>

                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-5">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-inner ring-2 ring-white/10">
                            {isGuest ? (guestName?.[0]?.toUpperCase() || 'G') : (user?.name?.[0]?.toUpperCase() || 'U')}
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-white">
                                {isGuest ? (guestName || 'Guest User') : (user?.name || 'User')}
                            </h3>
                            <p className="text-sm text-slate-400 mt-1">
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
                    <div className="mt-8 pt-6 border-t border-white/5">
                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-2 text-red-400 hover:text-red-300 transition-colors text-sm font-medium group"
                        >
                            <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Display Settings - New Modular Section */}
            <DisplaySettings disabled={isGuest} />

            {/* Preferences Section */}
            <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-lg">
                <h2 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-6">Preferences</h2>

                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-xl ${isProMode ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30' : 'bg-slate-800 text-slate-500'}`}>
                            <Zap className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white flex items-center gap-3">
                                Pro Mode
                                {isProMode && <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full uppercase tracking-wider border border-indigo-500/20">ACTIVE</span>}
                            </h3>
                            <p className="text-sm text-slate-400 mt-1">
                                Unlock advanced features and tools
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        {isGuest && (
                            <span className="text-xs text-slate-500 italic">Login required</span>
                        )}
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isProMode}
                                onChange={toggleView}
                                disabled={isGuest}
                            />
                            <div className="w-14 h-7 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600 opacity-100 disabled:opacity-50 disabled:cursor-not-allowed border border-white/5"></div>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
