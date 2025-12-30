"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { Excalidraw, MainMenu, WelcomeScreen, Footer } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { supabase } from "../lib/supabaseClient";
import debounce from "lodash.debounce";

// Define a minimal type for what we expect from Excalidraw logic if official types are tricky
// But we should try to use them if possible. For now, letting 'any' handle complex internal types 
// to ensure build passes without deep diving into package internals is a safe strategy for a rapid prototype,
// but we will cast as needed.

export default function Whiteboard({ roomId }: { roomId: string }) {
    const [mounted, setMounted] = useState(false);
    const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
    const channelRef = useRef<any>(null);
    const isReceivingUpdate = useRef(false);

    // Access Control State
    const [isHost, setIsHost] = useState(false);
    const [hasAccess, setHasAccess] = useState(false);
    const [requests, setRequests] = useState<string[]>([]);
    const myId = useRef(typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString());

    useEffect(() => {
        setMounted(true);
        // @ts-ignore
        // window.EXCALIDRAW_ASSET_PATH = "/"; 

        // Check Access Permissions
        const isOwner = localStorage.getItem(`vdraw-host-${roomId}`) === 'true';
        const canEnter = localStorage.getItem(`vdraw-access-${roomId}`) === 'true';

        setIsHost(isOwner);
        if (isOwner || canEnter) {
            setHasAccess(true);
        }
    }, [roomId]);

    // Initialize Realtime Channel
    useEffect(() => {
        if (!roomId) return; // Channel can init without API for negotiating access

        const channel = supabase.channel(roomId)
            .on('broadcast', { event: 'request-access' }, (payload) => {
                const amIHost = localStorage.getItem(`vdraw-host-${roomId}`) === 'true';
                if (amIHost) {
                    setRequests(prev => {
                        if (!prev.includes(payload.payload.requesterId)) {
                            return [...prev, payload.payload.requesterId];
                        }
                        return prev;
                    });
                }
            })
            .on('broadcast', { event: 'grant-access' }, (payload) => {
                if (payload.payload.targetId === myId.current) {
                    setHasAccess(true);
                    localStorage.setItem(`vdraw-access-${roomId}`, 'true');
                }
            })
            .on('broadcast', { event: 'draw-update' }, (payload) => {
                if (!excalidrawAPI) return;

                isReceivingUpdate.current = true;
                const { elements, appState } = payload.payload;
                excalidrawAPI.updateScene({
                    elements,
                    appState: { ...appState, collaborators: [] }
                });
                setTimeout(() => isReceivingUpdate.current = false, 0);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`Connected to Realtime channel: ${roomId}`);
                }
            });

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [roomId, excalidrawAPI]);

    // Helper: Request Access
    const requestAccess = async () => {
        if (!channelRef.current) {
            alert("Waiting for connection...");
            return;
        }
        await channelRef.current.send({
            type: 'broadcast',
            event: 'request-access',
            payload: { requesterId: myId.current }
        });
        alert("Request sent! Waiting for host approval...");
    };

    // Helper: Grant Access
    const grantAccess = async (targetId: string) => {
        if (!channelRef.current) return;
        await channelRef.current.send({
            type: 'broadcast',
            event: 'grant-access',
            payload: { targetId }
        });
        setRequests(prev => prev.filter(id => id !== targetId)); // Remove from pending
    };

    useEffect(() => {
        if (!excalidrawAPI || !roomId || !hasAccess) return;

        const loadDrawing = async () => {
            // Load saved drawing
            const { data, error } = await supabase
                .from("drawings")
                .select("*")
                .eq("id", roomId)
                .single();

            // Check for mobile/tablet width
            const isMobile = window.innerWidth < 768;

            // Prepare base appState overrides
            const mobileOverrides = isMobile ? {
                zenModeEnabled: true,
                activeTool: { type: "hand", lastActiveTool: null, locked: false, customType: null },
            } : {};

            if (error || !data) {
                console.log("No previous drawing found, initializing new canvas.");
                excalidrawAPI.updateScene({
                    elements: [],
                    appState: {
                        ...excalidrawAPI.getAppState(),
                        collaborators: [],
                        theme: "dark",
                        ...mobileOverrides
                    }
                });
            } else if (data && data.elements && data.app_state) {
                excalidrawAPI.updateScene({
                    elements: data.elements,
                    appState: {
                        ...data.app_state,
                        theme: "dark",
                        ...mobileOverrides
                    },
                });
            }


            // Load Custom Vdraw Libraries from /api/libraries
            try {
                const listRes = await fetch("/api/libraries");
                if (listRes.ok) {
                    const { files } = await listRes.json();

                    // Filter duplicates if any or merge logic could go here
                    // We will collect all items from all libraries found
                    let allLibraryItems: any[] = [];

                    for (const fileName of files) {
                        try {
                            const libRes = await fetch(`/libraries/${fileName}`);
                            if (libRes.ok) {
                                const libData = await libRes.json();
                                if (libData?.libraryItems) {
                                    allLibraryItems = [...allLibraryItems, ...libData.libraryItems];
                                }
                            }
                        } catch (innerErr) {
                            console.error(`Failed to load specific library file: ${fileName}`, innerErr);
                        }
                    }

                    if (allLibraryItems.length > 0) {
                        excalidrawAPI.updateLibrary({
                            libraryItems: allLibraryItems,
                            openLibraryMenu: false, // Ensure menu stays closed/hidden
                        });
                    }
                }
            } catch (e) {
                console.error("Failed to load Vdraw libraries", e);
            }
        };

        loadDrawing();
    }, [excalidrawAPI, roomId, hasAccess]);

    const saveDrawing = async (elements: any, appState: any) => {
        // Reset collaborators to an array so it can be saved as JSON
        const cleanAppState = {
            ...appState,
            collaborators: [],
        };

        const { data, error } = await supabase
            .from("drawings")
            .upsert({ id: roomId, elements, app_state: cleanAppState })
            .select();

        if (error) {
            console.error("Error saving drawing:", error);
        }
    };

    // Debounce the save function to run at most once every 2 seconds
    const debouncedSave = useCallback(
        debounce((elements, appState) => saveDrawing(elements, appState), 2000),
        [roomId]
    );

    // Broadcast changes to peers (Throttled)
    const broadcastDrawing = async (elements: any, appState: any) => {
        if (!channelRef.current || isReceivingUpdate.current) return;

        await channelRef.current.send({
            type: 'broadcast',
            event: 'draw-update',
            payload: {
                elements,
                appState: {
                    viewBackgroundColor: appState.viewBackgroundColor
                }
            }
        });
    };

    const throttledBroadcast = useCallback(
        debounce((elements, appState) => broadcastDrawing(elements, appState), 100), // 100ms throttle-like behavior
        []
    );

    const handleChange = (elements: any, appState: any) => {
        if (isReceivingUpdate.current) return;

        debouncedSave(elements, appState);
        throttledBroadcast(elements, appState);
    };

    if (!mounted) {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-neutral-900 text-white font-bold text-xl">
                Loading Vdraw...
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center h-screen w-screen bg-neutral-900 text-white p-4">
                <div className="mb-4 text-2xl font-bold">🔒 Waiting Room</div>
                <p className="mb-6 opacity-80">This room is private. Ask the host to let you in.</p>
                <button
                    onClick={requestAccess}
                    className="px-6 py-3 bg-violet-600 rounded-lg hover:bg-violet-700 transition"
                >
                    🚪 Knock to Enter
                </button>
            </div>
        );
    }

    return (
        <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
            <Excalidraw
                name="Vdraw"
                initialData={{
                    libraryItems: [],
                }}
                UIOptions={{
                    dockedSidebarBreakpoint: 768,
                    // @ts-ignore
                    helpDialog: { socials: false },
                    canvasActions: {
                        changeViewBackgroundColor: true,
                        clearCanvas: true, // Allow host to clear? Everyone can clear basically.
                        loadScene: false, // Disable external file loading
                        saveToActiveFile: false, // Disable saving to active file
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
                            <div className="text-4xl font-bold text-violet-600">Vdraw</div>
                        </WelcomeScreen.Center.Logo>
                        <WelcomeScreen.Center.Heading>
                            Welcome to Vdraw!
                        </WelcomeScreen.Center.Heading>
                        <WelcomeScreen.Center.Menu>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                <button
                                    onClick={() => alert("It’s not a bug, it’s a feature. Periodt. 💅")}
                                    className="custom-quote-btn"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        backgroundColor: '#2d2d3a', // Matching the button bg in image
                                        color: '#e0e0e0',
                                        border: '1px solid #4a4a5a',
                                        padding: '10px 16px',
                                        borderRadius: '8px',
                                        fontSize: '0.9rem',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s',
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3d3d4d'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2d2d3a'}
                                >
                                    💅 Debug? No, Delulu.
                                </button>
                                <button
                                    onClick={() => alert("Me 🤝 Writing code I don't understand.")}
                                    className="custom-quote-btn"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        backgroundColor: '#2d2d3a',
                                        color: '#e0e0e0',
                                        border: '1px solid #4a4a5a',
                                        padding: '10px 16px',
                                        borderRadius: '8px',
                                        fontSize: '0.9rem',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s',
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3d3d4d'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2d2d3a'}
                                >
                                    🤝 Brain.exe stopped
                                </button>
                                <button
                                    onClick={() => alert("This code is mid, but it works.")}
                                    className="custom-quote-btn"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        backgroundColor: '#2d2d3a',
                                        color: '#e0e0e0',
                                        border: '1px solid #4a4a5a',
                                        padding: '10px 16px',
                                        borderRadius: '8px',
                                        fontSize: '0.9rem',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s',
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3d3d4d'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2d2d3a'}
                                >
                                    🚫 No Cap.
                                </button>
                                <button
                                    onClick={() => alert("Slay the bugs!")}
                                    className="custom-quote-btn"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        backgroundColor: '#2d2d3a',
                                        color: '#e0e0e0',
                                        border: '1px solid #4a4a5a',
                                        padding: '10px 16px',
                                        borderRadius: '8px',
                                        fontSize: '0.9rem',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s',
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3d3d4d'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2d2d3a'}
                                >
                                    ✨ Slay the Code
                                </button>
                            </div>
                        </WelcomeScreen.Center.Menu>
                    </WelcomeScreen.Center>
                </WelcomeScreen>
                <MainMenu>
                    {/* LoadScene disabled */}
                    <MainMenu.DefaultItems.Export />
                    <MainMenu.DefaultItems.SaveAsImage />
                    <MainMenu.DefaultItems.ClearCanvas />
                    <MainMenu.Separator />
                    <MainMenu.DefaultItems.ToggleTheme />
                    <MainMenu.DefaultItems.ChangeCanvasBackground />
                    <MainMenu.Separator />
                    <MainMenu.Item onSelect={() => { }}>Vdraw v1.0</MainMenu.Item>
                </MainMenu>

                <Footer>
                    <div className="custom-footer" style={{ display: 'flex', gap: '10px', padding: '10px', pointerEvents: 'auto' }}>
                        <button
                            onClick={() => alert("It’s not a bug, it’s a feature. Periodt. 💅")}
                            style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                        >
                            Debug? No, Delulu.
                        </button>
                        <button
                            onClick={() => alert("Me 🤝 Writing code I don't understand.")}
                            style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                        >
                            Brain.exe stopped working
                        </button>
                        <button
                            onClick={() => alert("This code is mid, but it works.")}
                            style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                        >
                            No Cap.
                        </button>
                    </div>
                </Footer>
            </Excalidraw>

            {/* Host Requests Panel */}
            {isHost && requests.length > 0 && (
                <div className="absolute top-4 right-4 bg-neutral-800 text-white p-4 rounded-lg shadow-lg z-50 w-64">
                    <h3 className="font-bold mb-2">🔔 Join Requests</h3>
                    <div className="flex flex-col gap-2">
                        {requests.map((reqId) => (
                            <div key={reqId} className="flex items-center justify-between text-sm bg-neutral-700 p-2 rounded">
                                <span>Guest {reqId.slice(0, 4)}</span>
                                <button
                                    onClick={() => grantAccess(reqId)}
                                    className="px-2 py-1 bg-green-600 text-xs rounded hover:bg-green-700"
                                >
                                    Allow
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
