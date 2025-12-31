"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const createRoom = async () => {
      // Generate a random ID
      const roomId = crypto.randomUUID();

      // Create the room in Supabase
      // Note: If you haven't created the 'rooms' table yet, this might fail silently or log an error.
      // But we will proceed to redirect anyway so you can still draw locally.
      try {
        await supabase
          .from('rooms')
          .insert({ id: roomId });
      } catch (e) {
        console.warn("Could not create room in DB (likely missing table), proceeding anyway.", e);
      }

      // Mark this user as the host locally
      localStorage.setItem(`vdraw-host-${roomId}`, 'true');

      // Redirect to the new room
      router.push(`/room/${roomId}`);
    };

    createRoom();
  }, [router]);

  return (
    <main className="h-screen w-screen flex flex-col items-center justify-center bg-neutral-950 text-white">
      <Loader2 className="w-10 h-10 animate-spin text-fuchsia-500 mb-4" />
      <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
        Summoning a new canvas...
      </h1>
    </main>
  );
}
