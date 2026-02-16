import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User as UserIcon, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../pages/eco2apps/connect/DataTransfer.css";
import { useGoogleLogin } from '@react-oauth/google';


export default function Login() {
    const navigate = useNavigate();
    const { login, guestMode } = useAuth();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setGoogleLoading(true);
            console.log("Frontend: Google Login Success:", tokenResponse);
            try {
                console.log("Frontend: Initiating backend fetch...");
                // Note: We are sending 'access_token' but the backend expects key 'token'
                const res = await fetch('http://localhost:8000/api/user/google/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        token: tokenResponse.access_token,
                    }),
                });

                console.log("Frontend: Fetch completed, status:", res.status);
                const data = await res.json();
                console.log("Frontend: Backend Response Body:", data);

                if (res.ok) {
                    console.log("Frontend: Login successful, calling auth.login()...");
                    login(data.access, data);
                    console.log("Frontend: Navigating to /...");
                    navigate('/');
                } else {
                    console.error("Frontend: Backend returned error:", data);
                    setError(data.error || 'Google login failed');
                    setGoogleLoading(false);
                }
            } catch (err) {
                console.error("Frontend: Fetch/Login Error:", err);
                setError('An error occurred during Google login: ' + err.message);
                setGoogleLoading(false);
            }
        },
        onError: () => {
            console.error("Frontend: Google Login Failed");
            setError('Google Login Failed');
            setGoogleLoading(false);
        }
    });

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
            navigate('/'); // Redirect to home page
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
        navigate('/'); // Redirect to home page
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 
                    bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 
                    dark:from-slate-900 dark:via-purple-950 dark:to-slate-900 
                    transition-colors duration-300">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
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
                                Or continue with
                            </span>
                        </div>
                    </div>

                    {/* Google Login Button */}
                    <div className="flex justify-center mb-6">
                        <button
                            type="button"
                            onClick={() => googleLogin()}
                            disabled={googleLoading}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-200"
                        >
                            {googleLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-slate-600 dark:text-slate-300 font-medium">Signing in...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            fill="#4285F4"
                                        />
                                        <path
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            fill="#34A853"
                                        />
                                        <path
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            fill="#FBBC05"
                                        />
                                        <path
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            fill="#EA4335"
                                        />
                                    </svg>
                                    <span className="text-slate-700 dark:text-slate-200 font-medium">Continue with Google</span>
                                </>
                            )}
                        </button>
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
