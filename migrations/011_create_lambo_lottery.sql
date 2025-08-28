-- Create Lambo Lottery tables
CREATE TABLE IF NOT EXISTS lambo_lottery_rounds (
    id SERIAL PRIMARY KEY,
    round_number INTEGER NOT NULL UNIQUE,
    start_date TIMESTAMP NOT NULL DEFAULT NOW(),
    end_date TIMESTAMP NOT NULL,
    draw_date TIMESTAMP NOT NULL,
    prize_pool BIGINT NOT NULL DEFAULT 1000000, -- Starting with 1M CHESS tokens
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, completed, cancelled
    winner_fid INTEGER,
    winner_number INTEGER,
    total_tickets_sold INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lambo_lottery_tickets (
    id SERIAL PRIMARY KEY,
    round_id INTEGER NOT NULL REFERENCES lambo_lottery_rounds(id),
    fid INTEGER NOT NULL,
    ticket_number INTEGER NOT NULL,
    purchase_price BIGINT NOT NULL DEFAULT 20000, -- 20,000 CHESS tokens
    purchased_at TIMESTAMP DEFAULT NOW(),
    transaction_hash VARCHAR(66),
    UNIQUE(round_id, ticket_number)
);

CREATE TABLE IF NOT EXISTS lambo_lottery_stats (
    id SERIAL PRIMARY KEY,
    total_rounds INTEGER DEFAULT 0,
    total_tickets_sold INTEGER DEFAULT 0,
    total_prize_distributed BIGINT DEFAULT 0,
    treasury_balance BIGINT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lambo_tickets_round_fid ON lambo_lottery_tickets(round_id, fid);
CREATE INDEX IF NOT EXISTS idx_lambo_tickets_number ON lambo_lottery_tickets(round_id, ticket_number);
CREATE INDEX IF NOT EXISTS idx_lambo_rounds_status ON lambo_lottery_rounds(status);

-- Insert initial stats record
INSERT INTO lambo_lottery_stats (id, total_rounds, total_tickets_sold, total_prize_distributed, treasury_balance)
VALUES (1, 0, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Create initial lottery round
INSERT INTO lambo_lottery_rounds (
    round_number, 
    start_date, 
    end_date, 
    draw_date, 
    prize_pool, 
    status
) VALUES (
    1,
    NOW(),
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '1 day' + INTERVAL '1 hour',
    1000000,
    'active'
) ON CONFLICT (round_number) DO NOTHING;