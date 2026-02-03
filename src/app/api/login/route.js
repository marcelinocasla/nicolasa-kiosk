import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req) {
    try {
        const { password } = await req.json();
        const filePath = path.join(process.cwd(), 'src', 'data', 'settings.json');
        const fileContents = await fs.readFile(filePath, 'utf8');
        const settings = JSON.parse(fileContents);

        if (password === settings.devPassword) {
            return NextResponse.json({ role: 'dev', success: true });
        }
        if (password === settings.adminPassword) {
            return NextResponse.json({ role: 'owner', success: true });
        }

        return NextResponse.json({ success: false, error: 'Contraseña incorrecta' });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
