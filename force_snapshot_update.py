import os
import psycopg2
import json
from datetime import date
from dotenv import load_dotenv

load_dotenv()
NEON_DB_URL = os.getenv("NEON_DB_URL")

def force_snapshot_update():
    """Kényszeríti a snapshot frissítését"""
    try:
        conn = psycopg2.connect(NEON_DB_URL)
        cursor = conn.cursor()
        
        today = date.today()
        
        print("=== KÉNYSZERÍTETT SNAPSHOT FRISSÍTÉS ===")
        print(f"Dátum: {today}")
        print()
        
        # JSON fájl beolvasása
        with open("top_miniapps.json", "r", encoding="utf-8") as f:
            miniapps_data = json.load(f)
        
        print(f"JSON adatok beolvasva: {len(miniapps_data)} miniapp")
        
        # Snapshot törlése és újra beszúrása
        cursor.execute("DELETE FROM ranking_snapshots WHERE snapshot_date = %s", (today,))
        print(f"Mai snapshot törölve")
        
        # Új snapshot beszúrása
        cursor.execute("""
            INSERT INTO ranking_snapshots (
                snapshot_date, total_miniapps, raw_json
            ) VALUES (%s, %s, %s)
        """, (
            today,
            len(miniapps_data),
            json.dumps(miniapps_data)
        ))
        
        conn.commit()
        print(f"✅ Új snapshot beszúrva: {today}")
        print(f"   - Miniappok: {len(miniapps_data)}")
        print(f"   - Időpont: {cursor.execute('SELECT NOW()').fetchone()[0]}")
        
    except Exception as e:
        print(f"❌ Hiba történt: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    force_snapshot_update() 