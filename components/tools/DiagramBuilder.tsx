"use client";
import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Download, Play, Code as CodeIcon, FileDigit } from "lucide-react";
import mermaid from "mermaid";
import { useStore } from "@/lib/store";

interface DiagramBuilderProps {
    excalidrawAPI: any;
}

const TEMPLATES = {
    flowchart: `graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B`,
    mindmap: `mindmap
  root((Vdraw))
    Tools
      Pen
      Physics
      AI
    Users
      Students
      Teachers`,
    sequence: `sequenceDiagram
    Alice->>John: Hello John, how are you?
    John-->>Alice: Great!`,
    gantt: `gantt
    title A Gantt Diagram
    dateFormat  YYYY-MM-DD
    section Section
    A task           :a1, 2014-01-01, 30d
    Another task     :after a1  , 20d`
};

export default function DiagramBuilder({ excalidrawAPI }: DiagramBuilderProps) {
    const [code, setCode] = useState(TEMPLATES.flowchart);
    const [svgPreview, setSvgPreview] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const { closeWindow } = useStore();

    // Initialize Mermaid
    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            securityLevel: 'loose',
        });
    }, []);

    // Render Preview Loop
    useEffect(() => {
        const renderDiagram = async () => {
            try {
                const id = `mermaid-preview-${Date.now()}`;
                const { svg } = await mermaid.render(id, code);
                setSvgPreview(svg);
                setError(null);
            } catch (e: any) {
                console.error("Mermaid Render Error", e);
                // Mermaid throws generic errors, we just show "Syntax Error"
                setError("Syntax Error");
            }
        };

        const timeout = setTimeout(renderDiagram, 500); // Debounce
        return () => clearTimeout(timeout);
    }, [code]);


    const handleInsert = async () => {
        if (!excalidrawAPI || !svgPreview) return;

        try {
            const blob = new Blob([svgPreview], { type: 'image/svg+xml;charset=utf-8' });

            // We use the file API to insert cleanly
            const fileId = Math.random().toString(36).substring(7);

            // 1. Add File to cached files
            // Can't easily use addFiles without a binary blob in some versions, but insertToScene handles it
            if (excalidrawAPI.addFiles) {
                // This part is tricky without a real file object, 
                // but the simpler "image" element insertion below works best for SVGs
            }

            // 2. Insert Element
            // We need to parse the SVG dimensions
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgPreview, "image/svg+xml");
            const svgEl = doc.querySelector("svg");
            const w = svgEl ? parseInt(svgEl.getAttribute("width") || "300") : 300;
            const h = svgEl ? parseInt(svgEl.getAttribute("height") || "200") : 200;

            // Center of screen
            const appState = excalidrawAPI.getAppState();
            const cx = appState.scrollX + (appState.width || window.innerWidth) / 2;
            const cy = appState.scrollY + (appState.height || window.innerHeight) / 2;

            // We insert as a simplified SVG string data URL or rely on Excalidraw's magic
            // Using createObjectURL is safest
            const url = URL.createObjectURL(blob);

            // We will try insertToScene from the API which handles the file creation automatically usually
            // But we need to define the type

            // Hack: Emulate a file drop
            // We use the same logic we fixed in Whiteboard.tsx
            const img = new Image();
            img.onload = async () => {
                // Insert
                const element = {
                    type: "image",
                    x: cx - w / 2,
                    y: cy - h / 2,
                    width: w,
                    height: h,
                    strokeColor: "transparent",
                    backgroundColor: "transparent",
                };
                // @ts-ignore
                await excalidrawAPI.addFiles([{ id: fileId, mimeType: "image/svg+xml", dataURL: await blobToDataURL(blob), created: Date.now() }]);

                excalidrawAPI.updateScene({
                    elements: [
                        ...excalidrawAPI.getSceneElements(),
                        { ...element, fileId, status: "saved", type: "image" }
                    ]
                });
                URL.revokeObjectURL(url);
                closeWindow('diagrams');
                toast.success("Diagram Added");
            };
            img.src = url;

        } catch (e: any) {
            toast.error("Failed to insert: " + e.message);
        }
    };

    const blobToDataURL = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    return (
        <div className="flex flex-col h-full bg-neutral-900 border-t border-white/5">
            {/* Toolbar */}
            <div className="flex items-center gap-2 p-3 bg-black/20 border-b border-white/5 overflow-x-auto">
                {Object.keys(TEMPLATES).map(key => (
                    <button
                        key={key}
                        onClick={() => setCode(TEMPLATES[key as keyof typeof TEMPLATES])}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-neutral-300 capitalize transition-colors"
                    >
                        {key}
                    </button>
                ))}
            </div>

            {/* Main Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Editor */}
                <div className="w-1/2 border-r border-white/5 flex flex-col">
                    <div className="bg-black/40 px-3 py-2 text-xs text-neutral-500 font-mono uppercase tracking-wider flex justify-between">
                        <span>Source Code</span>
                        <CodeIcon className="w-3 h-3" />
                    </div>
                    <textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="flex-1 w-full bg-neutral-900 resize-none p-4 font-mono text-sm text-blue-300 focus:outline-none focus:bg-neutral-800/50 transition-colors"
                        spellCheck={false}
                    />
                </div>

                {/* Preview */}
                <div className="w-1/2 bg-black/50 flex flex-col">
                    <div className="bg-black/40 px-3 py-2 text-xs text-neutral-500 font-mono uppercase tracking-wider flex justify-between">
                        <span>Live Preview</span>
                        <FileDigit className="w-3 h-3" />
                    </div>
                    <div className="flex-1 flex items-center justify-center p-4 overflow-auto relative">
                        {error ? (
                            <div className="text-red-400 text-xs font-mono bg-red-500/10 p-2 rounded border border-red-500/20">
                                {error}
                            </div>
                        ) : (
                            <div
                                ref={previewRef}
                                dangerouslySetInnerHTML={{ __html: svgPreview }}
                                className="w-full h-full flex items-center justify-center opacity-90 [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:h-[auto!important]"
                            />
                        )}

                        {/* Insert Button Floating */}
                        <div className="absolute bottom-4 right-4">
                            <button
                                onClick={handleInsert}
                                disabled={!!error || !svgPreview}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <Play className="w-4 h-4 fill-current" /> Insert
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
