import React from 'react';

export default function ProTransferExperience() {
    return (
        <div className="h-full flex items-center justify-center p-8">
            <div className="max-w-2xl w-full text-center space-y-6">

                <div className="flex justify-center">
                    <img src="/logo/logo.png" alt="Eco Logo" className="w-24 h-24 object-contain" />
                </div>
                <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Coming <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">Soon</span>
                </h1>

                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                    We're building something special for our signup users, a totally new experience. Stay tuned!
                </p>
            </div>
        </div>
    );
}
