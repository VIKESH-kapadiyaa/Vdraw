"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Generate a random ID and redirect to it
    const roomId = crypto.randomUUID();
    router.push(`/room/${roomId}`);
  }, [router]);

  return (
    <main className="h-screen w-screen flex items-center justify-center bg-neutral-900 text-white">
      <h1 className="text-xl font-bold">Creating new room...</h1>
    </main>
  );
}
