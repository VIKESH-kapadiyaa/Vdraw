"use client";
import React, { useEffect, useState } from "react";
import { Check, Star, Zap, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

export default function PricingPage() {
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Ensure user ID exists
        let id = localStorage.getItem("vdraw-user-id");
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem("vdraw-user-id", id);
        }
        setUserId(id);
    }, []);

    const loadRazorpay = () => {
        return new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePayment = async (planType: 'monthly' | 'annual') => {
        if (!userId) return;

        const res = await loadRazorpay();
        if (!res) {
            toast.error("Razorpay SDK failed to load");
            return;
        }

        setLoading(true);

        const amount = planType === 'monthly' ? 199 : 1400; // INR
        const options = {
            key: "rzp_test_RyCvnQbt3IlAbf", // YOUR TEST KEY
            amount: amount * 100, // Amount in paise
            currency: "INR",
            name: "Vdraw Pro",
            description: `${planType === 'monthly' ? 'Monthly' : 'Annual'} Subscription`,
            image: "/vdraw-logo.png",
            handler: async function (response: any) {
                // Payment Success
                toast.success(`Payment Successful! ID: ${response.razorpay_payment_id}`);

                // Update Supabase
                try {
                    const { error } = await supabase
                        .from('profiles')
                        .upsert({
                            id: userId,
                            subscription_status: 'pro',
                            updated_at: new Date().toISOString()
                        });

                    if (error) throw error;

                    toast.success("Account Upgraded! Redirecting...");
                    setTimeout(() => {
                        router.push('/'); // Go back to create room
                    }, 1500);

                } catch (err) {
                    toast.error("Database update failed. Contact support.");
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            },
            prefill: {
                name: "Vdraw User",
                email: "user@example.com",
                contact: "9999999999"
            },
            theme: {
                color: "#8b5cf6"
            }
        };

        // @ts-ignore
        const rzp1 = new window.Razorpay(options);
        rzp1.on('payment.failed', function (response: any) {
            toast.error(response.error.description);
            setLoading(false);
        });
        rzp1.open();
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-violet-500/30 relative overflow-hidden flex flex-col">

            {/* Background Ambient Blobs */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none" />

            {/* Navbar */}
            <nav className="p-6 md:px-12 flex items-center justify-between relative z-10">
                <Link href="/" className="flex items-center gap-2 text-neutral-400 hover:text-white transition group">
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium">Back to Home</span>
                </Link>
                <div className="font-bold text-xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                    Vdraw<span className="text-white">Pro</span>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center max-w-2xl mb-12"
                >
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
                        Unlock Limitless Creativity
                    </h1>
                    <p className="text-lg text-neutral-400">
                        You've hit the free limit. Upgrade to Pro to create unlimited rooms, access premium tools, and collaborate without boundaries.
                    </p>
                </motion.div>

                {/* Pricing Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">

                    {/* Monthly Plan */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-neutral-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 hover:border-violet-500/30 transition-all group flex flex-col"
                    >
                        <div className="mb-6 p-3 w-14 h-14 bg-neutral-800 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Zap className="w-7 h-7 text-white" />
                        </div>
                        <h3 className="text-xl font-medium text-neutral-300">Monthly</h3>
                        <div className="mt-2 mb-6">
                            <span className="text-4xl font-bold text-white">₹199</span>
                            <span className="text-neutral-500 ml-2">/ month</span>
                        </div>
                        <ul className="space-y-4 mb-8 flex-1">
                            <Feature text="Unlimited Rooms" />
                            <Feature text="Basic Collaboration" />
                            <Feature text="Pro Tools Access" />
                        </ul>
                        <button
                            disabled={loading}
                            onClick={() => handlePayment('monthly')}
                            className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold transition-colors disabled:opacity-50 border border-white/5"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Choose Monthly"}
                        </button>
                    </motion.div>

                    {/* Annual Plan */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gradient-to-b from-violet-900/20 to-neutral-900/50 backdrop-blur-xl border border-violet-500/30 rounded-3xl p-8 relative overflow-hidden flex flex-col"
                    >
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
                        <div className="absolute top-4 right-4 bg-fuchsia-500/20 text-fuchsia-300 text-xs font-bold px-3 py-1 rounded-full border border-fuchsia-500/30">
                            BEST VALUE
                        </div>

                        <div className="mb-6 p-3 w-14 h-14 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                            <Star className="w-7 h-7 text-white fill-white" />
                        </div>

                        <h3 className="text-xl font-medium text-white">Annual</h3>
                        <div className="mt-2 mb-6">
                            <span className="text-4xl font-bold text-white">₹1400</span>
                            <span className="text-violet-200/60 line-through text-lg ml-3">₹2400</span>
                        </div>
                        <ul className="space-y-4 mb-8 flex-1">
                            <Feature text="Everything in Monthly" />
                            <Feature text="Priority Support" />
                            <Feature text="Early Access Features" />
                            <Feature text="Save 40% Yearly" iconColor="text-fuchsia-400" />
                        </ul>
                        <button
                            disabled={loading}
                            onClick={() => handlePayment('annual')}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold shadow-lg shadow-violet-900/40 transition-all transform active:scale-95"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Get Annual Access"}
                        </button>
                    </motion.div>

                </div>
            </main>
        </div>
    );
}

function Feature({ text, iconColor = "text-violet-400" }: { text: string, iconColor?: string }) {
    return (
        <li className="flex items-center gap-3">
            <Check className={`w-5 h-5 ${iconColor}`} />
            <span className="text-neutral-300">{text}</span>
        </li>
    );
}
