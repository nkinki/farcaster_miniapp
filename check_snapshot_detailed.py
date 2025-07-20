import os
import psycopg2
from datetime import date, datetime
from dotenv import load_dotenv

load_dotenv()
NEON_DB_URL = os.getenv("NEON_DB_URL")

def check_snapshot_detailed():
    """Részletes snapshot ellenőrzés"""
    try:
        conn = psycopg2.connect(NEON_DB_URL)
        cursor = conn.cursor()
        
        print("=== RÉSZLETES SNAPSHOT ELLENŐRZÉS ===")
        print(f"Jelenlegi idő: {datetime.now()}")
        print(f"Mai dátum: {date.today()}")
        print()
        
        # Mai snapshot részletei
        today = date.today()
        cursor.execute("""
            SELECT snapshot_date, total_miniapps, created_at, 
                   EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_ago
            FROM ranking_snapshots 
            WHERE snapshot_date = %s
            ORDER BY created_at DESC
        """, (today,))
        
        today_snapshots = cursor.fetchall()
        print(f"📅 Mai snapshotok ({today}):")
        if today_snapshots:
            for snapshot_date, total_miniapps, created_at, minutes_ago in today_snapshots:
                print(f"   - {created_at} ({minutes_ago:.1f} perce)")
                print(f"     Miniappok: {total_miniapps}")
        else:
            print("   ❌ Nincs mai snapshot")
        
        # Összes snapshot időrendben
        cursor.execute("""
            SELECT snapshot_date, total_miniapps, created_at,
                   EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_ago
            FROM ranking_snapshots 
            ORDER BY created_at DESC
            LIMIT 10
        """)
        
        all_snapshots = cursor.fetchall()
        print(f"\n📸 Összes snapshot (utolsó 10):")
        for snapshot_date, total_miniapps, created_at, minutes_ago in all_snapshots:
            print(f"   {snapshot_date} - {created_at} ({minutes_ago:.1f} perce) - {total_miniapps} miniapp")
        
        # Legutolsó ranking frissítés
        cursor.execute("""
            SELECT MAX(created_at) as last_ranking_update,
                   EXTRACT(EPOCH FROM (NOW() - MAX(created_at)))/60 as minutes_ago
            FROM miniapp_rankings
        """)
        
        last_ranking = cursor.fetchone()
        print(f"\n📊 Legutolsó ranking frissítés:")
        if last_ranking[0]:
            print(f"   {last_ranking[0]} ({last_ranking[1]:.1f} perce)")
        else:
            print("   ❌ Nincs ranking adat")
        
        # Snapshot vs ranking idő összehasonlítás
        if today_snapshots and last_ranking[0]:
            latest_snapshot = today_snapshots[0][2]  # created_at
            latest_ranking = last_ranking[0]
            
            time_diff = abs((latest_snapshot - latest_ranking).total_seconds() / 60)
            print(f"\n⏰ Időeltérés (snapshot vs ranking): {time_diff:.1f} perc")
            
            if time_diff < 5:
                print("✅ Snapshot és ranking szinkronban vannak")
            else:
                print("⚠️  Snapshot és ranking nem szinkronban vannak")
        
        print(f"\n✅ Részletes ellenőrzés kész!")
        
    except Exception as e:
        print(f"❌ Hiba történt: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    check_snapshot_detailed() 