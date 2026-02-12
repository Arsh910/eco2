import React from 'react';
import { User, Shield, Zap, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useView } from '../../../context/ViewContext';

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
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900/50 p-6 space-y-6 select-none">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
                <p className="text-slate-500 dark:text-slate-400">Manage your account and preferences</p>
            </div>

            {/* Account Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Account</h2>

                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                            {isGuest ? (guestName?.[0]?.toUpperCase() || 'G') : (user?.name?.[0]?.toUpperCase() || 'U')}
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                                {isGuest ? (guestName || 'Guest User') : (user?.name || 'User')}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {isGuest ? 'Guest Session' : (user?.email || 'Logged In')}
                            </p>
                        </div>
                    </div>

                    {isGuest && (
                        <span className="px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
                            Guest
                        </span>
                    )}
                </div>

                {!isGuest && (
                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors text-sm font-medium"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Preferences Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Preferences</h2>

                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${isProMode ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                Pro Mode
                                {isProMode && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300 rounded uppercase tracking-wider">ACTIVE</span>}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Unlock advanced features and tools
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        {isGuest && (
                            <span className="text-xs text-slate-400 italic">Login required</span>
                        )}
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isProMode}
                                onChange={toggleView}
                                disabled={isGuest}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600 opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"></div>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
