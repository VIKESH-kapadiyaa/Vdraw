"use client";
import React, { useEffect, useState } from "react";
import { Check, Star, Zap, ArrowLeft, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function PricingPage() {
    const [loading, setLoading] = useState(false);
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
    const [showSecretMessage, setShowSecretMessage] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Ensure user ID exists
        let id = localStorage.getItem("vdraw-user-id");
        if (!id) {
            id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
            localStorage.setItem("vdraw-user-id", id);
        }
        setUserId(id);
    }, []);

    const checkCoupon = () => {
        const code = couponCode.trim().toUpperCase();

        if (code === "KANISHKAGHOCHU") {
            setShowSecretMessage(true);
            return;
        }

        if (code === "ZEROVDRAW" || code === "50OFFVDRAW" || code === "LIVEONLY50") {
            setAppliedCoupon(code);
            let desc = "Discount Applied";
            if (code === "ZEROVDRAW") desc = "100% Discount";
            if (code === "50OFFVDRAW") desc = "50% Discount";
            if (code === "LIVEONLY50") desc = "Special Price: ₹50/mo";
            toast.success("Coupon Applied!", { description: desc });
        } else {
            toast.error("Invalid Coupon", { description: "Please check the code and try again." });
            setAppliedCoupon(null);
        }
    };

    const loadRazorpay = () => {
        return new Promise((resolve) => {
            if (typeof window !== 'undefined' && 'Razorpay' in window) {
                resolve(true);
                return;
            }
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleSuccess = async (planType: 'monthly' | 'annual' | 'daily' | 'exam') => {
        // Calculate Dates
        const now = new Date();
        let endDate = new Date();
        if (planType === 'monthly') {
            endDate.setMonth(now.getMonth() + 1);
        } else if (planType === 'annual') {
            endDate.setFullYear(now.getFullYear() + 1);
        } else if (planType === 'daily') {
            endDate.setDate(now.getDate() + 1);
        } else if (planType === 'exam') {
            endDate.setMonth(now.getMonth() + 3);
        }

        // Update Supabase
        try {
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    subscription_status: 'pro',
                    subscription_type: planType,
                    subscription_start_date: now.toISOString(),
                    subscription_end_date: endDate.toISOString(),
                    updated_at: now.toISOString()
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
    }

    const handlePayment = async (planType: 'monthly' | 'annual' | 'daily' | 'exam') => {
        if (!userId) return;

        let amount = 0;
        if (planType === 'monthly') amount = 199;
        if (planType === 'annual') amount = 1400;
        if (planType === 'daily') amount = 9;
        if (planType === 'exam') amount = 499;

        // Apply Coupon Logic
        if (appliedCoupon === "ZEROVDRAW") {
            amount = 0;
        } else if (appliedCoupon === "50OFFVDRAW") {
            amount = amount * 0.5;
        } else if (appliedCoupon === "LIVEONLY50" && planType === 'monthly') {
            amount = 50;
        }

        // If Free, bypass Razorpay
        if (amount === 0) {
            setLoading(true);
            await handleSuccess(planType);
            return;
        }

        if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
            toast.error("Payment Error: Missing API Key", { description: "Please restart your server to load the new keys." });
            console.error("Razorpay Key ID is undefined. Make sure NEXT_PUBLIC_RAZORPAY_KEY_ID is set in .env.local and server is restarted.");
            return;
        }

        const res = await loadRazorpay();
        if (!res) {
            toast.error("Razorpay SDK failed to load");
            return;
        }

        setLoading(true);

        const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount: amount * 100, // Amount in paise
            currency: "INR",
            name: "Vdraw Pro",
            description: `${planType.charAt(0).toUpperCase() + planType.slice(1)} Subscription`,
            image: "/vdraw-logo.png",
            handler: async function (response: any) {
                // Payment Success
                toast.success(`Payment Successful! ID: ${response.razorpay_payment_id}`);
                await handleSuccess(planType);
            },
            prefill: {
                name: "Test User",
                email: "test@example.com",
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
        <div className="min-h-screen w-full bg-neutral-950 text-white font-sans selection:bg-violet-500/30 relative flex flex-col overflow-y-auto overflow-x-hidden">

            {/* Background Ambient Blobs */}
            <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none" />

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
            <main className="flex-1 flex flex-col items-center justify-start p-6 pt-10 relative z-10 w-full max-w-7xl mx-auto">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center max-w-2xl mb-8"
                >
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
                        Unlock Limitless Creativity
                    </h1>
                    <p className="text-lg text-neutral-400">
                        You've hit the free limit. Upgrade to Pro to create unlimited rooms, access premium tools, and collaborate without boundaries.
                    </p>
                </motion.div>

                {/* Coupon Input */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10 w-full max-w-md flex flex-col items-center gap-2"
                >
                    <div className="flex w-full gap-2">
                        <input
                            type="text"
                            placeholder="Have a coupon? Enter code"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-neutral-500 focus:outline-none focus:border-violet-500 transition-colors uppercase"
                        />
                        <button
                            onClick={checkCoupon}
                            className="bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-3 rounded-xl transition-colors border border-white/5"
                        >
                            Apply
                        </button>
                    </div>
                    {appliedCoupon && (
                        <div className="text-emerald-400 text-sm font-medium flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            {appliedCoupon === "ZEROVDRAW" ? "100% OFF APPLIED" : appliedCoupon === "LIVEONLY50" ? "SPECIAL ₹50 PRICE" : "50% OFF APPLIED"}
                        </div>
                    )}
                </motion.div>

                {/* Pricing Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-7xl pb-20">

                    {/* Daily Pass */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-neutral-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 hover:border-violet-500/30 transition-all group flex flex-col"
                    >
                        <div className="mb-4 p-3 w-12 h-12 bg-neutral-800 rounded-2xl flex items-center justify-center">
                            <Zap className="w-6 h-6 text-yellow-400" />
                        </div>
                        <h3 className="text-xl font-medium text-neutral-300">Daily Pass</h3>
                        <div className="mt-2 mb-4">
                            <span className="text-3xl font-bold text-white">₹9</span>
                            <span className="text-neutral-500 ml-2">/ day</span>
                        </div>
                        <ul className="space-y-3 mb-6 flex-1 text-sm">
                            <Feature text="24h Pro Access" />
                            <Feature text="Unlimited Rooms" />
                            <Feature text="No Auto-Renew" />
                        </ul>
                        <button disabled={loading} onClick={() => handlePayment('daily')} className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold transition-colors border border-white/5">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Buy Pass"}
                        </button>
                    </motion.div>

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
                            {appliedCoupon ? (
                                <div className="flex flex-col">
                                    <span className="text-neutral-500 line-through text-lg">₹199</span>
                                    <div className="flex items-baseline">
                                        <span className="text-4xl font-bold text-white">
                                            {appliedCoupon === "ZEROVDRAW" ? "₹0" : appliedCoupon === "LIVEONLY50" ? "₹50" : "₹99"}
                                        </span>
                                        <span className="text-neutral-500 ml-2">/ month</span>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <span className="text-4xl font-bold text-white">₹199</span>
                                    <span className="text-neutral-500 ml-2">/ month</span>
                                </div>
                            )}
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
                            {appliedCoupon && appliedCoupon !== "LIVEONLY50" ? (
                                <div className="flex flex-col">
                                    <span className="text-neutral-500 line-through text-lg">₹1400</span>
                                    <div className="flex items-baseline">
                                        <span className="text-4xl font-bold text-white">
                                            {appliedCoupon === "ZEROVDRAW" ? "₹0" : "₹700"}
                                        </span>
                                        <span className="text-neutral-500 ml-2">/ year</span>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <span className="text-4xl font-bold text-white">₹1400</span>
                                    <span className="text-violet-200/60 line-through text-lg ml-3">₹2400</span>
                                </div>
                            )}
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

                    {/* Exam Season Pass */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-neutral-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 hover:border-fuchsia-500/30 transition-all group flex flex-col relative overflow-hidden"
                    >
                        <div className="absolute -right-10 -top-10 w-24 h-24 bg-fuchsia-500/20 blur-2xl rounded-full pointer-events-none group-hover:bg-fuchsia-500/40 transition-colors" />
                        <div className="mb-4 p-3 w-12 h-12 bg-neutral-800 rounded-2xl flex items-center justify-center z-10">
                            <Star className="w-6 h-6 text-fuchsia-400" />
                        </div>
                        <h3 className="text-xl font-medium text-neutral-300">Exam Pass</h3>
                        <div className="mt-2 mb-4">
                            <span className="text-3xl font-bold text-white">₹499</span>
                            <span className="text-neutral-500 ml-2">/ 3 mo</span>
                        </div>
                        <ul className="space-y-3 mb-6 flex-1 text-sm">
                            <Feature text="3 Months Access" />
                            <Feature text="Perfect for Semesters" />
                            <Feature text="Save vs Monthly" iconColor="text-emerald-400" />
                        </ul>
                        <button disabled={loading} onClick={() => handlePayment('exam')} className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold transition-colors border border-white/5 z-10">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Get Season Pass"}
                        </button>
                    </motion.div>

                </div>
            </main>

            {/* Secret Message Modal */}
            <AnimatePresence>
                {showSecretMessage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                        onClick={() => setShowSecretMessage(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-neutral-900 border border-violet-500/30 p-8 rounded-3xl max-w-lg text-center relative shadow-2xl shadow-violet-500/20"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setShowSecretMessage(false)}
                                className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="text-5xl mb-6">🦖</div>
                            <h3 className="text-2xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                                Not to flirt or anything...
                            </h3>
                            <p className="text-xl text-neutral-300 font-medium leading-relaxed">
                                "But if you were a dinosaur, you'd be a gorgeousaurus."
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
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
