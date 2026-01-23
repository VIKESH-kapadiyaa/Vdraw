"use client";
import React from "react";
import { Play, Pause, RefreshCw } from "lucide-react";
import { useStore } from "@/lib/store";

export default function PhysicsWidget() {
    const { isPhysicsPlaying, togglePhysicsParams } = useStore();

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-6">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all ${isPhysicsPlaying ? 'border-green-500 bg-green-500/10' : 'border-neutral-700 bg-neutral-800'}`}>
                {isPhysicsPlaying ? <Play className="w-10 h-10 text-green-500 fill-current" /> : <Pause className="w-10 h-10 text-neutral-500" />}
            </div>

            <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Gravity Simulation</h3>
                <p className="text-sm text-neutral-400 max-w-[200px]">Objects with solid lines will fall. Dashed lines are static.</p>
            </div>

            <div className="flex gap-4">
                <button
                    onClick={() => togglePhysicsParams()}
                    className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${isPhysicsPlaying ? 'bg-red-500 hover:bg-red-400 text-white' : 'bg-green-600 hover:bg-green-500 text-white'}`}
                >
                    {isPhysicsPlaying ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Start</>}
                </button>

                <button className="px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-colors">
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
