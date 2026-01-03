"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { Excalidraw, MainMenu, WelcomeScreen, Footer } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { supabase } from "../lib/supabaseClient";
import debounce from "lodash.debounce";
import throttle from "lodash.throttle";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, DoorOpen, Check, X, Loader2, Upload, FileUp, Sparkles } from "lucide-react";
import AIPreviewPanel from "./AIPreviewPanel";


export default function Whiteboard({ roomId }: { roomId: string }) {
    const [mounted, setMounted] = useState(false);
    const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
    const channelRef = useRef<any>(null);
    const isReceivingUpdate = useRef(false);

    // Access Control State
    const [isHost, setIsHost] = useState(false);
    const [hasAccess, setHasAccess] = useState(false);
    const [requests, setRequests] = useState<string[]>([]);
    const [isRequesting, setIsRequesting] = useState(false);
    const myId = useRef(typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString());

    // --- AI WIREFRAME TO CODE STATE ---
    const [isAIPreviewOpen, setIsAIPreviewOpen] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        // window.EXCALIDRAW_ASSET_PATH = "/";

        // Check Access Permissions
        const isOwner = localStorage.getItem(`vdraw-host-${roomId}`) === 'true';
        const canEnter = localStorage.getItem(`vdraw-access-${roomId}`) === 'true';

        setIsHost(isOwner);
        if (isOwner || canEnter) {
            setHasAccess(true);
        }
    }, [roomId]);

    // Define loadDrawing outside to be reusable
    const loadDrawing = useCallback(async () => {
        if (!excalidrawAPI || !roomId) return;

        // Load saved drawing
        const { data, error } = await supabase
            .from("drawings")
            .select("*")
            .eq("id", roomId)
            .single();

        const isMobile = window.innerWidth < 768;
        const mobileOverrides = isMobile ? {
            // zenModeEnabled: false, 
            activeTool: { type: "selection", lastActiveTool: null, locked: false, customType: null },
        } : {};

        if (error || !data) {
            // Initialize new canvas if empty
            if (excalidrawAPI.getSceneElements().length === 0) {
                excalidrawAPI.updateScene({
                    elements: [],
                    appState: {
                        ...excalidrawAPI.getAppState(),
                        collaborators: [],
                        theme: "dark",
                        ...mobileOverrides
                    }
                });
            }
        } else if (data && data.elements && data.app_state) {
            // Merge or replace
            excalidrawAPI.updateScene({
                elements: data.elements,
                appState: {
                    ...data.app_state,
                    theme: "dark",
                    ...mobileOverrides
                },
            });
        }
    }, [excalidrawAPI, roomId]);

    // Visibility Change Listener (Auto-Reconnect/Re-sync)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log("App visible, re-syncing...");
                // Re-fetch latest state
                loadDrawing();

                // Re-subscribe if channel is dead (optional, usually supabase handles this, 
                // but we can force a check if needed. For now, just syncing data is most important).
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [loadDrawing]);


    const lastVersions = useRef<Record<string, number>>({});

    // Initialize Realtime Channel
    useEffect(() => {
        if (!roomId) return;

        const channel = supabase.channel(roomId, {
            config: {
                broadcast: { self: false, ack: false } // Optimistic: Don't wait for server, don't echo back
            }
        })
            .on('broadcast', { event: 'request-access' }, (payload) => {
                const amIHost = localStorage.getItem(`vdraw-host-${roomId}`) === 'true';
                if (amIHost) {
                    const reqId = payload.payload.requesterId;
                    setRequests(prev => {
                        if (!prev.includes(reqId)) {
                            toast.info("New request to join!", {
                                description: `Guest ${reqId.slice(0, 4)} is knocking.`,
                                position: "top-right"
                            });
                            return [...prev, reqId];
                        }
                        return prev;
                    });
                }
            })
            .on('broadcast', { event: 'grant-access' }, (payload) => {
                if (payload.payload.targetId === myId.current) {
                    setHasAccess(true);
                    setIsRequesting(false);
                    localStorage.setItem(`vdraw-access-${roomId}`, 'true');
                    toast.success("Access Granted!", { description: "Welcome to the room." });
                    loadDrawing(); // Load data once access granted
                }
            })
            .on('broadcast', { event: 'deny-access' }, (payload) => {
                if (payload.payload.targetId === myId.current) {
                    setIsRequesting(false);
                    toast.error("Access Denied", { description: "The host has denied your request." });
                }
            })
            .on('broadcast', { event: 'draw-update' }, (payload) => {
                if (!excalidrawAPI) return;

                // Prevent infinite loop: Lock broadcasting while applying remote updates
                isReceivingUpdate.current = true;

                const { elements: incomingElements, appState } = payload.payload;

                // --- CONCURRENCY FIX: Remote Layer ---
                // We use Excalidraw's built-in merging logic.
                // By passing only the modified elements, Excalidraw merges them with the current scene.
                // We do NOT replace the whole scene, effectively creating a "remote patch".

                excalidrawAPI.updateScene({
                    elements: incomingElements, // Excalidraw merges by ID automatically
                    appState: { ...appState, collaborators: [] }, // Sync view background, etc.
                    commitToHistory: false // Don't add remote changes to local undo stack
                });

                // Release lock immediately after update
                setTimeout(() => isReceivingUpdate.current = false, 0);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`Connected to Realtime channel: ${roomId}`);
                }
                if (status === 'CHANNEL_ERROR') {
                    toast.error("Connection Error", { description: "Failed to connect to room channel. Retrying..." });
                }
            });

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [roomId, excalidrawAPI, loadDrawing]);

    // Branding: Rename Menu Items
    useEffect(() => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && (node as HTMLElement).textContent?.includes("Mermaid to Excalidraw")) {
                        const walker = document.createTreeWalker(node, 4); // NodeFilter.SHOW_TEXT
                        let textNode;
                        while (textNode = walker.nextNode()) {
                            if (textNode.nodeValue === "Mermaid to Excalidraw") {
                                textNode.nodeValue = "Mermaid to Vdraw";
                            }
                        }
                    }
                });
            });
        });
        if (typeof document !== 'undefined') {
            observer.observe(document.body, { childList: true, subtree: true });
        }
        return () => observer.disconnect();
    }, []);

    // Initial Load
    useEffect(() => {
        if (hasAccess && excalidrawAPI) {
            loadDrawing();
        }
    }, [hasAccess, excalidrawAPI, loadDrawing]);


    // Helper: Request Access
    const requestAccess = async () => {
        if (!channelRef.current) {
            toast.warning("Connecting...", { description: "Please wait for connection to established." });
            return;
        }
        setIsRequesting(true);
        await channelRef.current.send({
            type: 'broadcast',
            event: 'request-access',
            payload: { requesterId: myId.current }
        });
        toast.info("Knocking...", { description: "Waiting for host approval." });
    };

    // Helper: Grant Access
    const grantAccess = async (targetId: string) => {
        if (!channelRef.current) return;
        await channelRef.current.send({
            type: 'broadcast',
            event: 'grant-access',
            payload: { targetId }
        });
        setRequests(prev => prev.filter(id => id !== targetId));
    };

    // Helper: Deny Access
    const denyAccess = async (targetId: string) => {
        if (!channelRef.current) return;
        await channelRef.current.send({
            type: 'broadcast',
            event: 'deny-access',
            payload: { targetId }
        });
        setRequests(prev => prev.filter(id => id !== targetId));
    };

    const saveDrawing = async (elements: any, appState: any) => {
        try {
            const cleanAppState = { ...appState, collaborators: [] };
            await supabase
                .from("drawings")
                .upsert({ id: roomId, elements, app_state: cleanAppState });
        } catch (error) {
            console.error("Save error", error);
        }
    };

    const debouncedSave = useCallback(
        debounce((elements, appState) => saveDrawing(elements, appState), 2000),
        [roomId]
    );

    const broadcastDrawing = async (elements: any[], appState: any) => {
        if (!channelRef.current || isReceivingUpdate.current) return;

        // --- BINARY/DELTA LOAD REDUCTION ---
        // Only broadcast elements that have actually changed versions since last broadcast.
        const changedElements = elements.filter(el => {
            const lastVer = lastVersions.current[el.id] || -1;
            if (el.version > lastVer) {
                lastVersions.current[el.id] = el.version;
                return true;
            }
            return false;
        });

        if (changedElements.length === 0) return; // Nothing to send

        try {
            await channelRef.current.send({
                type: 'broadcast',
                event: 'draw-update',
                payload: {
                    elements: changedElements, // ONLY Send the delta
                    appState: { viewBackgroundColor: appState.viewBackgroundColor }
                }
            });
        } catch (error) {
            console.error("Broadcast error", error);
        }
    };

    // Use throttle for smoother continuous updates (30ms = ~30fps)
    const throttledBroadcast = useCallback(
        throttle((elements, appState) => broadcastDrawing(elements, appState), 30),
        []
    );

    const handleChange = (elements: any, appState: any) => {
        // --- OPTIMISTIC UI ---
        // We do NOT block rendering here. Excalidraw renders immediately by default.
        // We just decide whether to broadcast.

        if (isReceivingUpdate.current) return; // Don't broadcast if we are currently applying a remote update

        debouncedSave(elements, appState);
        throttledBroadcast(elements, appState);
    };

    // --- FILE IMPORT HANDLERS ---
    const fileInputRef = useRef<HTMLInputElement>(null);

    const insertImageToScene = async (blob: Blob) => {
        if (!excalidrawAPI) return;
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => {
            const dataURL = reader.result as string;
            const img = new Image();
            img.onload = () => {
                const { width, height } = img;
                const fileId = typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString();

                // Calculate center position
                const appState = excalidrawAPI.getAppState();
                const centerX = appState.scrollX + (appState.width || window.innerWidth) / 2 - width / 2;
                const centerY = appState.scrollY + (appState.height || window.innerHeight) / 2 - height / 2;

                const element: any = {
                    id: fileId,
                    type: "image",
                    x: centerX,
                    y: centerY,
                    width,
                    height,
                    fileId,
                    status: "saved",
                    version: 1,
                    versionNonce: Date.now(),
                    isDeleted: false,
                    fillStyle: "hachure",
                    strokeWidth: 1,
                    strokeStyle: "solid",
                    roughness: 1,
                    opacity: 100,
                    groupIds: [],
                    strokeColor: "#000000",
                    backgroundColor: "transparent",
                    angle: 0,
                    seed: Date.now(),
                    updated: Date.now(),
                    link: null,
                    locked: false,
                };

                const fileData = {
                    id: fileId,
                    mimeType: blob.type,
                    dataURL,
                    created: Date.now(),
                    lastRetrieved: Date.now()
                };

                excalidrawAPI.updateScene({
                    elements: [...excalidrawAPI.getSceneElements(), element],
                    appState: {
                        ...appState,
                        files: {
                            ...appState.files,
                            [fileId]: fileData
                        }
                    }
                });
            };
            img.src = dataURL;
        };
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        e.target.value = ""; // Reset

        toast.loading("Processing files...");

        for (const file of files) {
            // Limit: 1GB = 1024 * 1024 * 1024 bytes
            if (file.size > 1024 * 1024 * 1024) {
                toast.error(`File ${file.name} is too large (>1GB). Skipped.`);
                continue;
            }

            if (file.type.startsWith("image/")) {
                await insertImageToScene(file);
            } else if (file.type === "application/pdf") {
                try {
                    // Dynamic import to avoid SSR/Build issues
                    // @ts-ignore
                    const pdfjs = await import("pdfjs-dist/build/pdf");
                    // @ts-ignore
                    const pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.mjs");

                    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;

                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const viewport = page.getViewport({ scale: 1.5 });
                        const canvas = document.createElement("canvas");
                        const context = canvas.getContext("2d");
                        if (context) {
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;
                            await page.render({ canvasContext: context, viewport }).promise;
                            const blob = await new Promise<Blob | null>(r => canvas.toBlob(r));
                            if (blob) await insertImageToScene(blob);
                        }
                    }
                    toast.success("PDF Imported successfully");
                } catch (err) {
                    console.error(err);
                    toast.error("Failed to import PDF");
                }
            } else if (file.type.startsWith("video/")) {
                try {
                    const video = document.createElement('video');
                    video.preload = 'metadata';
                    video.src = URL.createObjectURL(file);
                    video.currentTime = 1; // Capture at 1s
                    await new Promise((resolve) => {
                        video.onloadedmetadata = () => { video.currentTime = 1; };
                        video.onseeked = resolve;
                        video.onerror = resolve; // Fallback
                        // Timeout fallback
                        setTimeout(resolve, 2000);
                    });

                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth || 640;
                    canvas.height = video.videoHeight || 480;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(video, 0, 0);
                        const blob = await new Promise<Blob | null>(r => canvas.toBlob(r));
                        if (blob) await insertImageToScene(blob);
                    }
                    toast.success("Video snapshot imported");
                } catch (err) {
                    toast.error("Failed to process video");
                }
            }
        }
        toast.dismiss();
    };

    if (!mounted) {
        return (
            <div className="flex flex-col items-center justify-center h-screen w-screen bg-neutral-950 text-white">
                <Loader2 className="w-10 h-10 animate-spin text-violet-500 mb-4" />
                <div className="text-xl font-medium tracking-wide">Initializing Vdraw...</div>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center h-screen w-screen bg-neutral-950 text-white p-6 overflow-hidden relative">
                {/* Background Blobs */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-violet-600/20 rounded-full blur-[128px] pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-[128px] pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="z-10 bg-neutral-900/50 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-2xl shadow-2xl w-[90%] max-w-md text-center"
                >
                    <div className="mx-auto w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                        <Lock className="w-8 h-8 text-neutral-400" />
                    </div>

                    <h2 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                        Waiting Room
                    </h2>
                    <p className="text-neutral-400 mb-8 leading-relaxed">
                        This room is locked by the host.<br />knock to request access.
                    </p>

                    <button
                        onClick={requestAccess}
                        disabled={isRequesting}
                        className={`
                            relative w-full py-4 rounded-xl font-bold text-lg transition-all duration-300
                            flex items-center justify-center gap-3 overflow-hidden
                            ${isRequesting
                                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg hover:shadow-violet-500/25 active:scale-95'}
                        `}
                    >
                        {isRequesting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Waiting for Host...</span>
                            </>
                        ) : (
                            <>
                                <DoorOpen className="w-6 h-6" />
                                <span>Knock to Enter</span>
                            </>
                        )}

                        {/* Shine effect */}
                        {!isRequesting && (
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        )}
                    </button>

                    {isRequesting && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-4 text-xs text-neutral-500"
                        >
                            Sit tight! The host has been notified.
                        </motion.p>
                    )}
                </motion.div>
            </div>
        );
    }

    // --- AI WIREFRAME TO CODE ---

    const generateCode = async () => {
        if (!excalidrawAPI) return;

        try {
            setAiLoading(true);
            setIsAIPreviewOpen(true);
            setGeneratedCode(null);

            // 1. Export Canvas to Image
            const elements = excalidrawAPI.getSceneElements();
            if (!elements || elements.length === 0) {
                toast.error("Canvas is empty", { description: "Draw something first!" });
                setAiLoading(false);
                return;
            }

            // @ts-ignore
            const { exportToCanvas } = await import("@excalidraw/excalidraw");

            const canvas = await exportToCanvas({
                elements,
                appState: {
                    ...excalidrawAPI.getAppState(),
                    exportWithDarkMode: true,
                },
                files: excalidrawAPI.getFiles(),
                exportPadding: 20
            });

            // 2. Convert to Base64 (JPEG compressed)
            const imageBase64 = canvas.toDataURL("image/jpeg", 0.6);

            // 3. Call AI Edge Function
            const { data, error } = await supabase.functions.invoke('vdraw-ai', {
                body: {
                    imageBase64,
                    roomContext: "A collaborative whiteboard session." // Optional context
                }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            setGeneratedCode(data.code);
            toast.success("Code Generated!", { description: "Check the preview panel." });

        } catch (err: any) {
            console.error("AI Gen Error", err);
            toast.error("Generation Failed", { description: err.message || "Something went wrong." });
            setGeneratedCode("// Error generating code. Please try again.");
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
            <Excalidraw
                name="Vdraw"
                initialData={{
                    libraryItems: [],
                }}
                UIOptions={{
                    dockedSidebarBreakpoint: 768,
                    // @ts-expect-error: Type definition missing field
                    helpDialog: { socials: false },
                    canvasActions: {
                        changeViewBackgroundColor: true,
                        clearCanvas: true,
                        loadScene: false,
                        saveToActiveFile: false,
                        toggleTheme: true,
                        saveAsImage: true,
                    },
                }}
                excalidrawAPI={(api) => setExcalidrawAPI(api)}
                theme="dark"
                onChange={(elements, appState) => handleChange(elements, appState)}
            >
                <WelcomeScreen>
                    <WelcomeScreen.Center>
                        <WelcomeScreen.Center.Logo>
                            <div className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500 tracking-tight" style={{ filter: 'drop-shadow(0px 0px 20px rgba(139, 92, 246, 0.3))' }}>
                                Vdraw
                            </div>
                        </WelcomeScreen.Center.Logo>
                        <WelcomeScreen.Center.Heading>
                            <span className="text-neutral-400 font-normal">Instant Visual Collaboration</span>
                        </WelcomeScreen.Center.Heading>
                        <WelcomeScreen.Center.Menu>
                            <div className="flex gap-3 mt-4">
                                <button className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-full text-sm font-medium transition-colors border border-neutral-700">
                                    ✨ Gen Z
                                </button>
                                <button className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-full text-sm font-medium transition-colors border border-neutral-700">
                                    🔥 Fast
                                </button>
                                <button className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-full text-sm font-medium transition-colors border border-neutral-700">
                                    🤝 Secure
                                </button>
                            </div>
                        </WelcomeScreen.Center.Menu>
                    </WelcomeScreen.Center>
                </WelcomeScreen>

                <MainMenu>
                    <MainMenu.DefaultItems.Export />
                    <MainMenu.DefaultItems.SaveAsImage />
                    {/* @ts-ignore */}
                    <MainMenu.Item onSelect={() => fileInputRef.current?.click()} icon={<FileUp className="w-4 h-4" />}>
                        Import File...
                    </MainMenu.Item>
                    <MainMenu.Separator />
                    {/* @ts-ignore */}
                    <MainMenu.Item onSelect={generateCode} icon={<Sparkles className="w-4 h-4 text-violet-400" />}>
                        Generate Code (AI)
                    </MainMenu.Item>
                    <MainMenu.Separator />
                    <MainMenu.DefaultItems.ClearCanvas />
                    <MainMenu.DefaultItems.ToggleTheme />
                    <MainMenu.DefaultItems.ChangeCanvasBackground />
                </MainMenu>

                <Footer>
                    <div className="flex gap-4 p-2 opacity-60 text-xs font-mono text-neutral-500 pointer-events-none select-none">
                        <span>v1.0.0</span>
                        <span>•</span>
                        <span>Encrypted</span>
                    </div>
                </Footer>
            </Excalidraw>

            {/* AI Preview Panel */}
            <AIPreviewPanel
                isOpen={isAIPreviewOpen}
                onClose={() => setIsAIPreviewOpen(false)}
                isLoading={aiLoading}
                code={generatedCode}
            />

            {/* Host Requests Panel */}
            <AnimatePresence>
                {isHost && requests.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="absolute bottom-24 left-4 right-4 md:left-auto md:bottom-auto md:w-72 md:top-4 z-50 mx-auto md:mx-0"
                    >
                        <div className="bg-neutral-900/90 backdrop-blur-md border border-violet-500/30 rounded-2xl shadow-2xl overflow-hidden">
                            <div className="p-4 border-b border-white/5 bg-violet-500/10 flex items-center justify-between">
                                <h3 className="font-bold text-violet-200 flex items-center gap-2">
                                    <DoorOpen className="w-5 h-5" />
                                    Join Requests
                                </h3>
                                <span className="bg-violet-500 text-white text-xs px-2 py-0.5 rounded-full">
                                    {requests.length}
                                </span>
                            </div>
                            <div className="max-h-64 overflow-y-auto p-2 flex flex-col gap-2">
                                {requests.map((reqId) => (
                                    <motion.div
                                        key={reqId}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-neutral-800 p-3 rounded-xl flex items-center justify-between group hover:bg-neutral-700 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                                                {reqId.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-white">Guest {reqId.slice(0, 4)}</span>
                                                <span className="text-[10px] text-neutral-500">Wants to join</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => denyAccess(reqId)}
                                                className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
                                                title="Deny"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => grantAccess(reqId)}
                                                className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors"
                                                title="Allow"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hidden Input for Imports */}
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/*,application/pdf,video/*"
                multiple
                onChange={handleFileUpload}
            />
        </div>
    );
}
