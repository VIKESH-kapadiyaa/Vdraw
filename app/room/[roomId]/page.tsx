"use client";
import dynamic from "next/dynamic";
import { use } from "react";

const Whiteboard = dynamic(() => import("../../../components/Whiteboard"), {
    ssr: false,
});

export default function RoomPage({
    params,
}: {
    params: Promise<{ roomId: string }>;
}) {
    const { roomId } = use(params);

    return (
        <main className="h-screen w-screen overflow-hidden">
            <Whiteboard roomId={roomId} />
        </main>
    );
}
