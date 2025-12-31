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
        <main className="fixed inset-0 h-full w-full overflow-hidden bg-neutral-950">
            <Whiteboard roomId={roomId} />
        </main>
    );
}
