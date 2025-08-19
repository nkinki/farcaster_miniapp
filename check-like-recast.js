const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkLikeRecastActions() {
  try {
    console.log('🔍 Checking like-recast actions...');
    
    // Check like_recast_user_actions
    const { rows: actions } = await pool.query(`
      SELECT id, promotion_id, user_fid, action_type, verification_method, cast_hash, created_at
      FROM like_recast_user_actions 
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('📋 Recent like-recast actions:');
    if (actions.length === 0) {
      console.log('  ❌ No actions found');
    } else {
      actions.forEach(action => {
        console.log(`  ✅ ID: ${action.id}, Promotion: ${action.promotion_id}, User: ${action.user_fid}, Action: ${action.action_type}, Method: ${action.verification_method}, Hash: ${action.cast_hash?.substring(0, 20)}...`);
      });
    }
    
    // Check manual_verifications
    const { rows: verifications } = await pool.query(`
      SELECT id, action_id, status, notes, created_at
      FROM manual_verifications 
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('\n📋 Manual verifications:');
    if (verifications.length === 0) {
      console.log('  ❌ No manual verifications found');
    } else {
      verifications.forEach(verification => {
        console.log(`  ✅ ID: ${verification.id}, Action ID: ${verification.action_id}, Status: ${verification.status}, Notes: ${verification.notes}`);
      });
    }
    
    // Check like_recast_completions
    const { rows: completions } = await pool.query(`
      SELECT id, promotion_id, user_fid, reward_amount, verification_method, completed_at
      FROM like_recast_completions 
      ORDER BY completed_at DESC
      LIMIT 10
    `);
    
    console.log('\n📋 Completions:');
    if (completions.length === 0) {
      console.log('  ❌ No completions found');
    } else {
      completions.forEach(completion => {
        console.log(`  ✅ ID: ${completion.id}, Promotion: ${completion.promotion_id}, User: ${completion.user_fid}, Reward: ${completion.reward_amount}, Method: ${completion.verification_method}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking like-recast actions:', error);
  } finally {
    await pool.end();
  }
}

checkLikeRecastActions();
