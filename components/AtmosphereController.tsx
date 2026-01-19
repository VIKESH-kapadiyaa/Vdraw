"use client";
import React, { useState, useEffect } from "react";
import { CloudRain, Zap, TreePalm, Sliders, Volume2, VolumeX, Maximize2, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AtmosphereController() {
    const [activePreset, setActivePreset] = useState<"none" | "rain" | "cyber" | "zen">("none");
    const [isPlaying, setIsPlaying] = useState(false);
    const [isZenMode, setIsZenMode] = useState(false);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    // Audio Sources (Using public domain / free assets for demo)
    const PRESETS = {
        rain: {
            audio: "/sounds/rain.mp3",
            bg: "radial-gradient(circle at 50% 50%, #1a1a2e 0%, #000000 100%)",
            overlayClass: "rain-overlay", // We will add CSS for this
            icon: <CloudRain className="w-5 h-5 text-blue-400" />,
            label: "Rainy Cafe"
        },
        cyber: {
            audio: "/sounds/wind.mp3", // Using wind as ambient/cyber proxy
            bg: "linear-gradient(45deg, #0f0c29, #302b63, #24243e)",
            overlayClass: "cyber-grid",
            icon: <Zap className="w-5 h-5 text-fuchsia-400" />,
            label: "Cyber Grid"
        },
        zen: {
            audio: "/sounds/ocean.mp3",
            bg: "linear-gradient(to top, #e6e9f0 0%, #eef1f5 100%)", // Light theme zen
            overlayClass: "zen-garden",
            icon: <TreePalm className="w-5 h-5 text-emerald-400" />,
            label: "Zen Garden"
        }
    };

    const safePlay = () => {
        if (!audioRef.current) return;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
            playPromise.catch((error) => {
                if (error.name === 'AbortError') {
                    // Auto-play was prevented or playback was interrupted by a new load request. 
                    // This is expected if the user clicks fast.
                    return;
                }
                console.error("Audio Playback Error:", error);
            });
        }
    };

    const toggleAudio = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            safePlay();
        }
        setIsPlaying(!isPlaying);
    };

    const selectPreset = (key: "none" | "rain" | "cyber" | "zen") => {
        setActivePreset(key);
        if (key === 'none') {
            if (audioRef.current) {
                audioRef.current.pause();
                setIsPlaying(false);
            }
        } else {
            // Change audio track
            if (audioRef.current) {
                // Pause before changing source to be safe
                audioRef.current.pause();
                audioRef.current.src = PRESETS[key].audio;
                audioRef.current.volume = 0.5;
                audioRef.current.load(); // Explicitly load new source
                safePlay();
                setIsPlaying(true);
            }
        }
    };

    // Toggle Zen Mode (Hides other UI elements via global class or direct DOM manipulation - for now simplified)
    useEffect(() => {
        const root = document.documentElement;
        if (isZenMode) {
            document.body.classList.add('zen-mode-active');
        } else {
            document.body.classList.remove('zen-mode-active');
        }
    }, [isZenMode]);

    return (
        <>
            <audio
                ref={audioRef}
                loop
                // Local files don't need crossOrigin
                onError={(e) => console.error("Audio playback error (Check console for details):", e.currentTarget.error)}
            />

            {/* Background Layer */}
            {activePreset !== 'none' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`fixed inset-0 pointer-events-none z-0 ${PRESETS[activePreset as keyof typeof PRESETS]?.overlayClass || ''}`}
                    style={{
                        background: PRESETS[activePreset as keyof typeof PRESETS]?.bg,
                        mixBlendMode: activePreset === 'zen' ? 'normal' : 'overlay'
                    }}
                />
            )}

            {/* Floating Controller */}
            <motion.div
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }} // Keep it mostly static but draggable slightly
                className="fixed top-20 right-20 z-50 flex flex-col items-end gap-2"
            >
                <div className="bg-neutral-900/80 backdrop-blur-md border border-white/10 p-2 rounded-2xl shadow-xl flex items-center gap-2">
                    <button onClick={() => selectPreset(activePreset === 'none' ? 'rain' : 'none')} className={`p-2 rounded-xl transition-all ${activePreset !== 'none' ? 'bg-violet-600/20 text-violet-400' : 'text-neutral-500 hover:text-white'}`}>
                        <Sliders className="w-5 h-5" />
                    </button>

                    <AnimatePresence>
                        {activePreset !== 'none' && (
                            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="flex items-center gap-1 overflow-hidden">
                                {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((key) => (
                                    <button
                                        key={key}
                                        onClick={() => selectPreset(key)}
                                        className={`p-2 rounded-lg transition-colors ${activePreset === key ? 'bg-white/10' : 'hover:bg-white/5'} tooltip`}
                                        title={PRESETS[key].label}
                                    >
                                        {PRESETS[key].icon}
                                    </button>
                                ))}
                                <div className="w-px h-6 bg-white/10 mx-1" />
                                <button onClick={toggleAudio} className={`p-2 rounded-lg ${isPlaying ? 'text-green-400' : 'text-neutral-500'}`}>
                                    {isPlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button onClick={() => setIsZenMode(!isZenMode)} className={`p-2 rounded-xl transition-all ${isZenMode ? 'bg-blue-500 text-white' : 'text-neutral-500 hover:text-white'}`} title="Zen Mode">
                        {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            </motion.div>
        </>
    );
}
