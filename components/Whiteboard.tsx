"use client";
import React, { useEffect, useState, useCallback } from "react";
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

    useEffect(() => {
        setMounted(true);
        // @ts-ignore
        // window.EXCALIDRAW_ASSET_PATH = "/"; 
    }, []);

    useEffect(() => {
        if (!excalidrawAPI || !roomId) return;

        const loadDrawing = async () => {
            // Load saved drawing
            const { data, error } = await supabase
                .from("drawings")
                .select("*")
                .eq("id", roomId)
                .single();

            if (error || !data) {
                console.log("No previous drawing found, initializing new canvas.");
                excalidrawAPI.updateScene({
                    elements: [],
                    appState: { ...excalidrawAPI.getAppState(), collaborators: [], theme: "dark" }
                });
            } else if (data && data.elements && data.app_state) {
                excalidrawAPI.updateScene({
                    elements: data.elements,
                    appState: { ...data.app_state, theme: "dark" },
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
    }, [excalidrawAPI, roomId]);

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
        } else {
            console.log("Drawing saved successfully", data);
        }
    };

    // Debounce the save function to run at most once every 2 seconds
    const debouncedSave = useCallback(
        debounce((elements, appState) => saveDrawing(elements, appState), 2000),
        [roomId] // Re-create debounce if roomId changes
    );

    if (!mounted) {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-neutral-900 text-white font-bold text-xl">
                Loading Vdraw...
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
                    // @ts-ignore
                    helpDialog: { socials: false },
                    canvasActions: {
                        changeViewBackgroundColor: true,
                        clearCanvas: true,
                        loadScene: false, // Disable external file loading
                        saveToActiveFile: false, // Disable saving to active file
                        toggleTheme: true,
                        saveAsImage: true,
                    },
                }}
                excalidrawAPI={(api) => setExcalidrawAPI(api)}
                theme="dark"
                onChange={(elements, appState) => debouncedSave(elements, appState)}
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
        </div>
    );
}
