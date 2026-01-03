"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Code, Loader2, Sparkles } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface AIPreviewPanelProps {
    isOpen: boolean;
    onClose: () => void;
    isLoading: boolean;
    code: string | null;
}

export default function AIPreviewPanel({ isOpen, onClose, isLoading, code }: AIPreviewPanelProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (code) {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Extract code from markdown block if present
    const cleanCode = code ? code.replace(/```(jsx|tsx|javascript|typescript|react)?/g, "").replace(/```/g, "").trim() : "";

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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full lg:w-[600px] bg-neutral-950 border-l border-white/10 shadow-2xl z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-neutral-900/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Vdraw AI</h2>
                                    <p className="text-xs text-neutral-400">Wireframe to Code</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-neutral-400 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto relative bg-neutral-950">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                                    <div className="relative mb-8">
                                        <div className="absolute inset-0 bg-violet-500/30 blur-xl rounded-full animate-pulse" />
                                        <Loader2 className="w-16 h-16 text-violet-500 animate-spin relative z-10" />
                                    </div>
                                    <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400 mb-2">
                                        Dreaming up code...
                                    </h3>
                                    <p className="text-neutral-500 max-w-xs">
                                        Analyzing your masterpiece and converting it into accessibility-ready React components.
                                    </p>
                                </div>
                            ) : code ? (
                                <div className="h-full flex flex-col">
                                    <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-neutral-800">
                                        <span className="text-xs font-mono text-neutral-400">Component.tsx</span>
                                        <button
                                            onClick={handleCopy}
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium"
                                        >
                                            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-neutral-400" />}
                                            {copied ? <span className="text-green-400">Copied</span> : <span className="text-neutral-300">Copy Code</span>}
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-auto text-sm">
                                        <SyntaxHighlighter
                                            language="tsx"
                                            style={vscDarkPlus}
                                            customStyle={{ margin: 0, padding: '1.5rem', background: 'transparent', fontSize: '14px' }}
                                            showLineNumbers={true}
                                        >
                                            {cleanCode}
                                        </SyntaxHighlighter>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full p-8 text-center text-neutral-500">
                                    <Code className="w-12 h-12 mb-4 opacity-20" />
                                    <p>Draw something and click "Generate Code"</p>
                                </div>
                            )}
                        </div>

                        {/* Footer Status */}
                        {!isLoading && code && (
                            <div className="p-4 border-t border-white/5 bg-neutral-900/30 text-xs text-center text-neutral-500">
                                Generated by Vdraw AI • Check for imports & dependencies
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
