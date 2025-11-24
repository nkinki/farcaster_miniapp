import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Helper to generate random code
function generateCode(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export async function POST(request: NextRequest) {
    try {
        // Optional: Add Admin Auth check here (e.g., check for a secret header or admin FID)
        // For now, we'll assume it's protected or internal.

        const newCode = generateCode();

        // 1. Deactivate all previous codes
        await sql`UPDATE daily_codes SET is_active = FALSE WHERE is_active = TRUE`;

        // 2. Insert new code
        await sql`
      INSERT INTO daily_codes (code, is_active)
      VALUES (${newCode}, TRUE)
    `;

        return NextResponse.json({ success: true, code: newCode }, { status: 200 });

    } catch (error: any) {
        console.error('Error generating daily code:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const result = await sql`SELECT code, created_at FROM daily_codes WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1`;

        if (result.length === 0) {
            return NextResponse.json({ code: null }, { status: 200 });
        }

        return NextResponse.json({ code: result[0].code, createdAt: result[0].created_at }, { status: 200 });
    } catch (error) {
        console.error('Error fetching current code:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
