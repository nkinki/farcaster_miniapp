import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');

    const client = await pool.connect();
    try {
        const result = await client.query(`
      SELECT * FROM airdrop_claims 
      WHERE user_fid = $1
    `, [fid]);

        return NextResponse.json({
            success: true,
            fid: fid,
            claims: result.rows
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    } finally {
        client.release();
    }
}
