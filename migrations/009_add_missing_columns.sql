-- Add missing columns to existing like_recast tables
-- This migration adds verification_method and cast_hash columns

-- 1. Add missing columns to like_recast_user_actions
ALTER TABLE like_recast_user_actions 
ADD COLUMN IF NOT EXISTS verification_method VARCHAR(20) DEFAULT 'pending';

ALTER TABLE like_recast_user_actions 
ADD COLUMN IF NOT EXISTS cast_hash VARCHAR(255);

ALTER TABLE like_recast_user_actions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 2. Add missing columns to like_recast_completions
ALTER TABLE like_recast_completions 
ADD COLUMN IF NOT EXISTS verification_method VARCHAR(20) DEFAULT 'auto';

-- 3. Create manual_verifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS manual_verifications (
    id SERIAL PRIMARY KEY,
    action_id INTEGER,
    status VARCHAR(20) DEFAULT 'pending',
    verified_by INTEGER,
    verified_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add constraint to manual_verifications
ALTER TABLE manual_verifications 
ADD CONSTRAINT manual_verifications_action_id_fkey 
FOREIGN KEY (action_id) REFERENCES like_recast_user_actions(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_like_recast_user_actions_verification_method ON like_recast_user_actions(verification_method);
CREATE INDEX IF NOT EXISTS idx_like_recast_completions_verification_method ON like_recast_completions(verification_method);
CREATE INDEX IF NOT EXISTS idx_manual_verifications_action_id ON manual_verifications(action_id);
CREATE INDEX IF NOT EXISTS idx_manual_verifications_status ON manual_verifications(status);
