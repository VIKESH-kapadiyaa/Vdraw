"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { Loader2 } from "lucide-react";
import PricingModal from "../components/PricingModal";
import { toast } from "sonner";

export default function Home() {
  const router = useRouter();
  const [showPricing, setShowPricing] = useState(false);
  const [checking, setChecking] = useState(true);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    // 1. Get or Create User ID (Persistent Device ID)
    let storedId = localStorage.getItem("vdraw-user-id");
    if (!storedId) {
      storedId = crypto.randomUUID();
      localStorage.setItem("vdraw-user-id", storedId);
    }
    userIdRef.current = storedId;

    const checkAccessAndCreate = async () => {
      if (!userIdRef.current) return;

      // Env Check
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
        toast.error("Configuration Error", { description: "Supabase Environment Variables are missing!" });
        console.error("Missing NEXT_PUBLIC_SUPABASE_URL");
        setChecking(false);
        return;
      }

      try {
        console.log("Checking profile for:", userIdRef.current);

        // 2. Check Profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userIdRef.current)
          .single();

        if (error && error.code !== 'PGRST116') { // Ignore "Row not found" (PGRST116)
          console.error("Profile Fetch Error", error);
          toast.error("Database connection failed", { description: error.message });
          setChecking(false); // Stop loading so they see the error
          return;
        }

        // Default values if no profile yet
        const usage = profile?.usage_count || 0;
        const status = profile?.subscription_status || 'free';

        console.log("Status:", status, "Usage:", usage);
        toast(`Usage: ${usage}/2`, { duration: 2000, position: 'bottom-right' });

        // 3. Gatekeeper Logic
        if (usage >= 2 && status !== 'pro') {
          setChecking(false);
          setShowPricing(true);
          return;
        }

        // 4. Increment Usage & Create Room
        const { error: upsertError } = await supabase.from('profiles').upsert({
          id: userIdRef.current,
          usage_count: usage + 1,
          updated_at: new Date().toISOString()
        });

        if (upsertError) {
          console.error("Upsert Error", upsertError);
          toast.error("Could not save usage", { description: upsertError.message });
          // Stop here to debug
          setChecking(false);
          return;
        }

        // Create Room
        const roomId = crypto.randomUUID();
        await supabase.from('rooms').insert({ id: roomId });

        // Mark host
        localStorage.setItem(`vdraw-host-${roomId}`, 'true');

        // Redirect
        router.push(`/room/${roomId}`);

      } catch (err: any) {
        console.error("Fatal Gatekeeper Error", err);
        toast.error("Application Error", { description: err.message || "Unknown error" });
        setChecking(false);
      }
    };

    checkAccessAndCreate();
  }, [router]);

  const handleProUpgraded = () => {
    // User just paid! Retry creation
    setShowPricing(false);
    setChecking(true);
    window.location.reload(); // Simple reload to re-trigger the effect
  };

  return (
    <main className="h-screen w-screen flex flex-col items-center justify-center bg-neutral-950 text-white">
      {checking ? (
        <>
          <Loader2 className="w-10 h-10 animate-spin text-fuchsia-500 mb-4" />
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
            Checking dimensions...
          </h1>
        </>
      ) : (
        <div className="text-center p-6">
          {!showPricing && (
            <>
              <h1 className="text-3xl font-bold text-white mb-4">Connection Failed</h1>
              <p className="text-neutral-400 mb-8">Could not verify access. Please check the logs.</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-neutral-800 rounded-lg hover:bg-neutral-700"
              >
                Retry
              </button>
            </>
          )}

          {showPricing && (
            <>
              <h1 className="text-3xl font-bold text-white mb-4">You've reached the free limit!</h1>
              <p className="text-neutral-400 mb-8">Upgrade to Vdraw Pro to create unlimited rooms.</p>
              <button
                onClick={() => setShowPricing(true)}
                className="px-6 py-3 bg-violet-600 rounded-lg hover:bg-violet-700 transition font-bold"
              >
                View Plans
              </button>
            </>
          )}
        </div>
      )}

      {userIdRef.current && (
        <PricingModal
          isOpen={showPricing}
          onClose={() => setShowPricing(false)} // Optional: closing might just show the "Limit Reached" text again
          userId={userIdRef.current}
          onSuccess={handleProUpgraded}
        />
      )}
    </main>
  );
}
