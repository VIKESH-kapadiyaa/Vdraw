"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import {
    Layout, Plus, Search, LogOut, Loader2,
    MoreVertical, Trash2, Clock, Calendar,
    Zap, FolderOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface Room {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
    scene_data: any;
}

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            router.push('/login');
            return;
        }
        setUser(user);
        fetchRooms(user.id);
    };

    const fetchRooms = async (userId: string) => {
        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('owner_id', userId) // We assume owner_id column exists
            .order('updated_at', { ascending: false });

        if (error) {
            console.error("Error fetching rooms", error);
            // Fallback: If owner_id doesn't exist, maybe we just list by local storage or fail gracefully?
            // For now, assume table exists or we need to migrate.
        } else {
            setRooms(data || []);
        }
        setLoading(false);
    };

    const handleCreateRoom = async () => {
        if (!user) return;
        setCreating(true);

        const id = crypto.randomUUID();
        const name = "Untitled Project";

        try {
            const { error } = await supabase
                .from('rooms')
                .insert({
                    id,
                    name,
                    owner_id: user.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    scene_data: {}
                });

            if (error) throw error;

            toast.success("Project Created");
            router.push(`/room/${id}`);
        } catch (e: any) {
            toast.error("Failed to create project: " + e.message);
            setCreating(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this project?")) return;

        const { error } = await supabase.from('rooms').delete().eq('id', id);
        if (error) {
            toast.error("Failed to delete");
        } else {
            setRooms(rooms.filter(r => r.id !== id));
            toast.success("Project deleted");
        }
    };

    const filteredRooms = rooms.filter(r =>
        r.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.id.includes(search)
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-violet-500/30 flex">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/5 bg-neutral-900/50 hidden md:flex flex-col">
                <div className="p-6">
                    <div className="flex items-center gap-2 font-black text-xl tracking-tighter text-white">
                        <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center">
                            <Layout className="w-4 h-4 text-white" />
                        </div>
                        Vdraw
                    </div>
                </div>

                <div className="px-3 py-2 space-y-1">
                    <div className="px-3 py-2 text-xs font-bold text-neutral-500 uppercase tracking-wider">Workspace</div>
                    <button className="flex items-center gap-3 w-full px-3 py-2 bg-white/5 text-white rounded-lg text-sm font-medium">
                        <FolderOpen className="w-4 h-4 text-violet-400" />
                        My Projects
                    </button>
                    <button className="flex items-center gap-3 w-full px-3 py-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
                        <Clock className="w-4 h-4" />
                        Recent
                    </button>
                    <button className="flex items-center gap-3 w-full px-3 py-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
                        <Zap className="w-4 h-4" />
                        Pro Features
                    </button>
                </div>

                <div className="mt-auto p-4 border-t border-white/5">
                    <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 flex items-center justify-center text-black font-bold text-xs">
                            {user.email?.[0].toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <div className="truncate font-medium">{user.email}</div>
                            <div className="text-xs text-neutral-500 capitalize">{user.aud || 'User'}</div>
                        </div>
                        <button
                            onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-red-400 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-screen">
                {/* Header */}
                <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-neutral-900/30 backdrop-blur-xl sticky top-0 z-20">
                    <h1 className="text-lg font-medium">My Projects</h1>
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-violet-400 transition-colors" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search..."
                                className="pl-9 pr-4 py-2 bg-neutral-800 border border-white/5 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 focus:bg-neutral-800/80 transition-all w-64"
                            />
                        </div>
                        <button
                            onClick={handleCreateRoom}
                            disabled={creating}
                            className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl text-sm font-bold hover:bg-neutral-200 transition-colors disabled:opacity-50"
                        >
                            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            New Project
                        </button>
                    </div>
                </header>

                {/* Content */}
                <div className="p-6 md:p-8">
                    {rooms.length === 0 && !loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                                <FolderOpen className="w-10 h-10 text-neutral-600" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">No projects yet</h3>
                            <p className="text-neutral-400 mb-6 max-w-sm">Create your first Vdraw project to start visualizing your ideas.</p>
                            <button
                                onClick={handleCreateRoom}
                                className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold transition-all"
                            >
                                Create First Project
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <AnimatePresence>
                                {filteredRooms.map((room) => (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        key={room.id}
                                        onClick={() => router.push(`/room/${room.id}`)}
                                        className="group cursor-pointer bg-neutral-900 border border-white/5 hover:border-violet-500/50 rounded-2xl p-4 transition-all hover:shadow-2xl hover:shadow-violet-900/10 active:scale-[0.98] relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-neutral-400 group-hover:text-white group-hover:bg-violet-500/20 transition-colors">
                                                <Layout className="w-5 h-5" />
                                            </div>
                                            <div className="relative" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={(e) => handleDelete(e, room.id)}
                                                    className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <h3 className="text-lg font-bold text-white mb-1 truncate">{room.name || 'Untitled Project'}</h3>
                                        <p className="text-xs text-neutral-500 font-mono mb-4 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(room.updated_at || room.created_at).toLocaleDateString()}
                                        </p>

                                        <div className="flex items-center justify-between text-xs text-neutral-500 border-t border-white/5 pt-3">
                                            <span>Edited recently</span>
                                            <span className="font-medium text-violet-400 group-hover:underline">Open</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
