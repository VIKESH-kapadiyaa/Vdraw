"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { Loader2, ArrowRight, Zap, Layout, Play, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { motion } from "framer-motion";

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [isPro, setIsPro] = useState(false);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    // 1. Initialize User ID & Fetch Credits
    let storedId = localStorage.getItem("vdraw-user-id");
    if (!storedId) {
      storedId = crypto.randomUUID();
      localStorage.setItem("vdraw-user-id", storedId);
    }
    userIdRef.current = storedId;

    const fetchCredits = async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) return;

      const { data } = await supabase
        .from('profiles')
        .select('usage_count, subscription_status')
        .eq('id', storedId)
        .single();

      if (data) {
        setCredits(data.usage_count || 0);
        setIsPro(data.subscription_status === 'pro');
      } else {
        setCredits(0);
      }
    };

    fetchCredits();
  }, []);

  const handleCreateRoom = async () => {
    if (!userIdRef.current) return;
    setLoading(true);

    try {
      // 2. Check Profile Live
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userIdRef.current)
        .single();

      const usage = profile?.usage_count || 0;
      const status = profile?.subscription_status || 'free';

      // 3. Strict Gatekeeper (Allows exactly 2)
      if (usage >= 2 && status !== 'pro') {
        toast.info("Free Limit Reached", { description: "You have used your 2 free credits." });
        router.push('/pricing');
        return;
      }

      // 4. Update Usage
      // If 1st use (0) -> become 1.
      // If 2nd use (1) -> become 2.
      const newUsage = usage + 1;
      await supabase.from('profiles').upsert({
        id: userIdRef.current,
        usage_count: newUsage,
        updated_at: new Date().toISOString()
      });

      // Feedback
      if (status !== 'pro') {
        if (newUsage === 1) toast.success(`Room Created!`, { description: "1/2 Free Credits Used" });
        if (newUsage === 2) toast.warning(`Last Free Credit Used!`, { description: "Next room requires Pro plan." });
      }

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
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-violet-500/30 flex flex-col relative overflow-x-hidden">

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
          {isPro && <div className="text-xs font-bold bg-violet-500/20 text-violet-300 px-2 py-1 rounded">PRO ACTIVE</div>}
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

          <p className="text-lg md:text-xl text-neutral-400 mb-8 max-w-2xl mx-auto leading-relaxed">
            The fastest way to visualize ideas with your team. Zero friction collaboration.
          </p>

          {/* Credit Counter Badge */}
          {!isPro && credits !== null && (
            <div className="mb-8 inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-full">
              {credits >= 2 ? (
                <span className="text-red-400 flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> 0 Free Credits Left</span>
              ) : (
                <span className="text-neutral-300">Free Credits Used: <span className="text-white font-bold">{credits}/2</span></span>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="group relative px-8 py-4 bg-white text-black font-bold rounded-xl text-lg hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none min-w-[200px]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Check...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {(!isPro && credits !== null && credits >= 2) ? "Upgrade to Draw" : "Start Drawing"} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
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
      </main>
    </div>
  );
}
