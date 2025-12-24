
import pool from '@/lib/db';

/**
 * Singleton for the Neon SQL client to prevent multiple connections
 * in serverless environments.
 */
const sql = async (strings: TemplateStringsArray, ...values: any[]) => {
    const client = await pool.connect();
    try {
        // Basic implementation of tagged template for compatibility with 'neon' package style
        let query = strings[0];
        for (let i = 0; i < values.length; i++) {
            query += `$${i + 1}${strings[i + 1]}`;
        }
        const result = await client.query(query, values);
        return result.rows;
    } finally {
        client.release();
    }
};

export default sql;
