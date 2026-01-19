/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { Excalidraw, MainMenu, WelcomeScreen, Footer } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { supabase } from "../lib/supabaseClient";
import debounce from "lodash.debounce";
import throttle from "lodash.throttle";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, DoorOpen, Check, X, Loader2, FileUp, Download, Image as ImageIcon, Trash2, Sun, Code } from "lucide-react";
import { exportToBlob, serializeAsJSON } from "@excalidraw/excalidraw";
import AtmosphereController from "./AtmosphereController";

export default function Whiteboard({ roomId }: { roomId: string }) {
    const [mounted, setMounted] = useState(false);

    // Main Whiteboard State
    const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
    const channelRef = useRef<any>(null);
    const isReceivingUpdate = useRef(false);
    const lastVersions = useRef<Record<string, number>>({});

    // Access Control State
    const [isHost, setIsHost] = useState(false);
    const [hasAccess, setHasAccess] = useState(false);
    const [requests, setRequests] = useState<string[]>([]);
    const [isRequesting, setIsRequesting] = useState(false);
    const myId = useRef(
        (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2, 15)
    );

    // --- HISTORY TRACKING ---
    useEffect(() => {
        const history = JSON.parse(localStorage.getItem('vdraw-recent-rooms') || '[]');
        const updated = [{ id: roomId, date: new Date().toISOString() }, ...history.filter((r: any) => r.id !== roomId)].slice(0, 5);
        localStorage.setItem('vdraw-recent-rooms', JSON.stringify(updated));
    }, [roomId]);

    // --- INITIALIZATION & AUTH ---
    useEffect(() => {
        setMounted(true);
        const isOwner = localStorage.getItem(`vdraw-host-${roomId}`) === 'true';
        const canEnter = localStorage.getItem(`vdraw-access-${roomId}`) === 'true';

        setIsHost(isOwner);
        if (isOwner || canEnter) {
            setHasAccess(true);
        }
    }, [roomId]);

    // --- DATA SYNC LOGIC (GENERIC) ---
    const loadData = useCallback(async (api: any, id: string) => {
        if (!api || !id) return;
        const { data, error } = await supabase.from("drawings").select("*").eq("id", id).single();

        const isMobile = window.innerWidth < 768;
        const mobileOverrides = isMobile ? {
            activeTool: { type: "selection", lastActiveTool: null, locked: false, customType: null },
        } : {};

        if (error || !data) {
            if (api.getSceneElements().length === 0) {
                api.updateScene({ elements: [], appState: { ...api.getAppState(), collaborators: [], theme: "dark", ...mobileOverrides } });
            }
        } else if (data && data.elements && data.app_state) {
            // Filter out camera settings to prevents forcing mobile view on desktop
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { zoom, scrollX, scrollY, ...safeAppState } = data.app_state;

            api.updateScene({
                elements: data.elements,
                appState: { ...safeAppState, theme: "dark", ...mobileOverrides },
            });
        }
    }, []);

    // Load Main Board
    useEffect(() => {
        if (hasAccess && excalidrawAPI) loadData(excalidrawAPI, roomId);
    }, [hasAccess, excalidrawAPI, roomId, loadData]);


    // --- REALTIME SYNC (GENERIC) ---
    const setupChannel = useCallback((id: string, api: any, ref: any, versionsRef: any, receivingRef: any) => {
        if (!id || !api) return;

        const channel = supabase.channel(id, {
            config: { broadcast: { self: false, ack: false } }
        })
            .on('broadcast', { event: 'draw-update' }, (payload) => {
                if (!api) return;
                receivingRef.current = true;
                const { elements: incomingElements, appState } = payload.payload;

                incomingElements.forEach((el: any) => {
                    versionsRef.current[el.id] = el.version;
                });

                api.updateScene({
                    elements: incomingElements, // Excalidraw merges by ID automatically
                    appState: { ...appState, collaborators: [] },
                    commitToHistory: false
                });
                setTimeout(() => receivingRef.current = false, 0);
            })
            .subscribe();

        ref.current = channel;
        return () => { supabase.removeChannel(channel); };
    }, []);

    // Main Channel (Auth + Draw)
    useEffect(() => {
        if (!roomId) return;

        const channel = supabase.channel(roomId, {
            config: { broadcast: { self: false, ack: false } }
        })
            .on('broadcast', { event: 'request-access' }, (payload) => {
                if (localStorage.getItem(`vdraw-host-${roomId}`) === 'true') {
                    const reqId = payload.payload.requesterId;
                    setRequests(prev => !prev.includes(reqId) ? [...prev, reqId] : prev);
                    if (!requests.includes(reqId)) toast.info("New request to join!");
                }
            })
            .on('broadcast', { event: 'grant-access' }, (payload) => {
                if (payload.payload.targetId === myId.current) {
                    setHasAccess(true);
                    setIsRequesting(false);
                    localStorage.setItem(`vdraw-access-${roomId}`, 'true');
                    toast.success("Access Granted!");
                    // Force reload if needed, or rely on useEffect
                }
            })
            .on('broadcast', { event: 'deny-access' }, (payload) => {
                if (payload.payload.targetId === myId.current) {
                    setIsRequesting(false);
                    toast.error("Access Denied");
                }
            });

        // Add Draw Listener Manually to reuse logic? Or just use setupChannel for pure data?
        channel.on('broadcast', { event: 'draw-update' }, (payload) => {
            if (!excalidrawAPI) return;
            isReceivingUpdate.current = true;
            const { elements, appState } = payload.payload;
            elements.forEach((el: any) => { lastVersions.current[el.id] = el.version; });
            excalidrawAPI.updateScene({ elements, appState: { ...appState, collaborators: [] }, commitToHistory: false });
            setTimeout(() => isReceivingUpdate.current = false, 0);
        }).subscribe((status) => {
            if (status === 'SUBSCRIBED') console.log(`Connected to Main channel`);
        });

        channelRef.current = channel;
        return () => { supabase.removeChannel(channel); channelRef.current = null; };
    }, [roomId, excalidrawAPI]); // Intentionally re-run if API changes to bind correctly




    // --- SAVING & BROADCASTING ---
    const saveData = async (id: string, elements: any, appState: any) => {
        try {
            await supabase.from("drawings").upsert({
                id: id,
                elements,
                app_state: { ...appState, collaborators: [] }
            });
        } catch (e) { console.error("Save error", e); }
    };

    const broadcastData = async (channel: any, elements: any[], appState: any, versionsRef: any, receivingRef: any) => {
        if (!channel) return;
        const changed = elements.filter(el => {
            const last = versionsRef.current[el.id] || -1;
            if (el.version > last) {
                versionsRef.current[el.id] = el.version;
                return true;
            }
            return false;
        });
        if (changed.length === 0) return;
        await channel.send({
            type: 'broadcast', event: 'draw-update',
            payload: { elements: changed, appState: { viewBackgroundColor: appState.viewBackgroundColor } }
        });
    };

    const debouncedSaveMain = useCallback(debounce((e, s) => saveData(roomId, e, s), 2000), [roomId]);
    const throttledBroadcastMain = useCallback(throttle((e, s) => broadcastData(channelRef.current, e, s, lastVersions, isReceivingUpdate), 30), []);

    // --- FILE HANDLING ---
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);

    const insertToScene = async (api: any, blob: Blob, opts?: { x?: number, y?: number, locked?: boolean }) => {
        if (!api) return;
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => {
            const dataURL = reader.result as string;
            const img = new Image();
            img.onload = () => {
                const { width, height } = img;
                const fileId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
                const appState = api.getAppState();
                const x = opts?.x ?? (appState.scrollX + (appState.width || window.innerWidth) / 2 - width / 2);
                const y = opts?.y ?? (appState.scrollY + (appState.height || window.innerHeight) / 2 - height / 2);

                const element = {
                    id: fileId,
                    type: "image",
                    x, y, width, height,
                    fileId,
                    status: "saved", version: 1, versionNonce: Date.now(), isDeleted: false,
                    fillStyle: "hachure", strokeWidth: 1, strokeStyle: "solid", roughness: 1, opacity: 100,
                    groupIds: [], strokeColor: "#000000", backgroundColor: "transparent", angle: 0,
                    seed: Date.now(), updated: Date.now(), link: null,
                    locked: opts?.locked ?? false
                };
                const fileData = { id: fileId, mimeType: blob.type, dataURL, created: Date.now(), lastRetrieved: Date.now() };

                if (api.addFiles) {
                    api.addFiles([fileData]);
                    api.updateScene({ elements: [...api.getSceneElements(), element], commitToHistory: true });
                } else {
                    api.updateScene({
                        elements: [...api.getSceneElements(), element],
                        appState: { ...appState, files: { ...appState.files, [fileId]: fileData } },
                        commitToHistory: true
                    });
                }
            };
            img.src = dataURL;
        };
    };



    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = ""; // Reset

        if (file.type !== "application/pdf") {
            toast.error("Please select a valid PDF file.");
            return;
        }

        if (!excalidrawAPI) return;

        toast.loading("Parsing PDF Document...");

        try {
            // @ts-expect-error: dynamic import handling
            const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
            const pdfjsLib = pdfjs.default || pdfjs;
            if (!pdfjsLib?.GlobalWorkerOptions) throw new Error("PDF Lib Error");
            const version = pdfjsLib.version || "5.4.530";
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

            const arrayBuffer = await file.arrayBuffer();
            const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            toast.dismiss();
            toast.message(`Importing ${doc.numPages} pages...`, {
                description: "This might take a moment."
            });

            const SPACING = 50;
            // Start slightly below current view
            let currentY = excalidrawAPI.getAppState().scrollY + 100;
            const startX = excalidrawAPI.getAppState().scrollX + 100;

            for (let i = 1; i <= doc.numPages; i++) {
                const page = await doc.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 }); // High res
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");

                if (context) {
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({ canvasContext: context, viewport }).promise;

                    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
                    if (blob) {
                        await insertToScene(excalidrawAPI, blob, {
                            x: startX,
                            y: currentY,
                            locked: true
                        });
                        currentY += viewport.height + SPACING;
                    }
                }
                // Optional: Toast progress
                if (i % 5 === 0) toast.loading(`Imported ${i}/${doc.numPages} pages...`);
            }

            toast.dismiss();
            toast.success("Document Imported Successfully");

        } catch (error: any) {
            console.error(error);
            toast.error("Import Failed: " + error.message);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        e.target.value = "";
        toast.loading("Processing...");

        for (const file of files) {
            if (excalidrawAPI && file.type.startsWith("image/")) {
                await insertToScene(excalidrawAPI, file);
            } else {
                toast.error("Only images are supported.");
            }
        }
        toast.dismiss();
    };

    const handleTextToDiagram = async () => {
        if (!excalidrawAPI) return;
        const input = prompt("Enter Mermaid Syntax (e.g. graph TD; A-->B;):", "graph TD; A[Start]-->B[End];");
        if (!input) return;

        toast.loading("Rendering Diagram...");
        try {
            // Lazy load mermaid
            // Lazy load mermaid
            const mermaid = (await import("mermaid")).default;
            mermaid.initialize({ startOnLoad: false, theme: 'dark' });

            const id = `mermaid-${Date.now()}`;
            const { svg } = await mermaid.render(id, input);

            // Convert SVG string to Blob
            const blob = new Blob([svg], { type: "image/svg+xml" });
            const url = URL.createObjectURL(blob);

            // We need to bake it to a canvas/png because Excalidraw handles images better
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = async () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width * 2; // High res
                canvas.height = img.height * 2;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.scale(2, 2);
                    ctx.drawImage(img, 0, 0);
                    try {
                        canvas.toBlob(async (pngBlob) => {
                            if (pngBlob) {
                                await insertToScene(excalidrawAPI, pngBlob, { locked: false });
                                toast.success("Diagram Created!");
                            }
                            URL.revokeObjectURL(url);
                        }, 'image/png');
                    } catch (err) {
                        console.error(err);
                        URL.revokeObjectURL(url);
                    }
                } else {
                    URL.revokeObjectURL(url);
                }
            };
            img.src = url;

        } catch (e: any) {
            console.error(e);
            toast.error("Diagram Error: " + e.message);
        } finally {
            toast.dismiss();
        }
    };

    // --- CUSTOM VDRAW ACTIONS ---
    const handleSaveToDisk = async () => {
        if (!excalidrawAPI) return;
        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();
        const json = serializeAsJSON(elements, appState, excalidrawAPI.getFiles(), "local");

        const blob = new Blob([json], { type: "application/json" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `vdraw-${new Date().toISOString().slice(0, 10)}.vdraw`;
        link.click();
        window.URL.revokeObjectURL(url);
        toast.success("Saved to Disk");
    };

    const handleExportImage = async () => {
        if (!excalidrawAPI) return;
        try {
            const blob = await exportToBlob({
                elements: excalidrawAPI.getSceneElements(),
                mimeType: "image/png",
                appState: { ...excalidrawAPI.getAppState(), exportBackground: true, viewBackgroundColor: excalidrawAPI.getAppState().viewBackgroundColor },
                files: excalidrawAPI.getFiles(),
            });
            if (blob) {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `vdraw-export-${new Date().toISOString().slice(0, 10)}.png`;
                link.click();
                window.URL.revokeObjectURL(url);
                toast.success("Exported as Image");
            }
        } catch (e: any) {
            toast.error("Export Failed: " + e.message);
        }
    };

    const handleClearCanvas = () => {
        if (!excalidrawAPI) return;
        if (window.confirm("Clear the entire board?")) {
            excalidrawAPI.resetScene();
            toast.success("Board Cleared");
        }
    }


    // --- ACCESS & AUTH ACTIONS ---
    const requestAccess = async () => {
        if (!channelRef.current) return;
        setIsRequesting(true);
        await channelRef.current.send({ type: 'broadcast', event: 'request-access', payload: { requesterId: myId.current } });
        toast.info("Knocking...");
    };
    const grantAccess = async (targetId: string) => {
        if (!channelRef.current) return;
        await channelRef.current.send({ type: 'broadcast', event: 'grant-access', payload: { targetId } });
        setRequests(prev => prev.filter(id => id !== targetId));
    };
    const denyAccess = async (targetId: string) => {
        if (!channelRef.current) return;
        await channelRef.current.send({ type: 'broadcast', event: 'deny-access', payload: { targetId } });
        setRequests(prev => prev.filter(id => id !== targetId));
    };


    if (!mounted) return <div className="flex flex-col items-center justify-center h-screen w-screen bg-neutral-950 text-white"><Loader2 className="w-10 h-10 animate-spin text-violet-500 mb-4" /><div className="text-xl font-medium tracking-wide">Initializing Vdraw...</div></div>;

    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center h-screen w-screen bg-neutral-950 text-white p-6 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-96 h-96 bg-violet-600/20 rounded-full blur-[128px] pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-[128px] pointer-events-none" />
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="z-10 bg-neutral-900/50 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-2xl shadow-2xl w-[90%] max-w-md text-center">
                    <div className="mx-auto w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-inner"><Lock className="w-8 h-8 text-neutral-400" /></div>
                    <h2 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">Waiting Room</h2>
                    <p className="text-neutral-400 mb-8 leading-relaxed">This room is locked by the host.<br />knock to request access.</p>
                    <button onClick={requestAccess} disabled={isRequesting} className={`relative w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden ${isRequesting ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg'}`}>
                        {isRequesting ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Waiting for Host...</span></> : <><DoorOpen className="w-6 h-6" /><span>Knock to Enter</span></>}
                    </button>
                    {isRequesting && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-xs text-neutral-500">Sit tight! The host has been notified.</motion.p>}
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex h-[100dvh] w-screen overflow-hidden bg-neutral-950 relative">
            {/* LEFT PANEL: MAIN CANVAS */}
            <div className="flex-1 relative transition-all duration-300">
                <Excalidraw
                    name="Vdraw Main"
                    theme="dark"
                    excalidrawAPI={(api) => setExcalidrawAPI(api)}
                    onChange={(elements, appState) => {
                        debouncedSaveMain(elements, appState);
                        throttledBroadcastMain(elements, appState);
                    }}
                    UIOptions={{
                        canvasActions: { changeViewBackgroundColor: true, clearCanvas: true, loadScene: false, saveToActiveFile: false, toggleTheme: true, saveAsImage: true },
                    }}
                >
                    <WelcomeScreen>
                        <WelcomeScreen.Center>
                            <WelcomeScreen.Center.Logo>
                                <div className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500 tracking-tight" style={{ filter: 'drop-shadow(0px 0px 20px rgba(139, 92, 246, 0.3))' }}>Vdraw</div>
                            </WelcomeScreen.Center.Logo>
                            <WelcomeScreen.Center.Heading><span className="text-neutral-400 font-normal">Instant Visual Collaboration</span></WelcomeScreen.Center.Heading>
                            <WelcomeScreen.Center.Menu>
                                <div className="flex gap-3 mt-4 flex-wrap justify-center px-4">
                                    <button className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-full text-sm font-medium transition-colors border border-neutral-700">✨ Gen Z</button>
                                    <button className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-full text-sm font-medium transition-colors border border-neutral-700">🔥 Fast</button>
                                    <button className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-full text-sm font-medium transition-colors border border-neutral-700">🤝 Secure</button>
                                </div>
                            </WelcomeScreen.Center.Menu>
                        </WelcomeScreen.Center>
                    </WelcomeScreen>
                    <MainMenu>
                        <MainMenu.Item onSelect={handleSaveToDisk} icon={<Download className="w-4 h-4" />}>Save to Disk</MainMenu.Item>
                        <MainMenu.Item onSelect={handleExportImage} icon={<ImageIcon className="w-4 h-4" />}>Export Image</MainMenu.Item>
                        <MainMenu.Item onSelect={() => fileInputRef.current?.click()} icon={<ImageIcon className="w-4 h-4" />}>Import Image</MainMenu.Item>
                        <MainMenu.Item onSelect={() => pdfInputRef.current?.click()} icon={<FileUp className="w-4 h-4" />}>Import Document (PDF)</MainMenu.Item>
                        <MainMenu.Item onSelect={handleTextToDiagram} icon={<Code className="w-4 h-4" />}>Mermaid to Vdraw</MainMenu.Item>
                        <MainMenu.Separator />
                        <MainMenu.Item onSelect={handleClearCanvas} icon={<Trash2 className="w-4 h-4 text-red-400" />}><span className="text-red-400">Clear Canvas</span></MainMenu.Item>
                        <MainMenu.Separator />
                        <MainMenu.Item onSelect={() => excalidrawAPI.updateScene({ appState: { theme: excalidrawAPI.getAppState().theme === 'light' ? 'dark' : 'light' } })} icon={<Sun className="w-4 h-4" />}>Toggle Theme</MainMenu.Item>
                        <MainMenu.DefaultItems.ChangeCanvasBackground />
                    </MainMenu>
                    <Footer><div className="flex gap-4 p-2 opacity-60 text-xs font-mono text-neutral-500 pointer-events-none select-none"><span>Vdraw v2.0</span><span>•</span><span>Secure</span></div></Footer>

                </Excalidraw>

                {/* Host Requests Floating UI */}
                <AnimatePresence>
                    {isHost && requests.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-24 left-4 right-4 md:left-auto md:bottom-auto md:w-72 md:top-4 z-50 mx-auto md:mx-0">
                            <div className="bg-neutral-900/90 backdrop-blur-md border border-violet-500/30 rounded-2xl shadow-2xl overflow-hidden p-4">
                                <h3 className="text-violet-200 font-bold mb-2 flex justify-between items-center">Join Requests <span className="bg-violet-500 text-white text-xs px-2 rounded-full">{requests.length}</span></h3>
                                <div className="max-h-64 overflow-y-auto flex flex-col gap-2">
                                    {requests.map(reqId => (
                                        <motion.div key={reqId} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-between items-center bg-neutral-800 p-2 rounded-lg">
                                            <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-[10px] font-bold">{reqId.slice(0, 2)}</div><span className="text-sm text-neutral-300">Guest {reqId.slice(0, 4)}</span></div>
                                            <div className="flex gap-2">
                                                <button onClick={() => grantAccess(reqId)} className="text-emerald-400 hover:text-emerald-300"><Check className="w-4 h-4" /></button>
                                                <button onClick={() => denyAccess(reqId)} className="text-rose-400 hover:text-rose-300"><X className="w-4 h-4" /></button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>


            <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/*" multiple onChange={handleFileUpload} />
            <input type="file" ref={pdfInputRef} style={{ display: "none" }} accept="application/pdf" onChange={handlePdfUpload} />

            {/* SUPER FEATURES LAYERS */}
            <AtmosphereController />
        </div>
    );
}
