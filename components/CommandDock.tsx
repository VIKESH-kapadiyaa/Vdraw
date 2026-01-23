"use client";
import React from "react";
import { motion } from "framer-motion";
import {
    MousePointer2, Square, Circle, Type, Image as ImageIcon,
    Minus, ArrowRight, Pencil, Eraser, Undo2, Redo2, Sparkles, Crosshair
} from "lucide-react";

interface CommandDockProps {
    excalidrawAPI: any;
    activeTool: any;
}

export default function CommandDock({ excalidrawAPI, activeTool }: CommandDockProps) {
    if (!excalidrawAPI) return null;

    const setTool = (type: string) => {
        excalidrawAPI.setActiveTool({ type });
    };

    const tools = [
        { type: "selection", icon: MousePointer2, label: "Select", shortcut: "V" },
        { type: "rectangle", icon: Square, label: "Rectangle", shortcut: "R" },
        { type: "ellipse", icon: Circle, label: "Ellipse", shortcut: "O" },
        { type: "arrow", icon: ArrowRight, label: "Arrow", shortcut: "A" },
        { type: "line", icon: Minus, label: "Line", shortcut: "L" },
        { type: "freedraw", icon: Pencil, label: "Draw", shortcut: "P" },
        { type: "text", icon: Type, label: "Text", shortcut: "T" },
        { type: "image", icon: ImageIcon, label: "Image", shortcut: "I", action: "image" },
        { type: "eraser", icon: Eraser, label: "Eraser", shortcut: "E" },
        { type: "laser", icon: Crosshair, label: "Laser", shortcut: "K" },
    ];

    const currentType = activeTool?.type || "selection";

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
            {/* Glow Effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/20 to-violet-600/20 rounded-3xl blur-2xl opacity-60 pointer-events-none" />

            <motion.div
                className="relative flex items-center gap-1 px-2 py-2 bg-neutral-950/80 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
            >
                {/* Tools */}
                <div className="flex items-center gap-0.5 px-1">
                    {tools.map((tool, i) => {
                        const isActive = currentType === tool.type;
                        const Icon = tool.icon;
                        return (
                            <motion.button
                                key={tool.type}
                                onClick={() => tool.action === 'image' ? document.getElementById('image-upload-trigger')?.click() : setTool(tool.type)}
                                className={`group relative p-3 rounded-xl transition-all duration-200 ${isActive
                                    ? 'bg-gradient-to-b from-violet-500/30 to-violet-600/20 text-white shadow-inner shadow-violet-500/20'
                                    : 'text-neutral-500 hover:text-white hover:bg-white/[0.06]'
                                    }`}
                                whileHover={{ scale: 1.08, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                            >
                                <Icon className={`w-[18px] h-[18px] ${isActive ? 'drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]' : ''}`} strokeWidth={isActive ? 2.5 : 2} />

                                {/* Active Indicator */}
                                {isActive && (
                                    <motion.div
                                        layoutId="dock-indicator"
                                        className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-violet-400 rounded-full shadow-lg shadow-violet-500/50"
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}

                                {/* Tooltip */}
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-neutral-900 border border-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                                    <span className="text-[11px] font-medium text-white">{tool.label}</span>
                                    <span className="text-[10px] text-neutral-500 ml-1.5 font-mono bg-white/5 px-1 py-0.5 rounded">{tool.shortcut}</span>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

                {/* Separator */}
                <div className="w-px h-8 bg-gradient-to-b from-transparent via-white/10 to-transparent mx-1" />

                {/* Undo/Redo */}
                <div className="flex items-center gap-0.5 px-1">
                    <motion.button
                        onClick={() => {
                            // Safe undo check
                            // @ts-ignore
                            if (excalidrawAPI.history?.undo) excalidrawAPI.history.undo();
                            // @ts-ignore
                            else if (excalidrawAPI.updateScene) excalidrawAPI.updateScene({ commitToHistory: false }); // Fallback
                        }}
                        className="p-2.5 text-neutral-500 hover:text-white rounded-lg hover:bg-white/[0.06] transition-all"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <Undo2 className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                        onClick={() => {
                            // @ts-ignore
                            if (excalidrawAPI.history?.redo) excalidrawAPI.history.redo();
                        }}
                        className="p-2.5 text-neutral-500 hover:text-white rounded-lg hover:bg-white/[0.06] transition-all"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <Redo2 className="w-4 h-4" />
                    </motion.button>
                </div>

                {/* AI Sparkle Button - Future Feature Hint */}
                <div className="w-px h-8 bg-gradient-to-b from-transparent via-white/10 to-transparent mx-1" />
                <motion.button
                    className="p-2.5 text-amber-500/70 hover:text-amber-400 rounded-lg hover:bg-amber-500/10 transition-all"
                    whileHover={{ scale: 1.1, rotate: 15 }}
                    whileTap={{ scale: 0.9 }}
                    title="AI Assist (Coming Soon)"
                >
                    <Sparkles className="w-4 h-4" />
                </motion.button>
            </motion.div>
        </div>
    );
}
