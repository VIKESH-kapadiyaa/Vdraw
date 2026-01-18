"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { Loader2, ArrowRight, Zap, Layout, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { motion } from "framer-motion";

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [renewalDate, setRenewalDate] = useState<string | null>(null);
  const [recentRooms, setRecentRooms] = useState<{ id: string; date: string }[]>([]);
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
        .select('usage_count, subscription_status, subscription_end_date')
        .eq('id', storedId)
        .single();

      if (data) {
        let isActivePro = data.subscription_status === 'pro';

        // Check Expiration
        if (isActivePro && data.subscription_end_date) {
          const endDate = new Date(data.subscription_end_date);
          if (new Date() > endDate) {
            // Expired
            isActivePro = false;
            // Optional: We could update DB here to 'free', but lazy check is fine for now
          } else {
            setRenewalDate(endDate.toLocaleDateString());
          }
        }

        setCredits(data.usage_count || 0);
        setIsPro(isActivePro);
      } else {
        setCredits(0);
      }
    };

    fetchCredits();
  }, []);

  useEffect(() => {
    // Load Recent Rooms
    const history = JSON.parse(localStorage.getItem('vdraw-recent-rooms') || '[]');
    setRecentRooms(history);
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
      let status = profile?.subscription_status || 'free';

      // Double Check Expiration on Action
      if (status === 'pro' && profile?.subscription_end_date) {
        if (new Date() > new Date(profile.subscription_end_date)) {
          status = 'free';
          toast.error("Your Pro Plan has expired.", { description: "Please renew to create more rooms." });
        }
      }

      // 3. Strict Gatekeeper (Allows exactly 4)
      if (usage >= 4 && status !== 'pro') {
        toast.info("Free Limit Reached", { description: "You have used your 4 free credits." });
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
        if (newUsage < 4) toast.success(`Room Created!`, { description: `${newUsage}/4 Free Credits Used` });
        if (newUsage === 4) toast.warning(`Last Free Credit Used!`, { description: "Next room requires Pro plan." });
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
      <nav className="p-4 md:p-6 max-w-7xl mx-auto w-full flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center">
            <Layout className="w-4 h-4 text-white" />
          </div>
          Vdraw
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <Link href="/pricing" className="text-neutral-400 hover:text-white transition font-medium text-sm md:text-base">Pricing</Link>
          {isPro && (
            <div className="flex flex-col items-end">
              <div className="text-[10px] md:text-xs font-bold bg-violet-500/20 text-violet-300 px-2 py-1 rounded">PRO ACTIVE</div>
              {renewalDate && <span className="text-[10px] text-neutral-500 mt-1 hidden sm:inline" suppressHydrationWarning>Renews: {renewalDate}</span>}
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 md:px-6 relative z-10 w-full mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl w-full"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-medium text-neutral-300">V2.0 Now Live</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-neutral-500 px-2">
            Sketch. Share. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">Sync Instantly.</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-neutral-400 mb-8 max-w-2xl mx-auto leading-relaxed px-4">
            The fastest way to visualize ideas with your team. Zero friction collaboration.
          </p>

          {/* Credit Counter Badge */}
          {!isPro && credits !== null && (
            <div className="mb-8 inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-full mx-auto">
              {credits >= 4 ? (
                <span className="text-red-400 flex items-center gap-2 text-sm"><ShieldAlert className="w-4 h-4" /> 0 Free Credits Left</span>
              ) : (
                <span className="text-neutral-300 text-sm">Free Credits Used: <span className="text-white font-bold">{credits}/4</span></span>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full px-4">
            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="group relative px-8 py-4 bg-white text-black font-bold rounded-xl text-lg hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none w-full sm:w-auto min-w-[200px]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Check...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {(!isPro && credits !== null && credits >= 4) ? "Upgrade to Draw" : "Start Drawing"} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
              {/* Button Glow */}
              <div className="absolute inset-0 rounded-xl bg-white/50 blur-lg opacity-0 group-hover:opacity-50 transition-opacity" />
            </button>

            <Link href="/pricing" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 text-white font-medium rounded-xl text-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                <Zap className="w-5 h-5 text-violet-400" /> View Plans
              </button>
            </Link>
          </div>

          {/* Recent Boards List (Local History) */}
          {recentRooms.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-12 max-w-lg mx-auto w-full px-4">
              <p className="text-sm font-medium text-neutral-500 mb-4 uppercase tracking-wider text-left pl-1">Recent Boards</p>
              <div className="flex flex-col gap-2">
                {recentRooms.map((room) => (
                  <Link key={room.id} href={`/room/${room.id}`} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-full bg-neutral-800 flex-shrink-0 flex items-center justify-center text-xs font-mono text-neutral-400 group-hover:bg-violet-500/20 group-hover:text-violet-300 transition-colors">
                        #{room.id.slice(0, 2)}
                      </div>
                      <div className="text-left overflow-hidden">
                        <div className="text-sm font-medium text-neutral-200 truncate">Untitled Board</div>
                        <div className="text-xs text-neutral-500 text-[10px] uppercase truncate">{new Date(room.date).toLocaleDateString()} • {new Date(room.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {/* Support Section */}
          <footer className="mt-20 pb-10 text-center">
            <div className="inline-block p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
              <p className="text-neutral-400 text-sm mb-1">Need help?</p>
              <a href="mailto:vikeshkapadiyaa@gmail.com" className="block text-violet-400 hover:text-violet-300 transition-colors font-medium text-base mb-1">
                vikeshkapadiyaa@gmail.com
              </a>
              <p className="text-neutral-500 text-xs">We typically reply within 24 hours.</p>
            </div>
          </footer>
        </motion.div>
      </main>
    </div>
  );
}
