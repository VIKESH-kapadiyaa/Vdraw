/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { Play, Pause, RefreshCw, MousePointer2 } from 'lucide-react';
import { toast } from 'sonner';

interface PhysicsCanvasProps {
    excalidrawAPI: any;
    isOpen: boolean;
    onClose: () => void;
}

export default function PhysicsCanvas({ excalidrawAPI, isOpen, onClose }: PhysicsCanvasProps) {
    const sceneRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<Matter.Engine | null>(null);
    const renderRef = useRef<Matter.Render | null>(null);
    const runnerRef = useRef<Matter.Runner | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Sync state
    const bodiesMap = useRef<Map<string, Matter.Body>>(new Map());

    useEffect(() => {
        if (!isOpen || !sceneRef.current || !excalidrawAPI) return;

        // 1. Setup Matter.js
        const Engine = Matter.Engine,
            Render = Matter.Render,
            Runner = Matter.Runner,
            MouseConstraint = Matter.MouseConstraint,
            Mouse = Matter.Mouse,
            World = Matter.World,
            Composite = Matter.Composite; // Use Composite instead of pure World

        const engine = Engine.create();
        const world = engine.world;

        const render = Render.create({
            element: sceneRef.current,
            engine: engine,
            options: {
                width: window.innerWidth,
                height: window.innerHeight,
                wireframes: false, // Set to false to see full bodies if needed, or true for debug
                background: 'transparent',
                pixelRatio: window.devicePixelRatio
            }
        });

        // 2. Load Elements from Excalidraw
        const elements = excalidrawAPI.getSceneElements();
        const bodies: Matter.Body[] = [];

        elements.forEach((el: any) => {
            if (el.isDeleted) return;

            // metadata check
            if (el.customData?.hasPhysics === false) return;

            // Simplified Shape Mapping
            let body: Matter.Body | null = null;
            const options = {
                isStatic: el.strokeStyle === 'dashed' || el.locked, // Dashed/Locked items are static walls
                friction: 0.5,
                restitution: 0.6 // Bounciness
            };

            if (el.type === 'rectangle' || el.type === 'image' || el.type === 'text') {
                body = Matter.Bodies.rectangle(
                    el.x + el.width / 2,
                    el.y + el.height / 2,
                    el.width,
                    el.height,
                    options
                );
            } else if (el.type === 'ellipse') {
                body = Matter.Bodies.circle(
                    el.x + el.width / 2,
                    el.y + el.height / 2,
                    el.width / 2, // Approximate radius
                    options
                );
            }

            if (body) {
                // Determine if 'label' needed for tracking
                body.label = el.id;
                // If the element was centered in Excalidraw, Matter expects center of mass.
                // Excalidraw x/y is top-left.
                // Matter bodies are created at center.
                // Syncing back needs care.

                // Color mapping (optional visual sync, though we are using Excalidraw for render)
                // render.fillStyle is for the Matter canvas debug view
                body.render.fillStyle = el.backgroundColor !== 'transparent' ? el.backgroundColor : '#8b5cf6';
                if (el.backgroundColor === 'transparent') body.render.strokeStyle = el.strokeColor;

                bodies.push(body);
                bodiesMap.current.set(el.id, body);
            }
        });

        // Add Ground/Walls (Invisible boundaries to keep things on screen?)
        // Optional: Let them fall infinitely or add a floor
        const floor = Matter.Bodies.rectangle(window.innerWidth / 2, window.innerHeight, window.innerWidth, 50, { isStatic: true, render: { visible: true, fillStyle: '#333' } });
        bodies.push(floor);

        Composite.add(world, bodies);

        // 3. Mouse Interaction
        const mouse = Mouse.create(render.canvas);
        const mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: { visible: false }
            }
        });
        Composite.add(world, mouseConstraint);
        render.mouse = mouse;

        // 4. Run directly
        Render.run(render);
        const runner = Runner.create();
        Runner.run(runner, engine);

        engineRef.current = engine;
        renderRef.current = render;
        runnerRef.current = runner;
        setIsPlaying(true);


        // 5. Sync Loop: Update Excalidraw elements based on Physics
        const syncInterval = setInterval(() => {
            if (!engineRef.current || !excalidrawAPI) return;

            const allElements = excalidrawAPI.getSceneElements();
            const updatedElements = allElements.map((el: any) => {
                const body = bodiesMap.current.get(el.id);
                if (body && !body.isStatic) {
                    // Start of Excalidraw ele is top-left
                    // Body position is center
                    const newX = body.position.x - el.width / 2;
                    const newY = body.position.y - el.height / 2;
                    const newAngle = body.angle;

                    // Optimization: Only update if changed significantly
                    if (Math.abs(el.x - newX) > 0.1 || Math.abs(el.y - newY) > 0.1 || Math.abs(el.angle - newAngle) > 0.01) {
                        return { ...el, x: newX, y: newY, angle: newAngle };
                    }
                }
                return el;
            });

            // We do NOT commit to history to avoid flooding undo stack
            excalidrawAPI.updateScene({ elements: updatedElements, commitToHistory: false });
        }, 16); // ~60fps sync

        return () => {
            clearInterval(syncInterval);
            Render.stop(render);
            Runner.stop(runner);
            if (render.canvas) render.canvas.remove();
            engineRef.current = null;
            bodiesMap.current.clear();
        };
    }, [isOpen, excalidrawAPI]);

    // Handle Play/Pause if we want to toggle simulation without closing
    const toggleSimulation = () => {
        if (!runnerRef.current || !engineRef.current) return;
        if (isPlaying) {
            Matter.Runner.stop(runnerRef.current);
        } else {
            Matter.Runner.run(runnerRef.current, engineRef.current);
        }
        setIsPlaying(!isPlaying);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] pointer-events-none">
            {/* Control Panel */}
            <div className="absolute top-4 right-4 pointer-events-auto flex items-center gap-2 bg-neutral-900/90 border border-violet-500/30 p-2 rounded-xl backdrop-blur-md shadow-2xl">
                <div className="px-3 py-1 bg-violet-500/20 rounded text-violet-300 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                    Physics Lab
                </div>

                <div className="h-6 w-px bg-white/10 mx-1" />

                <button onClick={toggleSimulation} className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors">
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button onClick={() => { onClose(); }} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors">
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {/* Matter.js Debug Canvas Container (Hidden by default or semi-transparent overlay) */}
            {/* We position it behind the UI but above the canvas if we want debug lines */}
            <div ref={sceneRef} className="absolute inset-0 pointer-events-none opacity-0" />

            {/* Instructional Overlay */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-none text-center">
                <p className="text-white/50 text-sm bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm border border-white/5">
                    "Dashed" lines are static walls. Solid shapes fall.
                </p>
            </div>
        </div>
    );
}
