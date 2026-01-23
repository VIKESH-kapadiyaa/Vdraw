"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Play, Pause, RotateCcw, X, GripHorizontal, Trophy, PartyPopper } from "lucide-react";

interface ClassroomToolkitProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ClassroomToolkit({ isOpen, onClose }: ClassroomToolkitProps) {
    const [activeTab, setActiveTab] = useState<'timer' | 'stopwatch'>('timer');
    const [time, setTime] = useState(0); // in seconds
    const [isRunning, setIsRunning] = useState(false);
    const [initialTime, setInitialTime] = useState(300); // Default 5 mins for timer

    // Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRunning) {
            interval = setInterval(() => {
                setTime(prev => {
                    if (activeTab === 'timer') {
                        if (prev <= 1) {
                            setIsRunning(false);
                            return 0;
                        }
                        return prev - 1;
                    } else {
                        return prev + 1;
                    }
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning, activeTab]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleStart = () => {
        if (activeTab === 'timer' && time === 0) setTime(initialTime);
        setIsRunning(true);
    };

    const handleReset = () => {
        setIsRunning(false);
        setTime(activeTab === 'timer' ? initialTime : 0);
    };

    const setTimerDuration = (mins: number) => {
        setIsRunning(false);
        setInitialTime(mins * 60);
        setTime(mins * 60);
    };

    if (!isOpen) return null;

    return (
        <motion.div
            layoutId="classroom-toolkit"
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 20 }}
            drag
            dragMomentum={false}
            className="fixed top-24 right-4 z-40 w-64 bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
            {/* Header */}
            <div className="h-10 bg-white/5 border-b border-white/5 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing">
                <div className="flex items-center gap-2 text-neutral-400">
                    <GripHorizontal className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">Toolkit</span>
                </div>
                <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Tabs */}
                <div className="flex bg-black/20 rounded-lg p-1 mb-4">
                    <button
                        onClick={() => { setActiveTab('timer'); setIsRunning(false); setTime(initialTime); }}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'timer' ? 'bg-violet-600 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
                    >
                        Timer
                    </button>
                    <button
                        onClick={() => { setActiveTab('stopwatch'); setIsRunning(false); setTime(0); }}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'stopwatch' ? 'bg-violet-600 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
                    >
                        Stopwatch
                    </button>
                </div>

                {/* Display */}
                <div className="text-center mb-6">
                    <div className="text-5xl font-mono font-bold text-white tracking-widest tabular-nums font-variant-numeric: tabular-nums">
                        {formatTime(time)}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1 uppercase tracking-widest">{activeTab}</div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4 mb-4">
                    <button
                        onClick={handleReset}
                        className="p-3 rounded-full bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white transition-all border border-white/5"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setIsRunning(!isRunning)}
                        className={`p-4 rounded-full transition-all shadow-lg ${isRunning ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50' : 'bg-emerald-500 text-black border border-emerald-400 hover:scale-105'}`}
                    >
                        {isRunning ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                    </button>
                    {activeTab === 'timer' && (
                        <div className="absolute top-[88px] right-4 flex flex-col gap-1">
                            {/* Quick presets */}
                            {[5, 15, 30].map(m => (
                                <button key={m} onClick={() => setTimerDuration(m)} className="text-[10px] bg-white/5 hover:bg-white/10 text-neutral-400 px-2 py-1 rounded border border-white/5">{m}m</button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="border-t border-white/10 pt-3 flex gap-2">
                    <button className="flex-1 py-2 bg-gradient-to-r from-pink-500/20 to-rose-500/20 border border-pink-500/20 text-pink-300 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-pink-500/30 transition-all">
                        <PartyPopper className="w-3 h-3" /> Celebrate
                    </button>
                    <button className="flex-1 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/20 text-amber-300 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-amber-500/30 transition-all">
                        <Trophy className="w-3 h-3" /> Winner
                    </button>
                </div>

            </div>
        </motion.div>
    );
}
