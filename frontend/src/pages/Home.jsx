import { useState, useEffect } from "react";
import "react-toastify/dist/ReactToastify.css";
import { Link, useNavigate } from "react-router-dom";
import { Send, FileUp, Zap, Shield, ArrowRight, Menu, X, CheckCircle, Smartphone, Layout, Globe, Star } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import BootSequence from "../components/BootSequence";

export default function Home() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [isBooting, setIsBooting] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Redirect to transfer page if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/transfer');
        }
    }, [isAuthenticated, navigate]);

    return (
        <div className="min-h-screen bg-[#F9FAFB] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">

            {/* Boot Sequence Overlay */}
            {isBooting && (
                <BootSequence onComplete={() => navigate('/login')} />
            )}

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#F9FAFB]/80 backdrop-blur-md border-b border-slate-200/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        {/* Logo */}
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                                E
                            </div>
                            <span className="text-xl font-bold tracking-tight text-slate-900">Eco2</span>
                        </div>

                        {/* Desktop Links */}
                        <div className="hidden md:flex items-center gap-8">
                            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Features</a>
                            <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">How it works</a>
                            <a href="#testimonials" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Testimonials</a>
                        </div>

                        {/* Auth Buttons */}
                        <div className="hidden md:flex items-center gap-4">
                            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                                Log in
                            </Link>
                            <Link to="/signup" className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-sm hover:shadow-lg hover:-translate-y-0.5">
                                Sign up
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-white border-b border-slate-100 px-4 py-4 space-y-4">
                        <a href="#features" className="block text-sm font-medium text-slate-600">Features</a>
                        <a href="#how-it-works" className="block text-sm font-medium text-slate-600">How it works</a>
                        <a href="#testimonials" className="block text-sm font-medium text-slate-600">Testimonials</a>
                        <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                            <Link to="/login" className="text-center py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">
                                Log in
                            </Link>
                            <Link to="/signup" className="text-center py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg">
                                Sign up
                            </Link>
                        </div>
                    </div>
                )}
            </nav>

            <main className="pt-20">
                {/* Hero Section */}
                <section className="relative pt-16 pb-24 lg:pt-32 lg:pb-40 overflow-hidden">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            {/* Text Content */}
                            <div className="max-w-2xl">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold tracking-wide uppercase mb-6">
                                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                                    Free Unlimited Transfer
                                </div>
                                <h1 className="text-5xl lg:text-7xl font-bold text-slate-900 tracking-tight leading-[1.1] mb-6">
                                    The best way to <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                                        share your data.
                                    </span>
                                </h1>
                                <p className="text-lg text-slate-600 mb-10 leading-relaxed max-w-lg">
                                    Securely transfer files and text between devices in real-time.
                                    No registration required for quick updates. Join the future of sharing.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button
                                        onClick={() => setIsBooting(true)}
                                        className="px-8 py-4 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg hover:shadow-blue-500/30 hover:-translate-y-1 flex items-center justify-center gap-2"
                                    >
                                        Start Transferring
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                    <a href="#how-it-works" className="px-8 py-4 text-base font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all flex items-center justify-center">
                                        See how it works
                                    </a>
                                </div>
                            </div>

                            {/* Verified 3D Illustration Placeholder */}
                            <div className="relative hidden lg:block">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-3xl -z-10"></div>
                                <div className="relative z-10">
                                    {/* Abstract CSS composition to mimic 3D */}
                                    <div className="relative w-full aspect-square">
                                        {/* Central "Phone" like element */}
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-48 h-96 bg-slate-900 rounded-[2.5rem] shadow-2xl border-[8px] border-slate-800 rotate-[-12deg] z-20 flex flex-col overflow-hidden">
                                            <div className="h-full w-full bg-slate-800 relative p-4 flex flex-col items-center justify-center">
                                                <div className="w-16 h-16 bg-blue-500 rounded-2xl mb-4 shadow-lg flex items-center justify-center">
                                                    <Send className="w-8 h-8 text-white" />
                                                </div>
                                                <div className="w-24 h-4 bg-slate-700 rounded-full mb-2"></div>
                                                <div className="w-16 h-4 bg-slate-700 rounded-full"></div>
                                            </div>
                                        </div>

                                        {/* Surrounding "Pillars" */}
                                        <div className="absolute bottom-[10%] left-[10%] w-24 h-48 bg-yellow-400 rounded-t-full rounded-b-3xl shadow-xl z-10"></div>
                                        <div className="absolute bottom-[5%] right-[20%] w-32 h-64 bg-blue-500 rounded-t-full rounded-b-3xl shadow-xl z-30"></div>
                                        <div className="absolute bottom-[15%] left-[30%] w-20 h-32 bg-purple-500 rounded-t-full rounded-b-3xl shadow-xl -z-10"></div>
                                        <div className="absolute top-[20%] right-[10%] w-16 h-16 bg-orange-400 rounded-full shadow-lg animate-bounce duration-[3000ms]"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How it works */}
                <section id="how-it-works" className="py-24 bg-white border-y border-slate-100">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto mb-20">
                            <h2 className="text-3xl font-bold text-slate-900 mb-4">How to join our ecosystem</h2>
                            <p className="text-lg text-slate-600">Just 3 simple steps to start sharing data efficiently across all your devices.</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            {/* 3D Visual for Steps */}
                            <div className="relative order-2 md:order-1">
                                <div className="aspect-square bg-slate-50 rounded-[3rem] p-12 flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-50"></div>
                                    {/* Abstract Cluster */}
                                    <div className="grid grid-cols-2 gap-4 rotate-12 scale-110">
                                        <div className="w-24 h-48 bg-blue-600 rounded-full shadow-xl"></div>
                                        <div className="w-24 h-32 bg-yellow-400 rounded-full mt-16 shadow-xl"></div>
                                        <div className="w-24 h-40 bg-slate-800 rounded-full -mt-8 shadow-xl"></div>
                                        <div className="w-24 h-48 bg-purple-500 rounded-full shadow-xl"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Steps List */}
                            <div className="order-1 md:order-2 space-y-12">
                                <div className="flex gap-6">
                                    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-xl">1</div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-2">Start Transferring</h3>
                                        <p className="text-slate-600 leading-relaxed">Click the button to enter the ecosystem. No complex setup needed.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center text-yellow-600 font-bold text-xl">2</div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-2">Connect Devices</h3>
                                        <p className="text-slate-600 leading-relaxed">Use the Room Code or QR scanner to link your mobile and desktop instantly.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 font-bold text-xl">3</div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-2">Share Freely</h3>
                                        <p className="text-slate-600 leading-relaxed">Poof! You are ready to work smart with optimized text and file operations.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features - Cost Saver style */}
                <section id="features" className="py-24 bg-[#F9FAFB]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            <div>
                                <span className="text-blue-600 font-bold tracking-wider uppercase text-sm mb-2 block">Real-time Sync</span>
                                <h2 className="text-4xl font-bold text-slate-900 mb-6">Data transfer in a <br />smart way.</h2>
                                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                                    Powerful tool that helps you share text and files instantly. With advanced WebSockets and optimization algorithms, Eco2 analyzes your connection and ensures the fastest transfer speeds.
                                </p>
                                <button onClick={() => setIsBooting(true)} className="px-8 py-3 bg-white text-slate-900 font-semibold border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                                    Try now
                                </button>
                            </div>
                            {/* Feature Visual */}
                            <div className="relative">
                                <div className="aspect-square relative">
                                    {/* Abstract Compo */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="relative w-80 h-80">
                                            <div className="absolute top-0 right-0 w-40 h-80 bg-orange-400 rounded-full opacity-90 blur-[1px]"></div>
                                            <div className="absolute bottom-0 left-0 w-40 h-60 bg-blue-600 rounded-full opacity-90 blur-[1px] z-10"></div>
                                            <div className="absolute bottom-10 right-10 w-32 h-32 bg-slate-900 rounded-[2rem] z-20 shadow-2xl flex items-center justify-center">
                                                <Zap className="w-16 h-16 text-yellow-400" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Security Feature */}
                <section className="py-24 bg-white border-y border-slate-100">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            {/* Visual */}
                            <div className="order-2 md:order-1 relative">
                                <div className="aspect-square flex items-center justify-center">
                                    <div className="relative w-72 h-72">
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="h-32 bg-slate-400 rounded-t-full rounded-b-2xl"></div>
                                            <div className="h-48 -mt-16 bg-blue-500 rounded-t-full rounded-b-2xl"></div>
                                            <div className="h-32 bg-yellow-400 rounded-t-full rounded-b-2xl"></div>
                                            <div className="h-24 bg-purple-500 rounded-t-full rounded-b-2xl col-span-3 w-1/2 mx-auto"></div>
                                        </div>
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-32 bg-slate-900 rounded-2xl shadow-2xl border-4 border-slate-800 flex items-center justify-center z-10">
                                            <Shield className="w-10 h-10 text-white" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="order-1 md:order-2">
                                <span className="text-blue-600 font-bold tracking-wider uppercase text-sm mb-2 block">SmartSave</span>
                                <h2 className="text-4xl font-bold text-slate-900 mb-6">All your work is safe <br />with us.</h2>
                                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                                    We take your data security seriously. We use advanced encryption protocols to protect your files in transit. Your data is safe and secure with us.
                                </p>
                                <button onClick={() => setIsBooting(true)} className="px-8 py-3 bg-white text-slate-900 font-semibold border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                                    Try now
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Testimonials */}
                <section id="testimonials" className="py-24 bg-[#F9FAFB]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl font-bold text-slate-900 mb-4">Testimonials</h2>
                            <p className="text-lg text-slate-600">People love what we do and we want to let you know.</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                { quote: "Since using Eco2, our file sharing across teams has become seamless. The speed is incredible.", author: "Jack Sibire", role: "Lead Manager, Growio", stars: 5 },
                                { quote: "I recommend Eco2 to any business looking for improvement in their daily data workflows.", author: "Adele Mouse", role: "Product Manager, Mousio", stars: 5 },
                                { quote: "I can't imagine running our remote operations without it. It just works, every time.", author: "Ben Clock", role: "CTO, Clockwork", stars: 5 }
                            ].map((t, i) => (
                                <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                                    <p className="text-slate-700 font-medium text-lg mb-8 leading-relaxed">"{t.quote}"</p>
                                    <div className="flex text-blue-500 mb-4 gap-1">
                                        {[...Array(t.stars)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{t.author}</h4>
                                        <p className="text-sm text-slate-500">{t.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

            </main>

            {/* Footer */}
            <footer className="bg-white py-12 border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                                E
                            </div>
                            <span className="text-xl font-bold tracking-tight text-slate-900">Eco2</span>
                        </div>

                        <div className="flex gap-8">
                            <a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Privacy</a>
                            <a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Terms</a>
                            <a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Contact</a>
                        </div>

                        <p className="text-slate-400 text-sm">© 2026 Eco2 Inc. All rights reserved.</p>
                    </div>
                </div>
            </footer>

        </div>
    );
}
