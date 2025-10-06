-- Rename created_at to submitted_at in pending_follows table
-- This makes it consistent with the code expectations

ALTER TABLE pending_follows RENAME COLUMN created_at TO submitted_at;

-- Update the index name as well
DROP INDEX IF EXISTS idx_pending_follows_created_at;
CREATE INDEX IF NOT EXISTS idx_pending_follows_submitted_at ON pending_follows(submitted_at);
