import React from 'react';
import { ShoppingBag, Box, LayoutGrid } from 'lucide-react';

const EcoStore = () => {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center relative overflow-hidden bg-[#0A0F1C] text-slate-300 font-sans">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-[#0A0F1C] to-[#0A0F1C] pointer-events-none"></div>

            {/* Content Container */}
            <div className="relative z-10 max-w-3xl w-full flex flex-col items-center">
                {/* Logo Area */}
                <div className="mb-8 relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative w-24 h-24 bg-[#121827] rounded-full flex items-center justify-center ring-1 ring-white/10 shadow-2xl overflow-hidden">
                        <img src="/logo/logo.png" alt="EcoStore Logo" className="w-full h-full object-cover opacity-90 p-2" />
                    </div>
                </div>

                {/* Main Heading */}
                <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
                    <span className="text-white">Coming</span> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Soon</span>
                </h1>

                {/* Subtitle / Description */}
                <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mb-12 font-light">
                    We're building something special for our <span className="text-blue-400 font-medium">EcoStore</span> users.
                    A totally new experience to install, manage, and pin web apps. Stay tuned!
                </p>

                {/* Grid Content - Styled Minimally */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group text-left backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                                <Box className="text-blue-400" size={20} />
                            </div>
                            <h3 className="font-semibold text-white">For Users</h3>
                        </div>
                        <p className="text-sm text-slate-500 group-hover:text-slate-400 transition-colors">
                            Install your favorite web apps and pin them to your Eco dock for instant access.
                        </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group text-left backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                                <LayoutGrid className="text-purple-400" size={20} />
                            </div>
                            <h3 className="font-semibold text-white">For Developers</h3>
                        </div>
                        <p className="text-sm text-slate-500 group-hover:text-slate-400 transition-colors">
                            Publish your own apps to the EcoStore and share them with the community.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EcoStore;
