import { Pool, PoolConfig } from 'pg';

const poolConfig: PoolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
    // Optimize for serverless:
    max: 10, // Limit max connections
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

let pool: Pool;

if (process.env.NODE_ENV === 'production') {
    pool = new Pool(poolConfig);
} else {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    if (!(global as any).pgPool) {
        (global as any).pgPool = new Pool(poolConfig);
    }
    pool = (global as any).pgPool;
}

export default pool;
