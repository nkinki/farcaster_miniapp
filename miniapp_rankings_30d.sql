-- Create table for 30-day rank changes
CREATE TABLE IF NOT EXISTS miniapp_rankings_30d (
    miniapp_id VARCHAR(64) NOT NULL,
    ranking_date DATE NOT NULL,
    rank INTEGER NOT NULL,
    rank_30d_change INTEGER,
    PRIMARY KEY (miniapp_id, ranking_date)
); 