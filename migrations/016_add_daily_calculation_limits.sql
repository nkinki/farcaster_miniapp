-- Add daily calculation limits table
CREATE TABLE IF NOT EXISTS daily_calculation_limits (
  id SERIAL PRIMARY KEY,
  user_fid INTEGER NOT NULL,
  calculation_type VARCHAR(50) NOT NULL DEFAULT 'airdrop_distribution',
  last_calculation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  calculation_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_fid, calculation_type, last_calculation_date)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_daily_calculation_limits_user_type_date 
ON daily_calculation_limits(user_fid, calculation_type, last_calculation_date);

-- Add comment
COMMENT ON TABLE daily_calculation_limits IS 'Tracks daily limits for expensive calculations per user';
COMMENT ON COLUMN daily_calculation_limits.calculation_type IS 'Type of calculation (airdrop_distribution, etc.)';
COMMENT ON COLUMN daily_calculation_limits.last_calculation_date IS 'Date of last calculation';
COMMENT ON COLUMN daily_calculation_limits.calculation_count IS 'Number of calculations on this date';
