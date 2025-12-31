"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Star, Zap, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    onSuccess: () => void;
}

export default function PricingModal({ isOpen, onClose, userId, onSuccess }: PricingModalProps) {
    const [loading, setLoading] = useState(false);

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
        const res = await loadRazorpay();
        if (!res) {
            toast.error("Razorpay SDK failed to load");
            return;
        }

        setLoading(true);

        const amount = planType === 'monthly' ? 199 : 1400; // INR
        const options = {
            key: "rzp_test_PLACEHOLDER_KEY", // REPLACE WITH YOUR KEY
            amount: amount * 100, // Amount in paise
            currency: "INR",
            name: "Vdraw Pro",
            description: `${planType === 'monthly' ? 'Monthly' : 'Annual'} Subscription`,
            image: "/vdraw-logo.png", // Optional
            handler: async function (response: any) {
                // Payment Success
                toast.success(`Payment Successful! Payment ID: ${response.razorpay_payment_id}`);

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

                    onSuccess();
                    onClose();
                } catch (err) {
                    toast.error("Database update failed. Please contact support.");
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
            notes: {
                address: "Vdraw HQ"
            },
            theme: {
                color: "#8b5cf6" // Violet-500
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
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative z-10 w-full max-w-4xl bg-neutral-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 bg-neutral-800 rounded-full text-neutral-400 hover:text-white z-20"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Left Side: Visual/Context */}
                        <div className="hidden md:flex flex-col justify-between p-8 w-2/5 bg-gradient-to-br from-violet-900/40 via-neutral-900 to-fuchsia-900/40 relative overflow-hidden">
                            <div className="relative z-10">
                                <h2 className="text-3xl font-bold text-white mb-2">Upgrade to Pro</h2>
                                <p className="text-violet-200 opacity-80">Unlock the full power of Vdraw.</p>
                            </div>

                            <div className="space-y-4 relative z-10">
                                <FeatureItem text="Unlimited Rooms" />
                                <FeatureItem text="Export to PDF/SVG" />
                                <FeatureItem text="Priority Support" />
                                <FeatureItem text="Early Access Features" />
                            </div>

                            {/* Decorative Blobs */}
                            <div className="absolute top-0 left-0 w-64 h-64 bg-violet-600/30 rounded-full blur-[80px]" />
                            <div className="absolute bottom-0 right-0 w-64 h-64 bg-fuchsia-600/30 rounded-full blur-[80px]" />
                        </div>

                        {/* Right Side: Plans */}
                        <div className="flex-1 p-8 bg-neutral-900/80">
                            <h3 className="text-xl font-bold text-white mb-6 md:hidden">Upgrade Plan</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full items-center">
                                {/* Monthly Card */}
                                <div className="border border-white/10 rounded-2xl p-6 hover:bg-white/5 transition-colors flex flex-col items-center text-center relative group">
                                    <div className="mb-4 p-3 bg-neutral-800 rounded-xl group-hover:bg-violet-500/20 group-hover:text-violet-400 transition-colors">
                                        <Zap className="w-6 h-6 text-neutral-400 group-hover:text-violet-400" />
                                    </div>
                                    <h4 className="text-lg font-bold text-white">Monthly</h4>
                                    <div className="text-3xl font-bold text-white my-2">₹199</div>
                                    <p className="text-sm text-neutral-500 mb-6">Billed every month</p>
                                    <button
                                        disabled={loading}
                                        onClick={() => handlePayment('monthly')}
                                        className="w-full py-2 rounded-lg bg-neutral-800 text-white font-medium hover:bg-neutral-700 transition-all border border-neutral-700"
                                    >
                                        Choose Monthly
                                    </button>
                                </div>

                                {/* Annual Card (Special) */}
                                <div className="border border-violet-500/50 rounded-2xl p-6 bg-violet-500/10 relative overflow-hidden flex flex-col items-center text-center shadow-lg shadow-violet-900/20">
                                    <div className="absolute top-0 right-0 bg-fuchsia-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                                        SAVE 40%
                                    </div>
                                    <div className="mb-4 p-3 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl text-white shadow-lg">
                                        <Star className="w-6 h-6 fill-current" />
                                    </div>
                                    <h4 className="text-lg font-bold text-white">Annual</h4>
                                    <div className="text-3xl font-bold text-white my-2">₹1400</div>
                                    <p className="text-sm text-violet-300/70 mb-6">Billed yearly</p>
                                    <button
                                        disabled={loading}
                                        onClick={() => handlePayment('annual')}
                                        className="w-full py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold shadow-lg hover:shadow-violet-500/25 active:scale-95 transition-all"
                                    >
                                        Claim Offer
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function FeatureItem({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="p-1 bg-violet-500/20 rounded-full text-violet-300">
                <Check className="w-3 h-3" />
            </div>
            <span className="text-sm font-medium text-neutral-300">{text}</span>
        </div>
    );
}
