-- Migration: 012_create_weather_lotto.sql
-- Weather Lotto adatbázis séma létrehozása
-- MOD-006: Weather Lotto Database Schema

-- Weather Lotto körök táblája
CREATE TABLE weather_lotto_rounds (
    id SERIAL PRIMARY KEY,
    round_number INTEGER NOT NULL UNIQUE,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 day'),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    winning_side VARCHAR(10) CHECK (winning_side IN ('sunny', 'rainy')),
    
    -- Pool adatok
    sunny_tickets INTEGER DEFAULT 0,
    rainy_tickets INTEGER DEFAULT 0,
    total_tickets INTEGER DEFAULT 0,
    
    -- Pénzügyi adatok
    house_base BIGINT DEFAULT 200000000000000000000000, -- 200,000 CHESS (18 decimals)
    total_pool BIGINT DEFAULT 200000000000000000000000, -- 200,000 CHESS + játékosok
    treasury_amount BIGINT DEFAULT 0, -- 30% kincstár
    winners_pool BIGINT DEFAULT 0, -- 70% nyerteseknek
    
    -- Meta adatok
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weather Lotto ticketek táblája
CREATE TABLE weather_lotto_tickets (
    id SERIAL PRIMARY KEY,
    round_id INTEGER NOT NULL REFERENCES weather_lotto_rounds(id) ON DELETE CASCADE,
    
    -- Játékos adatok
    player_fid INTEGER NOT NULL,
    player_address VARCHAR(42) NOT NULL,
    player_name VARCHAR(255),
    player_avatar TEXT,
    
    -- Ticket adatok
    side VARCHAR(10) NOT NULL CHECK (side IN ('sunny', 'rainy')),
    quantity INTEGER NOT NULL DEFAULT 1,
    total_cost BIGINT NOT NULL, -- CHESS tokenek (18 decimals)
    
    -- Kifizetési adatok
    payout_amount BIGINT DEFAULT 0, -- Kiszámított kifizetés
    is_claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMP WITH TIME ZONE,
    
    -- Meta adatok
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weather Lotto kifizetési igények táblája
CREATE TABLE weather_lotto_claims (
    id SERIAL PRIMARY KEY,
    round_id INTEGER NOT NULL REFERENCES weather_lotto_rounds(id) ON DELETE CASCADE,
    player_fid INTEGER NOT NULL,
    player_address VARCHAR(42) NOT NULL,
    
    -- Kifizetési adatok
    total_tickets INTEGER NOT NULL,
    total_payout BIGINT NOT NULL, -- CHESS tokenek (18 decimals)
    
    -- Kifizetés státusz
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
    transaction_hash VARCHAR(66), -- Blockchain tranzakció hash
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Meta adatok
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weather Lotto statisztikák táblája
CREATE TABLE weather_lotto_stats (
    id SERIAL PRIMARY KEY,
    
    -- Összesített adatok
    total_rounds INTEGER DEFAULT 0,
    total_tickets_sold INTEGER DEFAULT 0,
    total_volume BIGINT DEFAULT 0, -- Összes CHESS forgalom
    total_treasury BIGINT DEFAULT 0, -- Összes kincstár
    total_payouts BIGINT DEFAULT 0, -- Összes kifizetés
    
    -- Aktuális adatok
    active_round_id INTEGER REFERENCES weather_lotto_rounds(id),
    next_draw_time TIMESTAMP WITH TIME ZONE,
    current_sunny_tickets INTEGER DEFAULT 0,
    current_rainy_tickets INTEGER DEFAULT 0,
    current_total_pool BIGINT DEFAULT 200000000000000000000000,
    
    -- Meta adatok
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexek létrehozása a jobb teljesítményért
CREATE INDEX idx_weather_lotto_rounds_status ON weather_lotto_rounds(status);
CREATE INDEX idx_weather_lotto_rounds_round_number ON weather_lotto_rounds(round_number);
CREATE INDEX idx_weather_lotto_tickets_round_id ON weather_lotto_tickets(round_id);
CREATE INDEX idx_weather_lotto_tickets_player_fid ON weather_lotto_tickets(player_fid);
CREATE INDEX idx_weather_lotto_tickets_side ON weather_lotto_tickets(side);
CREATE INDEX idx_weather_lotto_claims_round_id ON weather_lotto_claims(round_id);
CREATE INDEX idx_weather_lotto_claims_player_fid ON weather_lotto_claims(player_fid);
CREATE INDEX idx_weather_lotto_claims_status ON weather_lotto_claims(status);

-- Trigger a round frissítéshez
CREATE OR REPLACE FUNCTION update_weather_lotto_round_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_weather_lotto_rounds_updated_at
    BEFORE UPDATE ON weather_lotto_rounds
    FOR EACH ROW
    EXECUTE FUNCTION update_weather_lotto_round_updated_at();

-- Trigger a ticket frissítéshez
CREATE OR REPLACE FUNCTION update_weather_lotto_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_weather_lotto_tickets_updated_at
    BEFORE UPDATE ON weather_lotto_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_weather_lotto_ticket_updated_at();

-- Trigger a claim frissítéshez
CREATE OR REPLACE FUNCTION update_weather_lotto_claim_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_weather_lotto_claims_updated_at
    BEFORE UPDATE ON weather_lotto_claims
    FOR EACH ROW
    EXECUTE FUNCTION update_weather_lotto_claim_updated_at();

-- Kezdeti statisztika rekord létrehozása
INSERT INTO weather_lotto_stats (
    total_rounds,
    total_tickets_sold,
    total_volume,
    total_treasury,
    total_payouts,
    current_total_pool
) VALUES (
    0,
    0,
    0,
    0,
    0,
    200000000000000000000000 -- 200,000 CHESS
);

-- Kommentek hozzáadása
COMMENT ON TABLE weather_lotto_rounds IS 'Weather Lotto napi sorsolások - 200k CHESS ház alapja';
COMMENT ON TABLE weather_lotto_tickets IS 'Weather Lotto játékos ticketek - Sunny/Rainy választás';
COMMENT ON TABLE weather_lotto_claims IS 'Weather Lotto kifizetési igények - 70% nyerteseknek';
COMMENT ON TABLE weather_lotto_stats IS 'Weather Lotto statisztikák és összesített adatok';

COMMENT ON COLUMN weather_lotto_rounds.house_base IS 'Ház alapja: 200,000 CHESS (18 decimals)';
COMMENT ON COLUMN weather_lotto_rounds.total_pool IS 'Teljes pool: ház alap + játékosok befizetései';
COMMENT ON COLUMN weather_lotto_rounds.treasury_amount IS 'Kincstár: 30% a következő sorsolásra';
COMMENT ON COLUMN weather_lotto_rounds.winners_pool IS 'Nyertesek pool-ja: 70% a nyerteseknek';

COMMENT ON COLUMN weather_lotto_tickets.side IS 'Weather oldal: sunny vagy rainy';
COMMENT ON COLUMN weather_lotto_tickets.total_cost IS 'Teljes költség: quantity * 100,000 CHESS';
COMMENT ON COLUMN weather_lotto_tickets.payout_amount IS 'Kiszámított kifizetés: (winners_pool / total_winning_tickets) * quantity';
