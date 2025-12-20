-- Migrations: 018_add_fid_to_notification_tokens.sql

-- Add fid to notification_tokens if it doesn't exist
ALTER TABLE notification_tokens ADD COLUMN IF NOT EXISTS fid INTEGER;

-- Create an index on fid and app_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_tokens_fid_app_id ON notification_tokens(fid, app_id);
