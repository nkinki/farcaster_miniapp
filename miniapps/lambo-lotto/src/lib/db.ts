import { Pool } from 'pg';

let pool: Pool;

if (process.env.NODE_ENV === 'production') {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });
} else {
    if (!(global as any).pool) {
        (global as any).pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
    }
    pool = (global as any).pool;
}

export default pool;
