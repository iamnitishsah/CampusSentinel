"use client";
import {
    ArrowRight,
    Eye,
    EyeOff,
    Lock,
    User,
    UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const Signup = () => {
    const router = useRouter();
    // 1. UPDATED: Changed state to match backend model (first_name, last_name)
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        password_confirm: "",
        first_name: "",
        last_name: "",
    });
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        if (formData.password !== formData.password_confirm) {
            setError("Passwords do not match");
            setIsLoading(false);
            return;
        }

        try {
            // 2. UPDATED: Changed API endpoint to '/register/'
            const response = await fetch("http://localhost:8000/users/register/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                // 3. UPDATED: Sending payload that matches the UserCreateSerializer
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                }),
            });

            if (response.ok) {
                router.push("/auth/login");
            } else {
                const data = await response.json();
                // A simple way to display multiple errors from the backend
                const errorMessages = Object.entries(data)
                    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                    .join('; ');
                setError(errorMessages || "An error occurred.");
            }
        } catch {
            setError("An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >
    ) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="relative z-10 w-full max-w-4xl">
                <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl p-8">
                    <form className="space-y-6" onSubmit={handleFormSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* 4. UPDATED: Changed 'full_name' to 'first_name' and 'last_name' inputs */}
                            <div className="space-y-2">
                                <label
                                    htmlFor="first_name"
                                    className="text-sm font-medium text-gray-300 flex items-center"
                                >
                                    <User className="w-4 h-4 mr-2 text-emerald-400" />
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    id="first_name"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-800/50 border-2 border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all duration-300 backdrop-blur-sm"
                                    placeholder="Enter your First Name"
                                />
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="last_name"
                                    className="text-sm font-medium text-gray-300 flex items-center"
                                >
                                    <User className="w-4 h-4 mr-2 text-emerald-400" />
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    id="last_name"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-800/50 border-2 border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all duration-300 backdrop-blur-sm"
                                    placeholder="Enter your Last Name"
                                />
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="email"
                                    className="text-sm font-medium text-gray-300 flex items-center"
                                >
                                    <User className="w-4 h-4 mr-2 text-emerald-400" />
                                    Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    id="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-800/50 border-2 border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all duration-300 backdrop-blur-sm"
                                    placeholder="Enter your Email"
                                />
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="password"
                                    className="text-sm font-medium text-gray-300 flex items-center"
                                >
                                    <Lock className="w-4 h-4 mr-2 text-pink-400" />
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        name="password"
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-800/50 border-2 border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-pink-500 focus:outline-none focus:ring-4 focus:ring-pink-500/20 transition-all duration-300 backdrop-blur-sm pr-12"
                                        placeholder="Create a password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-5 h-5" />
                                        ) : (
                                            <Eye className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label
                                    htmlFor="password_confirm"
                                    className="text-sm font-medium text-gray-300 flex items-center"
                                >
                                    <Lock className="w-4 h-4 mr-2 text-red-400" />
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        id="password_confirm"
                                        name="password_confirm"
                                        required
                                        value={formData.password_confirm}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-800/50 border-2 border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-4 focus:ring-red-500/20 transition-all duration-300 backdrop-blur-sm pr-12"
                                        placeholder="Confirm your password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="w-5 h-5" />
                                        ) : (
                                            <Eye className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-t from-cyan-500 to-blue-900 text-white font-semibold py-3 px-6 rounded-xl hover:from-cyan-600 hover:to-blue-950 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center justify-center group"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    Create Account
                                    <UserPlus className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-700"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-900/40 px-2 text-yellow-400">
                Already have an account?
              </span>
                        </div>
                    </div>

                    <button
                        onClick={() => router.push("/auth/login")}
                        className="w-full bg-gray-800/50 border-2 border-gray-600 text-gray-300 font-semibold py-3 px-6 rounded-xl hover:bg-gray-700/50 hover:border-gray-500 focus:outline-none focus:ring-4 focus:ring-gray-500/20 transition-all duration-300 flex items-center justify-center"
                    >
                        Sign In
                        <ArrowRight className="w-4 h-4 ml-2 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Signup;