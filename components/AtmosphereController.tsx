"use client";
import React, { useState, useEffect } from "react";
import { CloudRain, Zap, TreePalm, Sliders, Volume2, VolumeX, Maximize2, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";

export default function AtmosphereController({ isLowBandwidth }: { isLowBandwidth?: boolean }) {
    const { activePreset, setActivePreset, isZenMode, toggleZenMode } = useStore();
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    // Auto-disable on Low Bandwidth
    useEffect(() => {
        if (isLowBandwidth) {
            setActivePreset('none');
        }
    }, [isLowBandwidth, setActivePreset]);

    const PRESETS = {
        rain: {
            audio: "/sounds/rain.mp3",
            bg: "radial-gradient(circle at 50% 50%, #1a1a2e 0%, #000000 100%)",
            overlayClass: "rain-overlay",
            icon: <CloudRain className="w-5 h-5 text-blue-400" />,
            label: "Rainy Cafe"
        },
        cyber: {
            audio: "/sounds/wind.mp3",
            bg: "linear-gradient(45deg, #0f0c29, #302b63, #24243e)",
            overlayClass: "cyber-grid",
            icon: <Zap className="w-5 h-5 text-fuchsia-400" />,
            label: "Cyber Grid"
        },
        zen: {
            audio: "/sounds/ocean.mp3",
            bg: "linear-gradient(to top, #e6e9f0 0%, #eef1f5 100%)",
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
                if (error.name !== 'AbortError') console.error("Audio Playback Error:", error);
            });
        }
    };

    // React to Preset Change
    useEffect(() => {
        if (activePreset === 'none') {
            audioRef.current?.pause();
            setIsPlaying(false);
        } else {
            const data = PRESETS[activePreset];
            if (audioRef.current && data) {
                audioRef.current.src = data.audio;
                audioRef.current.volume = 0.5;
                audioRef.current.load();
                safePlay();
                setIsPlaying(true);
            }
        }
    }, [activePreset]);

    const toggleAudio = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            safePlay();
        }
        setIsPlaying(!isPlaying);
    };

    // React to Zen Mode
    useEffect(() => {
        if (isZenMode) {
            document.body.classList.add('zen-mode-active');
        } else {
            document.body.classList.remove('zen-mode-active');
        }
    }, [isZenMode]);

    return (
        <>
            <audio ref={audioRef} loop onError={(e) => console.error(e)} />

            {/* Background Layer */}
            {activePreset !== 'none' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`fixed inset-0 pointer-events-none z-0 ${PRESETS[activePreset]?.overlayClass || ''}`}
                    style={{
                        background: PRESETS[activePreset]?.bg,
                        mixBlendMode: activePreset === 'zen' ? 'normal' : 'overlay'
                    }}
                />
            )}

            {/* Floating Controller */}
            <motion.div
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                className="fixed top-20 right-20 z-50 flex flex-col items-end gap-2"
            >
                <div className="bg-neutral-900/80 backdrop-blur-md border border-white/10 p-2 rounded-2xl shadow-xl flex items-center gap-2">
                    <button
                        onClick={() => setActivePreset(activePreset === 'none' ? 'rain' : 'none')}
                        className={`p-2 rounded-xl transition-all ${activePreset !== 'none' ? 'bg-violet-600/20 text-violet-400' : 'text-neutral-500 hover:text-white'}`}
                    >
                        <Sliders className="w-5 h-5" />
                    </button>

                    <AnimatePresence>
                        {activePreset !== 'none' && (
                            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="flex items-center gap-1 overflow-hidden">
                                {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((key) => (
                                    <button
                                        key={key}
                                        onClick={() => setActivePreset(key)}
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

                    <button onClick={toggleZenMode} className={`p-2 rounded-xl transition-all ${isZenMode ? 'bg-blue-500 text-white' : 'text-neutral-500 hover:text-white'}`} title="Zen Mode">
                        {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            </motion.div>
        </>
    );
}
