import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, UserPlus, AtSign } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../pages/DataTransfer.css";

export default function Signup() {
    const navigate = useNavigate();
    const { login, guestMode } = useAuth();
    const [formData, setFormData] = useState({
        username: "",
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        // Clear error for this field when user types
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: "" });
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (formData.username.length < 3) {
            newErrors.username = "Username must be at least 3 characters";
        }

        if (formData.name.length < 2) {
            newErrors.name = "Name must be at least 2 characters";
        }

        if (!formData.email.includes("@")) {
            newErrors.email = "Please enter a valid email";
        }

        if (formData.password.length < 6) {
            newErrors.password = "Password must be at least 6 characters";
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
        }

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newErrors = validateForm();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);
        setErrors({}); // Clear all errors

        try {
            // TODO: Replace with actual backend API endpoint
            const response = await fetch('http://localhost:8000/api/user/signup/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: formData.username,
                    name: formData.name,
                    email: formData.email,
                    password: formData.password
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                setErrors({ general: errorData.message || 'Signup failed' });
                setLoading(false);
                return;
            }

            const data = await response.json();
            // Auto-login after successful signup
            login(data.access, data.user);
            navigate('/transfer');
        } catch (err) {
            setErrors({ general: 'An error occurred during signup' });
            setLoading(false);
        }
    };

    const handleGuestMode = () => {
        // Generate random guest name
        const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const guestName = `Guest_${randomId}`;

        guestMode(guestName);
        navigate('/transfer');
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8
                    bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 
                    dark:from-slate-900 dark:via-purple-950 dark:to-slate-900 
                    transition-colors duration-300">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                        style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                        <UserPlus className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                        Create Account
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Start sharing data in seconds
                    </p>
                </div>

                {/* Signup Form */}
                <div className="glass-card rounded-2xl p-8">
                    {/* General Error Message */}
                    {errors.general && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Username Field */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Username
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <AtSign className="w-5 h-5 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    required
                                    placeholder="johndoe123"
                                    className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 
                           border ${errors.username ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-lg
                           text-slate-900 dark:text-slate-100 placeholder-slate-400
                           focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400
                           transition-all duration-200`}
                                />
                            </div>
                            {errors.username && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username}</p>
                            )}
                        </div>

                        {/* Name Field */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Full Name
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="w-5 h-5 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="John Doe"
                                    className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 
                           border ${errors.name ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-lg
                           text-slate-900 dark:text-slate-100 placeholder-slate-400
                           focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400
                           transition-all duration-200`}
                                />
                            </div>
                            {errors.name && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                            )}
                        </div>

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
                                    className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 
                           border ${errors.email ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-lg
                           text-slate-900 dark:text-slate-100 placeholder-slate-400
                           focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400
                           transition-all duration-200`}
                                />
                            </div>
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                            )}
                        </div>

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
                                    className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 
                           border ${errors.password ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-lg
                           text-slate-900 dark:text-slate-100 placeholder-slate-400
                           focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400
                           transition-all duration-200`}
                                />
                            </div>
                            {errors.password && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
                            )}
                        </div>

                        {/* Confirm Password Field */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="w-5 h-5 text-slate-400" />
                                </div>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    placeholder="••••••••"
                                    className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 
                           border ${errors.confirmPassword ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-lg
                           text-slate-900 dark:text-slate-100 placeholder-slate-400
                           focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400
                           transition-all duration-200`}
                                />
                            </div>
                            {errors.confirmPassword && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword}</p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary flex items-center justify-center gap-2 py-3 mt-6"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Creating account...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    Create Account
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
                        <User className="w-5 h-5" />
                        Continue as Guest
                    </button>
                </div>

                {/* Login Link */}
                <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
                    Already have an account?{" "}
                    <Link to="/login" className="text-purple-600 dark:text-purple-400 font-medium hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
