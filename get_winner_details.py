import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
NEON_DB_URL = os.getenv("NEON_DB_URL") or os.getenv("DATABASE_URL")

def get_winner_details():
    conn = psycopg2.connect(NEON_DB_URL)
    cursor = conn.cursor()

    fid = 815252
    print(f"Checking details for FID {fid}...")
    
    # Try multiple possible tables
    sites = [
        ("lottery_tickets", "player_name", "player_fid"),
        ("users", "username", "fid"),
        ("players", "display_name", "fid")
    ]
    
    found = False
    for table, name_col, fid_col in sites:
        try:
            cursor.execute(f"SELECT {name_col} FROM {table} WHERE {fid_col} = %s AND {name_col} IS NOT NULL LIMIT 1", (fid,))
            res = cursor.fetchone()
            if res:
                print(f"Found in {table}: {res[0]}")
                found = True
                break
        except Exception:
            conn.rollback()
            continue
            
    if not found:
        print("No name found in local database for this FID.")

    conn.close()

if __name__ == "__main__":
    get_winner_details()
