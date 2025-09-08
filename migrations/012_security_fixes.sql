-- Security fixes for lottery system
-- This migration adds critical security constraints

-- 1. Add ticket number range constraint
ALTER TABLE lottery_tickets 
ADD CONSTRAINT IF NOT EXISTS check_ticket_number_range 
CHECK (number >= 1 AND number <= 100);

-- 2. Add unique constraint for round + ticket combination
ALTER TABLE lottery_tickets 
ADD CONSTRAINT IF NOT EXISTS unique_round_ticket 
UNIQUE (draw_id, number);

-- 3. Add constraint to prevent duplicate transaction hashes
ALTER TABLE lottery_tickets 
ADD CONSTRAINT IF NOT EXISTS unique_transaction_hash 
UNIQUE (transaction_hash);

-- 4. Add index for better performance on security checks
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_draw_number 
ON lottery_tickets (draw_id, number);

-- 5. Add constraint to lottery_winnings table
ALTER TABLE lottery_winnings 
ADD CONSTRAINT IF NOT EXISTS check_amount_won_positive 
CHECK (amount_won > 0);

-- 6. Add unique constraint for lottery winnings (one winning per ticket)
ALTER TABLE lottery_winnings 
ADD CONSTRAINT IF NOT EXISTS unique_ticket_winning 
UNIQUE (ticket_id);

-- 7. Add index for claim performance
CREATE INDEX IF NOT EXISTS idx_lottery_winnings_player_claimed 
ON lottery_winnings (player_fid, claimed_at);
