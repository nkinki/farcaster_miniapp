import os
import psycopg2
from datetime import date
from dotenv import load_dotenv

load_dotenv()
NEON_DB_URL = os.getenv("NEON_DB_URL") or os.getenv("DATABASE_URL")

def debug_fetch():
    print(f"Connecting to DB: {NEON_DB_URL.split('@')[1] if '@' in NEON_DB_URL else '...'}")
    conn = psycopg2.connect(NEON_DB_URL)
    cursor = conn.cursor()
    today = date.today()
    print(f"Checking stats for today: {today}")

    # 1. Gainers
    cursor.execute("""
        SELECT m.name, m.author_username, s.current_rank, s.rank_24h_change, m.domain
        FROM miniapp_statistics s
        JOIN miniapps m ON s.miniapp_id = m.id
        WHERE s.stat_date = %s AND s.rank_24h_change IS NOT NULL
        ORDER BY s.rank_24h_change DESC
        LIMIT 5
    """, (today,))
    
    start_gainers = cursor.fetchall()
    print(f"Found {len(start_gainers)} top gainers")
    for r in start_gainers:
        print(f" - {r[0]} (+{r[3]})")

    # 2. Overall
    cursor.execute("""
        SELECT m.name, m.author_username, s.current_rank, m.domain
        FROM miniapp_statistics s
        JOIN miniapps m ON s.miniapp_id = m.id
        WHERE s.stat_date = %s
        ORDER BY s.current_rank ASC
        LIMIT 5
    """, (today,))
    
    start_overall = cursor.fetchall()
    print(f"Found {len(start_overall)} top overall")
    for r in start_overall:
        print(f" - {r[0]} (#{r[2]})")
        
    conn.close()

if __name__ == "__main__":
    debug_fetch()
