import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    const libDir = path.join(process.cwd(), 'public', 'libraries');
    try {
        if (!fs.existsSync(libDir)) {
            return NextResponse.json({ files: [] });
        }
        const files = fs.readdirSync(libDir).filter(file => file.endsWith('.excalidrawlib'));
        return NextResponse.json({ files });
    } catch {
        return NextResponse.json({ error: 'Failed to list libraries' }, { status: 500 });
    }
}
