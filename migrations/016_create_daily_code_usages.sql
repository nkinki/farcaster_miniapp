-- Create table to track daily code usages
CREATE TABLE IF NOT EXISTS daily_code_usages (
    id SERIAL PRIMARY KEY,
    fid INTEGER NOT NULL,
    code VARCHAR(255) NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups by fid and date
CREATE INDEX IF NOT EXISTS idx_daily_code_usages_fid_used_at ON daily_code_usages(fid, used_at);
