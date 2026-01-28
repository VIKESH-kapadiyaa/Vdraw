"use client";
import React from 'react';
import { useStore } from '@/lib/store';
import { Lock, LockOpen, Eye, EyeOff, Mic, MicOff, MonitorOff, MousePointerClick } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';

// Helper for broadcasting
const broadcastCommand = async (channel: any, command: string, value: any) => {
    if (!channel) return;
    await channel.send({
        type: 'broadcast',
        event: 'teacher-command',
        payload: { command, value }
    });
};

export default function TeacherControl({ channel, roomId }: { channel: any, roomId?: string }) {
    const {
        isRoomLocked, setRoomLock,
        isFocusMode, setFocusMode,
        isEyesUpMode, setEyesUpMode
    } = useStore();

    const handleLockToggle = async () => {
        const newVal = !isRoomLocked;
        setRoomLock(newVal);
        broadcastCommand(channel, 'set-lock', newVal);
        toast.info(newVal ? "Classroom Locked (Read-Only)" : "Classroom Unlocked");

        if (roomId) {
            const { error } = await supabase.from('rooms').update({ is_locked: newVal }).eq('id', roomId);
            if (error) console.error("Failed to persist lock state:", error);
        }
    };

    const handleFocusToggle = async () => {
        const newVal = !isFocusMode;
        setFocusMode(newVal);
        broadcastCommand(channel, 'set-focus', newVal);
        toast.info(newVal ? "Focus Mode ON: Students following you" : "Focus Mode OFF");
    };

    const handleEyesUpToggle = async () => {
        const newVal = !isEyesUpMode;
        setEyesUpMode(newVal);
        broadcastCommand(channel, 'set-eyes-up', newVal);
        toast.warning(newVal ? "EYES UP: Student screens blacked out" : "Screens Restored");
    };

    return (
        <div className="p-4 space-y-6 text-white">
            {/* Status Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <MonitorOff className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-sm">Teacher Command</h3>
                    <p className="text-xs text-indigo-300">Control student devices</p>
                </div>
            </div>

            {/* Controls Grid */}
            <div className="grid grid-cols-1 gap-3">

                {/* 1. LOCK EDITING */}
                <button
                    onClick={handleLockToggle}
                    className={`group relative overflow-hidden p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 text-left
                    ${isRoomLocked
                            ? 'bg-red-500/20 border-red-500/50 hover:bg-red-500/30'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                >
                    <div className={`p-2 rounded-lg transition-colors ${isRoomLocked ? 'bg-red-500 text-white' : 'bg-white/10 text-neutral-400 group-hover:text-white'}`}>
                        {isRoomLocked ? <Lock className="w-5 h-5" /> : <LockOpen className="w-5 h-5" />}
                    </div>
                    <div>
                        <h4 className={`font-bold text-sm ${isRoomLocked ? 'text-red-200' : 'text-neutral-200'}`}>
                            {isRoomLocked ? "Editing Locked" : "Allow Editing"}
                        </h4>
                        <p className="text-[10px] text-neutral-400">
                            {isRoomLocked ? "Students cannot draw." : "Students can draw freely."}
                        </p>
                    </div>
                </button>

                {/* 2. FOCUS MODE (Follow Me) */}
                <button
                    onClick={handleFocusToggle}
                    className={`group relative overflow-hidden p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 text-left
                    ${isFocusMode
                            ? 'bg-amber-500/20 border-amber-500/50 hover:bg-amber-500/30'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                >
                    <div className={`p-2 rounded-lg transition-colors ${isFocusMode ? 'bg-amber-500 text-black' : 'bg-white/10 text-neutral-400 group-hover:text-white'}`}>
                        <MousePointerClick className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className={`font-bold text-sm ${isFocusMode ? 'text-amber-200' : 'text-neutral-200'}`}>
                            {isFocusMode ? "Focus Lock ON" : "Sync Viewport"}
                        </h4>
                        <p className="text-[10px] text-neutral-400">
                            {isFocusMode ? "Students are locked to your view." : "Force students to see what you see."}
                        </p>
                    </div>
                </button>

                {/* 3. EYES UP (Blackout) */}
                <button
                    onClick={handleEyesUpToggle}
                    className={`group relative overflow-hidden p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 text-left
                    ${isEyesUpMode
                            ? 'bg-neutral-800 border-white/50 ring-1 ring-white/50'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                >
                    <div className={`p-2 rounded-lg transition-colors ${isEyesUpMode ? 'bg-white text-black' : 'bg-white/10 text-neutral-400 group-hover:text-white'}`}>
                        {isEyesUpMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </div>
                    <div>
                        <h4 className={`font-bold text-sm ${isEyesUpMode ? 'text-white' : 'text-neutral-200'}`}>
                            {isEyesUpMode ? "Screens Blacked Out" : "Eyes Up Mode"}
                        </h4>
                        <p className="text-[10px] text-neutral-400">
                            {isEyesUpMode ? "Tap to restore screens." : "Blackout screens to get attention."}
                        </p>
                    </div>
                </button>
            </div>
        </div>
    );
}
