import { ArrowLeft, Code2, Users, Sparkles, Heart, Rocket, Shield, Cpu, Globe, Monitor, Calendar, Layers } from 'lucide-react';

const features = [
    {
        icon: Globe,
        title: 'Web-Based Desktop Experience',
        description: 'A fully functional desktop environment running entirely in your browser, bringing the familiarity of a native OS to the web.',
        color: 'text-blue-400',
    },
    {
        icon: Code2,
        title: 'Built with Modern Tech',
        description: 'Powered by React, Tailwind CSS, and WebGL — delivering a fast, responsive, and visually stunning interface.',
        color: 'text-emerald-400',
    },
    {
        icon: Cpu,
        title: 'Modular Architecture',
        description: 'Every app, widget, and feature is a self-contained module, making Eco2 infinitely extensible and easy to customize.',
        color: 'text-purple-400',
    },
    {
        icon: Shield,
        title: 'Privacy First',
        description: 'Your data stays yours. Eco2 is designed with privacy at its core — no tracking, no telemetry, no compromises.',
        color: 'text-red-400',
    },
];

const values = [
    { icon: Sparkles, label: 'Innovation', description: 'Pushing boundaries of what a browser can do.' },
    { icon: Heart, label: 'Community', description: 'Built by developers, for everyone.' },
    { icon: Rocket, label: 'Performance', description: 'Lightweight and blazing fast, always.' },
    { icon: Users, label: 'Accessibility', description: 'Designed to be intuitive for all users.' },
];

const systemInfo = [
    { label: 'OS Name', value: 'EcoOS', icon: Monitor },
    { label: 'Version', value: '1.0.0', icon: Layers },
    { label: 'Codename', value: 'Aurora', icon: Sparkles },
    { label: 'Build', value: '2026.03.01', icon: Calendar },
    { label: 'Kernel', value: 'EcoKernel 1.0 (Web)', icon: Cpu },
];

const AboutUs = ({ onBack }) => {
    return (
        <div className="h-full flex flex-col select-none text-[var(--text-primary)] transition-colors duration-300 overflow-y-auto">
            {/* Header with back button */}
            <div className="sticky top-0 z-10 bg-[var(--bg-window)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)] px-6 py-4 flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="p-2 rounded-xl hover:bg-[var(--bg-secondary)] transition-colors group"
                >
                    <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors" />
                </button>
                <h1 className="text-lg font-semibold text-[var(--text-primary)]">About</h1>
            </div>

            <div className="flex-1 p-6 space-y-6">
                {/* Logo & Identity */}
                <div className="text-center py-6">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--accent-primary)]/10 to-purple-600/10 border border-[var(--border-subtle)] mb-5 shadow-xl shadow-[var(--accent-primary)]/10 overflow-hidden">
                        <img
                            src="/logo/logo.png"
                            alt="Eco2 Logo"
                            className="w-16 h-16 object-contain"
                        />
                    </div>
                    <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">EcoOS</h2>
                    <p className="text-[var(--accent-primary)] font-medium text-sm mt-1">Version 1.0.0 — Aurora</p>
                    <p className="text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed mt-3 text-sm">
                        A modern, web-based desktop environment reimagining how you interact with the browser.
                        Eco2 brings the power of a native operating system into a sleek, customizable web experience.
                    </p>
                </div>

                {/* System Information */}
                <div className="bg-[var(--bg-window)] backdrop-blur-md rounded-2xl p-6 border border-[var(--border-subtle)] shadow-lg">
                    <h3 className="text-xs font-semibold text-[var(--accent-primary)] uppercase tracking-wider mb-4">System Information</h3>
                    <div className="space-y-0 divide-y divide-[var(--border-subtle)]">
                        {systemInfo.map((info) => (
                            <div key={info.label} className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-3">
                                    <info.icon className="w-4 h-4 text-[var(--text-tertiary)]" />
                                    <span className="text-sm text-[var(--text-secondary)]">{info.label}</span>
                                </div>
                                <span className="text-sm font-medium text-[var(--text-primary)]">{info.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Mission */}
                <div className="bg-[var(--bg-window)] backdrop-blur-md rounded-2xl p-6 border border-[var(--border-subtle)] shadow-lg">
                    <h3 className="text-xs font-semibold text-[var(--accent-primary)] uppercase tracking-wider mb-4">Our Mission</h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                        We believe the browser is the most universal platform on the planet. Eco2 was born from
                        the idea that your digital workspace should be accessible from anywhere — no installations,
                        no platform lock-in, just a seamless environment that adapts to you. Whether you're
                        managing files, chatting with friends, or exploring creative tools, Eco2 provides
                        a unified space to do it all.
                    </p>
                </div>

                {/* Features Grid */}
                <div className="bg-[var(--bg-window)] backdrop-blur-md rounded-2xl p-6 border border-[var(--border-subtle)] shadow-lg">
                    <h3 className="text-xs font-semibold text-[var(--accent-primary)] uppercase tracking-wider mb-4">What Makes Eco2 Special</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {features.map((feature) => (
                            <div
                                key={feature.title}
                                className="flex items-start p-4 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl transition-all hover:border-[var(--accent-primary)]/30 group"
                            >
                                <div className="p-2 bg-[var(--bg-glass)] rounded-lg group-hover:scale-110 transition-transform mr-3 mt-0.5">
                                    <feature.icon className={`w-5 h-5 ${feature.color}`} />
                                </div>
                                <div>
                                    <h5 className="text-sm font-semibold text-[var(--text-primary)]">{feature.title}</h5>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{feature.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Values */}
                <div className="bg-[var(--bg-window)] backdrop-blur-md rounded-2xl p-6 border border-[var(--border-subtle)] shadow-lg">
                    <h3 className="text-xs font-semibold text-[var(--accent-primary)] uppercase tracking-wider mb-4">Our Values</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {values.map((value) => (
                            <div
                                key={value.label}
                                className="flex flex-col items-center text-center p-4 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl"
                            >
                                <value.icon className="w-6 h-6 text-[var(--accent-primary)] mb-2" />
                                <span className="text-sm font-semibold text-[var(--text-primary)]">{value.label}</span>
                                <span className="text-xs text-[var(--text-secondary)] mt-1">{value.description}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center py-4 space-y-2">
                    <div className="inline-flex items-center gap-2 opacity-60">
                        <img src="/logo/logo.png" alt="Eco2" className="w-4 h-4 object-contain" />
                        <span className="text-xs font-medium text-[var(--text-secondary)]">EcoOS v1.0.0</span>
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)]">
                        Built with passion. We're always evolving — and we'd love for you to be part of the journey.
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                        &copy; 2026 Eco2 Team. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AboutUs;
