"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Github, ArrowRight, Zap } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Basic Magic Link Login
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/dashboard`,
            },
        });

        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Magic link sent! Check your email.");
        }
        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/dashboard`
            }
        });
        if (error) {
            toast.error(error.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-violet-600/10 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] bg-fuchsia-600/10 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, type: "spring" }}
                className="w-full max-w-md relative z-10"
            >
                {/* Logo Area */}
                <div className="text-center mb-8">
                    <div className="inline-block relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 blur-xl opacity-50 rounded-full" />
                        <div className="relative bg-black rounded-2xl p-4 border border-white/10 shadow-2xl">
                            <Zap className="w-8 h-8 text-white fill-violet-500" />
                        </div>
                    </div>
                    <h1 className="mt-6 text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-neutral-200 to-neutral-500 tracking-tight">
                        Welcome to Vdraw
                    </h1>
                    <p className="mt-2 text-neutral-400">Sign in to sync your spatial workspace.</p>
                </div>

                {/* Login Card */}
                <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2 ml-1">Email Address</label>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity blur opacity-20" />
                                <div className="relative flex items-center bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 focus-within:border-violet-500/50 transition-colors">
                                    <Mail className="w-5 h-5 text-neutral-500 mr-3" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@example.com"
                                        className="bg-transparent w-full text-white placeholder:text-neutral-600 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            disabled={loading}
                            type="submit"
                            className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue with Email <ArrowRight className="w-4 h-4" /></>}
                        </button>
                    </form>

                    <div className="my-6 flex items-center gap-4">
                        <div className="h-px bg-white/5 flex-1" />
                        <span className="text-xs text-neutral-500 font-medium">OR</span>
                        <div className="h-px bg-white/5 flex-1" />
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium py-3.5 rounded-xl transition-all flex items-center justify-center gap-3 group"
                    >
                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.2 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                    </button>

                    {/* Footer */}
                    <p className="mt-8 text-center text-xs text-neutral-600">
                        By continuing, you agree to our <span className="text-neutral-400 hover:text-white cursor-pointer underline">Terms</span> and <span className="text-neutral-400 hover:text-white cursor-pointer underline">Privacy Policy</span>.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
