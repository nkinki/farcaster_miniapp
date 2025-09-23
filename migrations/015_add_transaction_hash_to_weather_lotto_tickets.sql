-- Migration: Add transaction_hash column to weather_lotto_tickets table
-- Date: 2025-09-23
-- Purpose: Store onchain transaction hash for ticket purchases

-- Add transaction_hash column to weather_lotto_tickets table
ALTER TABLE weather_lotto_tickets 
ADD COLUMN transaction_hash VARCHAR(66);

-- Add index for better query performance
CREATE INDEX idx_weather_lotto_tickets_transaction_hash ON weather_lotto_tickets(transaction_hash);

-- Add comment to document the column
COMMENT ON COLUMN weather_lotto_tickets.transaction_hash IS 'Onchain transaction hash for ticket purchase';
