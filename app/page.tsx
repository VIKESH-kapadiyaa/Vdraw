"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { Loader2, ArrowRight, Zap, Layout, Play } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { motion } from "framer-motion";

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    // 1. Initialize User ID on Mount
    let storedId = localStorage.getItem("vdraw-user-id");
    if (!storedId) {
      storedId = crypto.randomUUID();
      localStorage.setItem("vdraw-user-id", storedId);
    }
    userIdRef.current = storedId;
  }, []);

  const handleCreateRoom = async () => {
    if (!userIdRef.current) return;
    setLoading(true);

    // Env Check
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
      toast.error("Setup Error", { description: "Missing Supabase URL" });
      setLoading(false);
      return;
    }

    try {
      // 2. Check Profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userIdRef.current)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("DB Error", error);
        toast.error("Connection Failed", { description: "Could not verify account." });
        setLoading(false);
        return;
      }

      const usage = profile?.usage_count || 0;
      const status = profile?.subscription_status || 'free';

      // 3. Gatekeeper Logic
      if (usage >= 2 && status !== 'pro') {
        toast.info("Free Limit Reached", { description: "Upgrade to create more rooms." });
        router.push('/pricing');
        return;
      }

      // 4. Increment Usage
      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: userIdRef.current,
        usage_count: usage + 1,
        updated_at: new Date().toISOString()
      });

      if (upsertError) throw upsertError;

      // 5. Create Room
      const roomId = crypto.randomUUID();
      await supabase.from('rooms').insert({ id: roomId });
      localStorage.setItem(`vdraw-host-${roomId}`, 'true');

      // Redirect
      router.push(`/room/${roomId}`);

    } catch (err: any) {
      console.error("Creation Error", err);
      toast.error("Failed to create room", { description: err.message });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-violet-500/30 flex flex-col relative overflow-hidden">

      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Navbar */}
      <nav className="p-6 max-w-7xl mx-auto w-full flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center">
            <Layout className="w-4 h-4 text-white" />
          </div>
          Vdraw
        </div>
        <div className="flex items-center gap-6">
          <Link href="/pricing" className="text-neutral-400 hover:text-white transition font-medium">Pricing</Link>
          <Link href="/pricing" className="text-neutral-400 hover:text-white transition font-medium">Log In</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-medium text-neutral-300">V2.0 Now Live</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-neutral-500">
            Sketch. Share. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">Sync Instantly.</span>
          </h1>

          <p className="text-lg md:text-xl text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            The fastest way to visualize ideas with your team. No signup required for guests.
            Real-time collaboration with infinite canvas.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="group relative px-8 py-4 bg-white text-black font-bold rounded-xl text-lg hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Creating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Start Drawing <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              )}

              {/* Button Glow */}
              <div className="absolute inset-0 rounded-xl bg-white/50 blur-lg opacity-0 group-hover:opacity-50 transition-opacity" />
            </button>

            <Link href="/pricing">
              <button className="px-8 py-4 bg-white/5 border border-white/10 text-white font-medium rounded-xl text-lg hover:bg-white/10 transition-colors flex items-center gap-2">
                <Zap className="w-5 h-5 text-violet-400" /> View Plans
              </button>
            </Link>
          </div>
        </motion.div>

        {/* Social Proof / Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-16 border-t border-white/5 pt-10"
        >
          <Stat label="Active Users" value="10k+" />
          <Stat label="Drawings Created" value="50k+" />
          <Stat label="Latency" value="< 50ms" />
          <Stat label="Uptime" value="99.9%" />
        </motion.div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string, value: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl md:text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-neutral-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}
