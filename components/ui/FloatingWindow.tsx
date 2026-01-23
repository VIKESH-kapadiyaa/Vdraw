"use client";
import React, { useRef, useEffect } from "react";
import { motion, useDragControls } from "framer-motion";
import { X, Minus, Maximize2 } from "lucide-react";
import { useStore } from "@/lib/store";

interface FloatingWindowProps {
    id: 'physics' | 'library' | 'books' | 'toolkit' | 'settings';
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    initialPos?: { x: number; y: number };
    defaultSize?: { w: string | number; h: string | number };
}

export default function FloatingWindow({
    id,
    title,
    icon,
    children,
    initialPos = { x: 100, y: 100 },
    defaultSize = { w: 600, h: 480 }
}: FloatingWindowProps) {
    const { closeWindow, focusWindow, activeWindow } = useStore();
    const controls = useDragControls();
    const isActive = activeWindow === id;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, x: initialPos.x, y: initialPos.y }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
            drag
            dragControls={controls}
            dragListener={false} // Only drag from header
            dragMomentum={false}
            onPointerDown={() => focusWindow(id)}
            style={{ zIndex: isActive ? 50 : 40 }}
            className={`fixed flex flex-col bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden ${isActive ? 'ring-1 ring-white/20' : ''
                }`}
        >
            {/* Window Header / Titlebar */}
            <div
                onPointerDown={(e) => {
                    controls.start(e);
                    focusWindow(id);
                }}
                className="h-10 bg-white/5 border-b border-white/5 flex items-center justify-between px-3 cursor-move select-none"
            >
                <div className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                    {icon && <span className="opacity-70">{icon}</span>}
                    <span>{title}</span>
                </div>

                {/* Window Controls */}
                <div className="flex items-center gap-1.5 pl-4">
                    <button className="p-1 rounded-full hover:bg-white/10 text-neutral-500 hover:text-white transition-colors">
                        <Minus className="w-3 h-3" />
                    </button>
                    <button className="p-1 rounded-full hover:bg-white/10 text-neutral-500 hover:text-white transition-colors">
                        <Maximize2 className="w-3 h-3" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); closeWindow(id); }}
                        className="p-1 rounded-full hover:bg-red-500/20 text-neutral-500 hover:text-red-400 transition-colors"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Window Content */}
            <div
                className="relative overflow-auto custom-scrollbar"
                style={{ width: defaultSize.w, height: defaultSize.h }}
            >
                {children}
            </div>
        </motion.div>
    );
}
