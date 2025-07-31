import { Pool } from 'pg';

// Neon database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test database connection
pool.on('connect', () => {
  console.log('Connected to Neon database');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

export default pool;

// Database helper functions
export const db = {
  // Promotions
  async createPromotion(data: {
    fid: number;
    username: string;
    displayName?: string;
    castUrl: string;
    shareText?: string;
    rewardPerShare: number;
    totalBudget: number;
  }) {
    const query = `
      INSERT INTO promotions (fid, username, display_name, cast_url, share_text, reward_per_share, total_budget, remaining_budget)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      data.fid,
      data.username,
      data.displayName,
      data.castUrl,
      data.shareText,
      data.rewardPerShare,
      data.totalBudget,
      data.totalBudget // remaining_budget starts equal to total_budget
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async getPromotionsByUser(fid: number) {
    const query = `
      SELECT * FROM promotions 
      WHERE fid = $1 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [fid]);
    return result.rows;
  },

  async getAllActivePromotions() {
    const query = `
      SELECT * FROM promotions 
      WHERE status = 'active' 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  async updatePromotion(id: number, data: {
    rewardPerShare?: number;
    status?: 'active' | 'paused' | 'completed';
    sharesCount?: number;
    remainingBudget?: number;
  }) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (data.rewardPerShare !== undefined) {
      updates.push(`reward_per_share = $${paramCount++}`);
      values.push(data.rewardPerShare);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(data.status);
    }
    if (data.sharesCount !== undefined) {
      updates.push(`shares_count = $${paramCount++}`);
      values.push(data.sharesCount);
    }
    if (data.remainingBudget !== undefined) {
      updates.push(`remaining_budget = $${paramCount++}`);
      values.push(data.remainingBudget);
    }

    if (updates.length === 0) return null;

    values.push(id);
    const query = `
      UPDATE promotions 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // Shares
  async createShare(data: {
    promotionId: number;
    sharerFid: number;
    sharerUsername: string;
    shareText?: string;
    rewardAmount: number;
  }) {
    const query = `
      INSERT INTO shares (promotion_id, sharer_fid, sharer_username, share_text, reward_amount)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      data.promotionId,
      data.sharerFid,
      data.sharerUsername,
      data.shareText,
      data.rewardAmount
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async getSharesByUser(fid: number) {
    const query = `
      SELECT s.*, p.cast_url, p.reward_per_share
      FROM shares s
      JOIN promotions p ON s.promotion_id = p.id
      WHERE s.sharer_fid = $1
      ORDER BY s.shared_at DESC
    `;
    const result = await pool.query(query, [fid]);
    return result.rows;
  },

  // Users
  async createOrUpdateUser(data: {
    fid: number;
    username: string;
    displayName?: string;
  }) {
    const query = `
      INSERT INTO users (fid, username, display_name)
      VALUES ($1, $2, $3)
      ON CONFLICT (fid) 
      DO UPDATE SET 
        username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const values = [data.fid, data.username, data.displayName];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async getUserStats(fid: number) {
    const query = `
      SELECT * FROM users WHERE fid = $1
    `;
    const result = await pool.query(query, [fid]);
    return result.rows[0];
  },

  async updateUserEarnings(fid: number, earnings: number) {
    const query = `
      UPDATE users 
      SET total_earnings = total_earnings + $2
      WHERE fid = $1
      RETURNING *
    `;
    const result = await pool.query(query, [fid, earnings]);
    return result.rows[0];
  }
}; 