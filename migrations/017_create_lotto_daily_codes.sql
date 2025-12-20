-- Migrations: 017_create_lotto_daily_codes.sql

-- Table for Lotto daily codes
CREATE TABLE IF NOT EXISTS lotto_daily_codes (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Table for Lotto daily code usage
CREATE TABLE IF NOT EXISTS lotto_daily_code_usages (
    id SERIAL PRIMARY KEY,
    fid INTEGER NOT NULL,
    code TEXT NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fid, code)
);

-- Try to add app_id if it doesn't exist (handled by script error catching if it exists)
ALTER TABLE notification_tokens ADD COLUMN IF NOT EXISTS app_id TEXT DEFAULT 'apprank';
