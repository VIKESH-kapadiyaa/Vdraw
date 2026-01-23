"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, BookOpen, Activity, Layout, Users, Sparkles } from "lucide-react";

interface OnboardingTourProps {
    isOpen: boolean;
    onClose: () => void;
}

const STEPS = [
    {
        title: "Welcome to Vdraw OS",
        description: "The world's first Spatial Operating System for Education. An infinite canvas meeting powerful desktop-class tools.",
        icon: <Layout className="w-12 h-12 text-violet-400" />,
        image: "linear-gradient(135deg, #2e1065 0%, #000000 100%)"
    },
    {
        title: "Floating Tools",
        description: "Multitask like a pro. Open the Physics Lab, Book Library, or Diagram Builder as floating windows while you teach.",
        icon: <Activity className="w-12 h-12 text-blue-400" />,
        image: "linear-gradient(135deg, #172554 0%, #000000 100%)"
    },
    {
        title: "Teacher Superpowers",
        description: "Take control. Lock the board, force student focus, or use 'Eyes Up' mode to black out screens instantly.",
        icon: <Users className="w-12 h-12 text-emerald-400" />,
        image: "linear-gradient(135deg, #064e3b 0%, #000000 100%)"
    }
];

export default function OnboardingTour({ isOpen, onClose }: OnboardingTourProps) {
    const [step, setStep] = useState(0);

    if (!isOpen) return null;

    const handleNext = () => {
        if (step < STEPS.length - 1) {
            setStep(step + 1);
        } else {
            onClose();
        }
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
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Hero Section */}
                        <div
                            className="h-48 flex flex-col items-center justify-center relative overflow-hidden"
                            style={{ background: STEPS[step].image }}
                        >
                            <div className="relative z-10 p-6 bg-white/10 rounded-full border border-white/20 backdrop-blur-md shadow-xl mb-4">
                                {STEPS[step].icon}
                            </div>

                            {/* Decorative Blobs */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                        </div>

                        {/* Content */}
                        <div className="p-8 text-center">
                            <h2 className="text-2xl font-bold text-white mb-3">{STEPS[step].title}</h2>
                            <p className="text-neutral-400 leading-relaxed mb-8 min-h-[80px]">
                                {STEPS[step].description}
                            </p>

                            {/* Dots */}
                            <div className="flex justify-center gap-2 mb-8">
                                {STEPS.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-2 h-2 rounded-full transition-all duration-300 ${i === step ? 'bg-white w-6' : 'bg-white/20'}`}
                                    />
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-3 rounded-xl font-medium text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    Skip
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="flex-1 px-6 py-3 rounded-xl font-bold bg-white text-black hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
                                >
                                    {step === STEPS.length - 1 ? "Get Started" : "Next"} <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
