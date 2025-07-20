import os
import psycopg2
import psycopg2.extras
from datetime import date
from dotenv import load_dotenv

load_dotenv()
NEON_DB_URL = os.getenv("NEON_DB_URL")

def check_data():
    """Ellenőrzi az adatbázis tartalmát"""
    try:
        conn = psycopg2.connect(NEON_DB_URL)
        cursor = conn.cursor()
        
        print("=== ADATBÁZIS ELLENŐRZÉS ===\n")
        
        # 1. Táblák léteznek-e?
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('miniapps', 'miniapp_rankings', 'ranking_snapshots')
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        print("📋 Táblák:")
        for table in tables:
            print(f"   ✅ {table[0]}")
        
        # 2. Hány miniapp van?
        cursor.execute("SELECT COUNT(*) FROM miniapps;")
        miniapp_count = cursor.fetchone()[0]
        print(f"\n📊 Miniappok száma: {miniapp_count}")
        
        # 3. Hány ranking van?
        cursor.execute("SELECT COUNT(*) FROM miniapp_rankings;")
        ranking_count = cursor.fetchone()[0]
        print(f"📈 Rangsorok száma: {ranking_count}")
        
        # 4. Hány snapshot van?
        cursor.execute("SELECT COUNT(*) FROM ranking_snapshots;")
        snapshot_count = cursor.fetchone()[0]
        print(f"📸 Snapshotok száma: {snapshot_count}")
        
        # 5. Mai top 10
        today = date.today()
        cursor.execute("""
            SELECT 
                m.name,
                m.domain,
                r.rank,
                r.rank_72h_change
            FROM miniapp_rankings r 
            JOIN miniapps m ON r.miniapp_id = m.id 
            WHERE r.ranking_date = %s
            ORDER BY r.rank 
            LIMIT 10;
        """, (today,))
        
        top_10 = cursor.fetchall()
        print(f"\n🏆 Mai top 10 ({today}):")
        for i, (name, domain, rank, change) in enumerate(top_10, 1):
            change_str = f"({change:+d})" if change else ""
            print(f"   {i:2d}. {name} ({domain}) - #{rank} {change_str}")
        
        # 6. Legnagyobb emelkedők
        cursor.execute("""
            SELECT 
                m.name,
                r.rank,
                r.rank_72h_change
            FROM miniapp_rankings r 
            JOIN miniapps m ON r.miniapp_id = m.id 
            WHERE r.ranking_date = %s
              AND r.rank_72h_change > 0
            ORDER BY r.rank_72h_change DESC 
            LIMIT 5;
        """, (today,))
        
        risers = cursor.fetchall()
        print(f"\n📈 Legnagyobb emelkedők:")
        for name, rank, change in risers:
            print(f"   {name} - #{rank} (+{change})")
        
        # 7. Legnagyobb esők (72h)
        cursor.execute("""
            SELECT 
                m.name,
                r.rank,
                r.rank_72h_change
            FROM miniapp_rankings r 
            JOIN miniapps m ON r.miniapp_id = m.id 
            WHERE r.ranking_date = %s
              AND r.rank_72h_change < 0
            ORDER BY r.rank_72h_change ASC 
            LIMIT 5;
        """, (today,))
        
        fallers = cursor.fetchall()
        print(f"\n📉 Legnagyobb esők (72h):")
        for name, rank, change in fallers:
            print(f"   {name} - #{rank} ({change})")
        
        # 8. 24h változások
        cursor.execute("""
            SELECT 
                m.name,
                r24.rank,
                r24.rank_24h_change
            FROM miniapp_rankings_24h r24
            JOIN miniapps m ON r24.miniapp_id = m.id 
            WHERE r24.ranking_date = %s
              AND r24.rank_24h_change IS NOT NULL
            ORDER BY ABS(r24.rank_24h_change) DESC 
            LIMIT 10;
        """, (today,))
        
        changes_24h = cursor.fetchall()
        print(f"\n🕐 24h változások:")
        for name, rank, change in changes_24h:
            change_str = f"+{change}" if change > 0 else f"{change}"
            print(f"   {name} - #{rank} ({change_str})")
        
        # 9. Heti változások
        cursor.execute("""
            SELECT 
                m.name,
                rw.rank,
                rw.rank_7d_change
            FROM miniapp_rankings_weekly rw
            JOIN miniapps m ON rw.miniapp_id = m.id 
            WHERE rw.ranking_date = %s
              AND rw.rank_7d_change IS NOT NULL
            ORDER BY ABS(rw.rank_7d_change) DESC 
            LIMIT 10;
        """, (today,))
        
        changes_7d = cursor.fetchall()
        print(f"\n📅 Heti változások:")
        for name, rank, change in changes_7d:
            change_str = f"+{change}" if change > 0 else f"{change}"
            print(f"   {name} - #{rank} ({change_str})")
        
        # 10. Összesített statisztikák
        cursor.execute("""
            SELECT 
                m.name,
                s.current_rank,
                s.rank_24h_change,
                s.rank_72h_change,
                s.rank_7d_change,
                s.avg_rank,
                s.best_rank,
                s.worst_rank
            FROM miniapp_statistics s
            JOIN miniapps m ON s.miniapp_id = m.id 
            WHERE s.stat_date = %s
            ORDER BY s.current_rank 
            LIMIT 5;
        """, (today,))
        
        stats = cursor.fetchall()
        print(f"\n📊 Összesített statisztikák (top 5):")
        for name, current, h24, h72, d7, avg, best, worst in stats:
            h24_str = f"{h24:+d}" if h24 is not None else "N/A"
            h72_str = f"{h72:+d}" if h72 is not None else "N/A"
            d7_str = f"{d7:+d}" if d7 is not None else "N/A"
            avg_str = f"{avg:.1f}" if avg is not None else "N/A"
            best_str = str(best) if best is not None else "N/A"
            worst_str = str(worst) if worst is not None else "N/A"
            print(f"   {name} - #{current} | 24h:{h24_str} | 72h:{h72_str} | 7d:{d7_str} | Átlag:{avg_str} | Legjobb:{best_str} | Legrosszabb:{worst_str}")
        
        print(f"\n✅ Ellenőrzés kész!")
        
    except Exception as e:
        print(f"❌ Hiba történt: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    check_data() 