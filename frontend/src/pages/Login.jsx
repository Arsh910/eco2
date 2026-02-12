import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User as UserIcon, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../pages/DataTransfer.css";

export default function Login() {
    const navigate = useNavigate();
    const { login, guestMode } = useAuth();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // TODO: Replace with actual backend API endpoint
            const response = await fetch('http://localhost:8000/api/user/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const data = await response.json();
            login(data.access, data.user); // Store token and user info
            navigate('/transfer'); // Redirect to transfer page
        } catch (err) {
            setError('Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    const handleGuestMode = () => {
        // Generate random guest name
        const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const guestName = `Guest_${randomId}`;

        guestMode(guestName); // Set auth state to guest mode
        navigate('/transfer'); // Redirect to transfer page
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 
                    bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 
                    dark:from-slate-900 dark:via-purple-950 dark:to-slate-900 
                    transition-colors duration-300">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                        style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                        <UserIcon className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                        Welcome Back
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Sign in to continue sharing data
                    </p>
                </div>

                {/* Login Form */}
                <div className="glass-card rounded-2xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email Field */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="w-5 h-5 text-slate-400" />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    placeholder="you@example.com"
                                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 
                           border border-slate-200 dark:border-slate-700 rounded-lg
                           text-slate-900 dark:text-slate-100 placeholder-slate-400
                           focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400
                           transition-all duration-200"
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}

                        {/* Password Field */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="w-5 h-5 text-slate-400" />
                                </div>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 
                           border border-slate-200 dark:border-slate-700 rounded-lg
                           text-slate-900 dark:text-slate-100 placeholder-slate-400
                           focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400
                           transition-all duration-200"
                                />
                            </div>
                        </div>

                        {/* Forgot Password */}
                        <div className="flex justify-end">
                            <button type="button" className="text-sm text-purple-600 dark:text-purple-400 hover:underline">
                                Forgot password?
                            </button>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary flex items-center justify-center gap-2 py-3"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-5 h-5" />
                                    Sign In
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                Or
                            </span>
                        </div>
                    </div>

                    {/* Guest Mode Button */}
                    <button
                        type="button"
                        onClick={handleGuestMode}
                        className="w-full btn-secondary py-3 flex items-center justify-center gap-2"
                    >
                        <UserIcon className="w-5 h-5" />
                        Continue as Guest
                    </button>
                </div>

                {/* Sign Up Link */}
                <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
                    Don't have an account?{" "}
                    <Link to="/signup" className="text-purple-600 dark:text-purple-400 font-medium hover:underline">
                        Sign up for free
                    </Link>
                </p>
            </div>
        </div>
    );
}
