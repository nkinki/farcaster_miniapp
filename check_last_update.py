import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL") or os.getenv("NEON_DB_URL")

if not db_url:
    print("❌ No database URL found!")
    exit(1)

try:
    if "neon.tech" in db_url and "sslmode=" not in db_url:
        db_url += ("&" if "?" in db_url else "?") + "sslmode=require"
    
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    
    cursor.execute("SELECT MAX(stat_date) FROM miniapp_statistics")
    last_date = cursor.fetchone()[0]
    
    print(f"Latest data in miniapp_statistics: {last_date}")
    
    cursor.execute("SELECT COUNT(*) FROM miniapp_statistics WHERE stat_date = %s", (last_date,))
    count = cursor.fetchone()[0]
    print(f"Record count for {last_date}: {count}")
    
    conn.close()
except Exception as e:
    print(f"Error: {e}")
