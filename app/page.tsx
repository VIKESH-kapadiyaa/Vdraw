"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const createRoom = async () => {
      // Generate a random ID
      const roomId = crypto.randomUUID();

      // Create the room in Supabase (database-backed)
      const { error } = await supabase
        .from('rooms')
        .insert({ id: roomId });

      if (error) {
        console.error("Error creating room:", error);
      } else {
        // Mark this user as the host locally
        localStorage.setItem(`vdraw-host-${roomId}`, 'true');
      }

      // Redirect to the new room
      router.push(`/room/${roomId}`);
    };

    createRoom();
  }, [router]);

  return (
    <main className="h-screen w-screen flex items-center justify-center bg-neutral-900 text-white">
      <h1 className="text-xl font-bold">Creating new room...</h1>
    </main>
  );
}
