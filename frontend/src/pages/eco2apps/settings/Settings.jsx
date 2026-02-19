import React, { useState } from 'react';
import { User, Shield, Zap, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import DisplaySettings from './sections/DisplaySettings';
import FeedbackModal from './components/FeedbackModal';

export default function Settings() {
    const { user, guestName, mode, logout } = useAuth();
    const navigate = useNavigate();

    // Feedback Modal State
    const [feedbackModal, setFeedbackModal] = useState({ isOpen: false, type: 'bug' });

    const openFeedbackModal = (type) => {
        setFeedbackModal({ isOpen: true, type });
    };

    const closeFeedbackModal = () => {
        setFeedbackModal({ ...feedbackModal, isOpen: false });
    };

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

            {/* Preferences Section - REMOVED */}

            {/* Help & Feedback Section */}
            <div className="bg-[var(--bg-window)] backdrop-blur-md rounded-2xl p-6 border border-[var(--border-subtle)] shadow-lg transition-colors duration-300">
                <h2 className="text-xs font-semibold text-[var(--accent-primary)] uppercase tracking-wider mb-6">Help & Feedback</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => openFeedbackModal('bug')}
                        className="flex items-center p-4 bg-[var(--bg-secondary)] hover:bg-[var(--accent-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] rounded-xl transition-all group text-left"
                    >
                        <div className="p-3 bg-[var(--bg-glass)] rounded-full group-hover:scale-110 transition-transform mr-4">
                            <Shield className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-[var(--text-primary)]">Report a Bug</h3>
                            <p className="text-sm text-[var(--text-secondary)]">Found an issue? Let us know.</p>
                        </div>
                    </button>

                    <button
                        onClick={() => openFeedbackModal('idea')}
                        className="flex items-center p-4 bg-[var(--bg-secondary)] hover:bg-[var(--accent-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] rounded-xl transition-all group text-left"
                    >
                        <div className="p-3 bg-[var(--bg-glass)] rounded-full group-hover:scale-110 transition-transform mr-4">
                            <Zap className="w-6 h-6 text-yellow-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-[var(--text-primary)]">Give App Ideas</h3>
                            <p className="text-sm text-[var(--text-secondary)]">Share your feature requests.</p>
                        </div>
                    </button>
                </div>
            </div>

            <FeedbackModal
                isOpen={feedbackModal.isOpen}
                onClose={closeFeedbackModal}
                type={feedbackModal.type}
            />
        </div>
    );
}
