"use client";
import React, { useState, useEffect } from "react";
import { Search, X, BookOpen, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NCERT_DIAGRAMS, NCERTDiagram } from "../lib/ncert-library";
import { toast } from "sonner";

interface DiagramPickerProps {
    isOpen: boolean;
    onClose: () => void;
    excalidrawAPI: any;
}

export default function DiagramPicker({ isOpen, onClose, excalidrawAPI }: DiagramPickerProps) {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<string>("All");

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    const filteredDiagrams = NCERT_DIAGRAMS.filter(d =>
        (filter === "All" || d.category === filter) &&
        (d.name.toLowerCase().includes(search.toLowerCase()) || d.tags.some(t => t.includes(search.toLowerCase())))
    );

    const categories = ["All", "Physics", "Chemistry", "Biology", "Math"];

    const handleDropDiagram = async (diagram: NCERTDiagram) => {
        if (!excalidrawAPI) return;

        try {
            // Fetch the SVG content
            const response = await fetch(diagram.path);
            const svgBlob = await response.blob();

            // Convert to Data URL
            const reader = new FileReader();
            reader.readAsDataURL(svgBlob);
            reader.onloadend = () => {
                const base64data = reader.result as string;
                const fileId = Math.random().toString(36).substring(7);

                // Add file to Excalidraw store
                if (excalidrawAPI.addFiles) {
                    excalidrawAPI.addFiles([{
                        id: fileId,
                        dataURL: base64data,
                        mimeType: "image/svg+xml",
                        created: Date.now()
                    }]);
                }

                // Calculate center
                const appState = excalidrawAPI.getAppState();
                const centerX = appState.scrollX + window.innerWidth / 2;
                const centerY = appState.scrollY + window.innerHeight / 2;

                // Create Item
                // If hasPhysics, we might want to flag it or set specific styles.
                // Currently PhysicsCanvas looks for 'dashed' strokes for static. 
                // We'll just insert the image for now, and let PhysicsCanvas turn it into a body.
                // If it's a "Complex" SVG, it behaves as a rectangle body in our simple engine.
                // To support "Smart-Drop" where parts are static (dashed) and parts are dynamic,
                // we would need to parse the SVG specificly into separate Excalidraw primitives.
                // For V1, we insert as an Image.

                const imageElement = {
                    type: "image",
                    id: Math.random().toString(36).substring(7), // CRITICAL: ID required
                    version: 1,
                    versionNonce: Math.floor(Math.random() * 1000000000),
                    isDeleted: false,
                    fileId: fileId,
                    status: "saved",
                    x: centerX - 100, // centered
                    y: centerY - 100,
                    width: 200,
                    height: 200,
                    groupIds: [],
                    strokeColor: diagram.hasPhysics ? "#c084fc" : "transparent", // Visual cue
                    strokeStyle: "solid", // default
                    backgroundColor: "transparent",
                    customData: {
                        isNCERT: true,
                        hasPhysics: diagram.hasPhysics
                    }
                };

                excalidrawAPI.updateScene({
                    elements: [...excalidrawAPI.getSceneElements(), imageElement],
                    commitToHistory: true
                });

                toast.success(`Dropped: ${diagram.name}`, { description: diagram.hasPhysics ? "Physics Enabled" : "Illustration" });
                onClose();
            };

        } catch (e) {
            console.error("Failed to load diagram", e);
            toast.error("Failed to load diagram");
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm"
                    />

                    {/* Picker Modal */}
                    <motion.div
                        layoutId="diagram-picker"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-3xl h-[70vh] bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl z-[70] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-violet-500/20 rounded-xl text-violet-400">
                                    <BookOpen className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">NCERT Archive</h2>
                                    <p className="text-sm text-neutral-400">Smart-Drop Educational Models</p>
                                </div>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                                <input
                                    autoFocus
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search diagrams..."
                                    className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:border-violet-500 w-64 transition-all"
                                />
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="flex gap-2 p-4 px-6 border-b border-white/5 overflow-x-auto">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setFilter(cat)}
                                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filter === cat ? 'bg-white text-black' : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Grid */}
                        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                            {filteredDiagrams.map(diagram => (
                                <button
                                    key={diagram.id}
                                    onClick={() => handleDropDiagram(diagram)}
                                    className="group relative aspect-[4/3] bg-black/20 rounded-2xl border border-white/5 overflow-hidden hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-900/20 transition-all flex flex-col"
                                >
                                    {/* Preview - Use simple img tag since we have path */}
                                    <div className="flex-1 w-full bg-white/5 p-4 flex items-center justify-center">
                                        <img src={diagram.path} alt={diagram.name} className="max-w-full max-h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                                    </div>

                                    <div className="p-3 bg-neutral-900/50 border-t border-white/5 flex items-center justify-between">
                                        <span className="text-sm font-medium text-neutral-300 group-hover:text-white truncate">{diagram.name}</span>
                                        {diagram.hasPhysics && (
                                            <div className="p-1 rounded bg-fuchsia-500/20 text-fuchsia-300" title="Physics Enabled">
                                                <Layers className="w-3 h-3" />
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                            {filteredDiagrams.length === 0 && (
                                <div className="col-span-full py-12 text-center text-neutral-500">
                                    No diagrams found properly.
                                </div>
                            )}
                        </div>

                        {/* Footer Hint */}
                        <div className="p-3 bg-black/20 border-t border-white/5 text-center text-xs text-neutral-500">
                            Press <kbd className="bg-white/10 px-1 rounded text-neutral-300 font-mono">Esc</kbd> to close • <kbd className="bg-white/10 px-1 rounded text-neutral-300 font-mono">Ctrl+D</kbd> to toggle
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
