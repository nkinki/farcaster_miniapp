import os
import psycopg2
from datetime import date
from dotenv import load_dotenv

load_dotenv()
NEON_DB_URL = os.getenv("NEON_DB_URL")

def check_snapshot():
    """Ellenőrzi a legutolsó snapshot dátumát"""
    try:
        conn = psycopg2.connect(NEON_DB_URL)
        cursor = conn.cursor()
        
        print("=== SNAPSHOT ELLENŐRZÉS ===")
        print(f"Mai dátum: {date.today()}")
        print()
        
        # Legutolsó snapshot
        cursor.execute("""
            SELECT snapshot_date, total_miniapps, created_at
            FROM ranking_snapshots
            ORDER BY snapshot_date DESC
            LIMIT 5;
        """)
        
        snapshots = cursor.fetchall()
        print("📸 Legutolsó snapshotok:")
        for snapshot_date, total_miniapps, created_at in snapshots:
            print(f"   {snapshot_date} - {total_miniapps} miniapp (létrehozva: {created_at})")
        
        # Mai snapshot létezik-e?
        today = date.today()
        cursor.execute("""
            SELECT COUNT(*) FROM ranking_snapshots WHERE snapshot_date = %s
        """, (today,))
        
        today_count = cursor.fetchone()[0]
        print(f"\n📅 Mai snapshot ({today}): {'✅ LÉTEZIK' if today_count > 0 else '❌ NEM LÉTEZIK'}")
        
        # Legutolsó ranking dátum
        cursor.execute("""
            SELECT MAX(ranking_date) FROM miniapp_rankings
        """)
        
        latest_ranking = cursor.fetchone()[0]
        print(f"📊 Legutolsó ranking dátum: {latest_ranking}")
        
        # Snapshot vs ranking dátum összehasonlítás
        if latest_ranking and latest_ranking == today:
            print("✅ Ranking és snapshot dátumok egyeznek")
        else:
            print("⚠️  Ranking és snapshot dátumok nem egyeznek")
        
        print(f"\n✅ Ellenőrzés kész!")
        
    except Exception as e:
        print(f"❌ Hiba történt: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    check_snapshot() 