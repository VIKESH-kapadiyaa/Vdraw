"use client";
import React, { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { useStore } from "@/lib/store";

interface PhysicsOverlayProps {
    excalidrawAPI: any;
}

export default function PhysicsOverlay({ excalidrawAPI }: PhysicsOverlayProps) {
    const sceneRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<Matter.Engine | null>(null);
    const renderRef = useRef<Matter.Render | null>(null);
    const runnerRef = useRef<Matter.Runner | null>(null);

    // Sync state
    const bodiesMap = useRef<Map<string, Matter.Body>>(new Map());

    // Store
    const { isPhysicsPlaying } = useStore();

    useEffect(() => {
        if (!sceneRef.current || !excalidrawAPI) return;

        // 1. Setup Matter.js
        const Engine = Matter.Engine,
            Render = Matter.Render,
            Runner = Matter.Runner,
            MouseConstraint = Matter.MouseConstraint,
            Mouse = Matter.Mouse,
            Composite = Matter.Composite;

        const engine = Engine.create();
        const world = engine.world;

        // Render is helpful for debug, but we hide it usually
        const render = Render.create({
            element: sceneRef.current,
            engine: engine,
            options: {
                width: window.innerWidth,
                height: window.innerHeight,
                wireframes: false,
                background: 'transparent',
                pixelRatio: window.devicePixelRatio
            }
        });

        // 2. Load Elements
        const elements = excalidrawAPI.getSceneElements();
        const bodies: Matter.Body[] = [];

        elements.forEach((el: any) => {
            if (el.isDeleted) return;
            if (el.customData?.hasPhysics === false) return;

            let body: Matter.Body | null = null;
            const options = {
                isStatic: el.strokeStyle === 'dashed' || el.locked,
                friction: 0.5,
                restitution: 0.6
            };

            if (el.type === 'rectangle' || el.type === 'image' || el.type === 'text') {
                body = Matter.Bodies.rectangle(el.x + el.width / 2, el.y + el.height / 2, el.width, el.height, options);
            } else if (el.type === 'ellipse') {
                body = Matter.Bodies.circle(el.x + el.width / 2, el.y + el.height / 2, el.width / 2, options);
            }

            if (body) {
                body.label = el.id;
                bodies.push(body);
                bodiesMap.current.set(el.id, body);
            }
        });

        const floor = Matter.Bodies.rectangle(window.innerWidth / 2, window.innerHeight + 500, window.innerWidth * 2, 1000, { isStatic: true });
        bodies.push(floor);

        Composite.add(world, bodies);

        // 3. Mouse
        const mouse = Mouse.create(render.canvas);
        const mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: { stiffness: 0.2, render: { visible: false } }
        });
        Composite.add(world, mouseConstraint);
        render.mouse = mouse;

        // 4. Run
        Render.run(render);
        const runner = Runner.create();
        // Don't run automatically here, wait for prop? 
        // Or run and pause?
        // Let's run, and we control via runner
        Runner.run(runner, engine);

        engineRef.current = engine;
        renderRef.current = render;
        runnerRef.current = runner;

        // 5. Sync Loop
        const syncInterval = setInterval(() => {
            if (!engineRef.current || !excalidrawAPI) return;

            const allElements = excalidrawAPI.getSceneElements();
            const updatedElements = allElements.map((el: any) => {
                const body = bodiesMap.current.get(el.id);
                if (body && !body.isStatic) {
                    const newX = body.position.x - el.width / 2;
                    const newY = body.position.y - el.height / 2;
                    const newAngle = body.angle;

                    if (Math.abs(el.x - newX) > 0.1 || Math.abs(el.y - newY) > 0.1 || Math.abs(el.angle - newAngle) > 0.01) {
                        return { ...el, x: newX, y: newY, angle: newAngle };
                    }
                }
                return el;
            });

            excalidrawAPI.updateScene({ elements: updatedElements, commitToHistory: false });
        }, 16);

        return () => {
            clearInterval(syncInterval);
            Render.stop(render);
            Runner.stop(runner);
            if (render.canvas) render.canvas.remove();
            engineRef.current = null;
        };
    }, [excalidrawAPI]); // Re-init if API changes (should change only once)

    // Handle Play/Pause
    useEffect(() => {
        if (!runnerRef.current || !engineRef.current) return;
        if (isPhysicsPlaying) {
            Matter.Runner.run(runnerRef.current, engineRef.current);
            runnerRef.current.enabled = true;
        } else {
            Matter.Runner.stop(runnerRef.current);
            runnerRef.current.enabled = false;
        }
    }, [isPhysicsPlaying]);

    return (
        <div ref={sceneRef} className="fixed inset-0 pointer-events-none z-0 opacity-0" />
    );
}
