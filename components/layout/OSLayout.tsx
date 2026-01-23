"use client";
import React from "react";
import { useStore } from "@/lib/store";
import FloatingWindow from "@/components/ui/FloatingWindow";
import BookBrowser from "../tools/BookBrowser";
import PhysicsWidget from "../tools/PhysicsWidget";
import PhysicsOverlay from "../tools/PhysicsOverlay";
import { BookOpen, Activity, Code } from "lucide-react";
import DiagramBuilder from "../tools/DiagramBuilder";
import TeacherControl from "../tools/TeacherControl";

interface OSLayoutProps {
    excalidrawAPI: any;
    channel?: any;
}

export default function OSLayout({ excalidrawAPI, channel }: OSLayoutProps) {
    const { openWindows } = useStore();

    return (
        <>
            {/* Headless Tools */}
            {openWindows.includes('physics') && <PhysicsOverlay excalidrawAPI={excalidrawAPI} />}

            {/* Physics Window */}
            {openWindows.includes('physics') && (
                <FloatingWindow
                    id="physics"
                    title="Physics Lab"
                    icon={<Activity className="w-4 h-4 text-violet-400" />}
                    defaultSize={{ w: 350, h: 450 }}
                    initialPos={{ x: 50, y: 100 }}
                >
                    <PhysicsWidget />
                </FloatingWindow>
            )}

            {/* Books Window */}
            {openWindows.includes('books') && (
                <FloatingWindow
                    id="books"
                    title="V-Book Library"
                    icon={<BookOpen className="w-4 h-4 text-emerald-400" />}
                    defaultSize={{ w: 900, h: 600 }}
                    initialPos={{ x: 100, y: 50 }}
                >
                    <BookBrowser excalidrawAPI={excalidrawAPI} />
                </FloatingWindow>
            )}

            {/* Teacher Toolkit Window */}
            {openWindows.includes('toolkit') && (
                <FloatingWindow
                    id="toolkit"
                    title="Teacher Command"
                    icon={<Activity className="w-4 h-4 text-orange-400" />}
                    defaultSize={{ w: 350, h: 420 }}
                    initialPos={{ x: window.innerWidth - 400, y: 100 }}
                >
                    <TeacherControl channel={channel} />
                </FloatingWindow>
            )}

            {/* Diagram Builder Window */}
            {openWindows.includes('diagrams') && (
                <FloatingWindow
                    id="diagrams"
                    title="Diagram Builder"
                    icon={<Code className="w-4 h-4 text-pink-400" />}
                    defaultSize={{ w: 800, h: 500 }}
                    initialPos={{ x: 150, y: 150 }}
                >
                    <DiagramBuilder excalidrawAPI={excalidrawAPI} />
                </FloatingWindow>
            )}
        </>
    );
}
