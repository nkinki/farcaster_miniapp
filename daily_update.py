import json
import os
import requests
import psycopg2
import psycopg2.extras
from datetime import date
from dotenv import load_dotenv
from config import get_api_headers, FARCASTER_API_URL, DEFAULT_LIMIT

load_dotenv()
NEON_DB_URL = os.getenv("NEON_DB_URL")

def download_latest_rankings():
    """Letölti a legfrissebb miniapp rangsort"""
    url = f"{FARCASTER_API_URL}?limit={DEFAULT_LIMIT}"
    headers = get_api_headers()
    
    all_miniapps = []
    cursor = None
    
    print("📥 Miniapp rangsor letöltése...")
    
    while True:
        full_url = url if not cursor else url + f"&cursor={cursor}"
        response = requests.get(full_url, headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Hiba: {response.status_code}")
            print(f"Válasz: {response.text}")
            return None
        
        data = response.json()
        
        # Kezeljük a 'result' objektumot
        if 'result' in data and 'miniApps' in data['result']:
            miniapps = data['result']['miniApps']
        elif 'miniApps' in data:
            miniapps = data['miniApps']
        else:
            print(f"❌ Váratlan API válasz struktúra")
            print(f"Válasz kulcsok: {list(data.keys())}")
            return None
        
        all_miniapps.extend(miniapps)
        
        print(f"   Letöltve: {len(miniapps)} miniapp")
        
        # Következő oldal
        next_cursor = data.get('next', {}).get('cursor')
        if next_cursor:
            cursor = next_cursor
            print(f"   Lapozás, következő cursor: {cursor}")
        else:
            break
    
    print(f"✅ Összesen letöltve: {len(all_miniapps)} miniapp")
    return all_miniapps

def update_database(miniapps_data):
    """Frissíti az adatbázist az új adatokkal"""
    try:
        conn = psycopg2.connect(NEON_DB_URL)
        cursor = conn.cursor()
        
        today = date.today()
        inserted_miniapps = 0
        inserted_rankings = 0
        
        print("💾 Adatbázis frissítése...")
        
        # Adatok feldolgozása
        for item in miniapps_data:
            miniapp = item['miniApp']
            rank = item['rank']
            rank_72h_change = item.get('rank72hChange')
            
            # 1. Miniapp metaadatok beszúrása/frissítése
            cursor.execute("""
                INSERT INTO miniapps (
                    id, short_id, name, domain, home_url, icon_url, image_url,
                    splash_image_url, splash_background_color, button_title,
                    supports_notifications, primary_category, author_fid,
                    author_username, author_display_name, author_follower_count,
                    author_following_count
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    domain = EXCLUDED.domain,
                    home_url = EXCLUDED.home_url,
                    icon_url = EXCLUDED.icon_url,
                    image_url = EXCLUDED.image_url,
                    splash_image_url = EXCLUDED.splash_image_url,
                    splash_background_color = EXCLUDED.splash_background_color,
                    button_title = EXCLUDED.button_title,
                    supports_notifications = EXCLUDED.supports_notifications,
                    primary_category = EXCLUDED.primary_category,
                    author_fid = EXCLUDED.author_fid,
                    author_username = EXCLUDED.author_username,
                    author_display_name = EXCLUDED.author_display_name,
                    author_follower_count = EXCLUDED.author_follower_count,
                    author_following_count = EXCLUDED.author_following_count
            """, (
                miniapp['id'],
                miniapp.get('shortId'),
                miniapp['name'],
                miniapp['domain'],
                miniapp.get('homeUrl'),
                miniapp.get('iconUrl'),
                miniapp.get('imageUrl'),
                miniapp.get('splashImageUrl'),
                miniapp.get('splashBackgroundColor'),
                miniapp.get('buttonTitle'),
                miniapp.get('supportsNotifications', False),
                miniapp.get('primaryCategory'),
                miniapp.get('author', {}).get('fid'),
                miniapp.get('author', {}).get('username'),
                miniapp.get('author', {}).get('displayName'),
                miniapp.get('author', {}).get('followerCount'),
                miniapp.get('author', {}).get('followingCount')
            ))
            inserted_miniapps += 1
            
            # 2. Napi ranking beszúrása
            cursor.execute("""
                INSERT INTO miniapp_rankings (
                    miniapp_id, ranking_date, rank, rank_72h_change
                ) VALUES (%s, %s, %s, %s)
                ON CONFLICT (miniapp_id, ranking_date) DO UPDATE SET
                    rank = EXCLUDED.rank,
                    rank_72h_change = EXCLUDED.rank_72h_change
            """, (
                miniapp['id'],
                today,
                rank,
                rank_72h_change
            ))
            inserted_rankings += 1
        
        # 3. Teljes snapshot mentése
        cursor.execute("""
            INSERT INTO ranking_snapshots (
                snapshot_date, total_miniapps, raw_json
            ) VALUES (%s, %s, %s)
            ON CONFLICT (snapshot_date) DO UPDATE SET
                total_miniapps = EXCLUDED.total_miniapps,
                raw_json = EXCLUDED.raw_json
        """, (
            today,
            len(miniapps_data),
            json.dumps(miniapps_data)
        ))
        
        # 4. 24h változások frissítése
        cursor.execute("""
            INSERT INTO miniapp_rankings_24h (miniapp_id, ranking_date, rank, rank_24h_change)
            SELECT 
                r1.miniapp_id,
                r1.ranking_date,
                r1.rank,
                (r2.rank - r1.rank) as rank_24h_change
            FROM miniapp_rankings r1
            LEFT JOIN miniapp_rankings r2 ON r1.miniapp_id = r2.miniapp_id 
                AND r2.ranking_date = r1.ranking_date - INTERVAL '1 day'
            WHERE r1.ranking_date = %s
            ON CONFLICT (miniapp_id, ranking_date) DO UPDATE SET
                rank = EXCLUDED.rank,
                rank_24h_change = EXCLUDED.rank_24h_change
        """, (today,))
        
        # 5. Heti változások frissítése
        cursor.execute("""
            INSERT INTO miniapp_rankings_weekly (miniapp_id, ranking_date, rank, rank_7d_change)
            SELECT 
                r1.miniapp_id,
                r1.ranking_date,
                r1.rank,
                (r2.rank - r1.rank) as rank_7d_change
            FROM miniapp_rankings r1
            LEFT JOIN miniapp_rankings r2 ON r1.miniapp_id = r2.miniapp_id 
                AND r2.ranking_date = r1.ranking_date - INTERVAL '7 days'
            WHERE r1.ranking_date = %s
            ON CONFLICT (miniapp_id, ranking_date) DO UPDATE SET
                rank = EXCLUDED.rank,
                rank_7d_change = EXCLUDED.rank_7d_change
        """, (today,))
        
        # 6. Összesített statisztikák frissítése
        cursor.execute("""
            INSERT INTO miniapp_statistics (
                miniapp_id, stat_date, current_rank, 
                rank_24h_change, rank_72h_change, rank_7d_change,
                total_rankings, avg_rank, best_rank, worst_rank
            )
            SELECT 
                r.miniapp_id,
                r.ranking_date,
                r.rank,
                r24.rank_24h_change,
                r.rank_72h_change,
                rw.rank_7d_change,
                COUNT(*) OVER (PARTITION BY r.miniapp_id) as total_rankings,
                AVG(r.rank) OVER (PARTITION BY r.miniapp_id) as avg_rank,
                MIN(r.rank) OVER (PARTITION BY r.miniapp_id) as best_rank,
                MAX(r.rank) OVER (PARTITION BY r.miniapp_id) as worst_rank
            FROM miniapp_rankings r
            LEFT JOIN miniapp_rankings_24h r24 ON r.miniapp_id = r24.miniapp_id 
                AND r.ranking_date = r24.ranking_date
            LEFT JOIN miniapp_rankings_weekly rw ON r.miniapp_id = rw.miniapp_id 
                AND r.ranking_date = rw.ranking_date
            WHERE r.ranking_date = %s
            ON CONFLICT (miniapp_id, stat_date) DO UPDATE SET
                current_rank = EXCLUDED.current_rank,
                rank_24h_change = EXCLUDED.rank_24h_change,
                rank_72h_change = EXCLUDED.rank_72h_change,
                rank_7d_change = EXCLUDED.rank_7d_change,
                total_rankings = EXCLUDED.total_rankings,
                avg_rank = EXCLUDED.avg_rank,
                best_rank = EXCLUDED.best_rank,
                worst_rank = EXCLUDED.worst_rank
        """, (today,))
        
        conn.commit()
        print(f"✅ Adatbázis frissítve!")
        print(f"   - Miniappok: {inserted_miniapps}")
        print(f"   - Rangsorok: {inserted_rankings}")
        print(f"   - Snapshot: {today}")
        
    except Exception as e:
        print(f"❌ Adatbázis hiba: {e}")
    finally:
        if conn:
            conn.close()

def save_json_backup(miniapps_data):
    """Menti a JSON-t backup-ként"""
    today = date.today()
    filename = f"top_miniapps_{today}.json"
    
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(miniapps_data, f, ensure_ascii=False, indent=2)
    
    print(f"💾 JSON backup mentve: {filename}")

def main():
    """Fő függvény - teljes napi frissítés"""
    print("=== NAPI MINIAPP RANGSOR FRISSÍTÉS ===")
    print(f"Dátum: {date.today()}")
    print()
    
    # 1. Letöltés
    miniapps_data = download_latest_rankings()
    if not miniapps_data:
        print("❌ Letöltés sikertelen!")
        return
    
    # 2. JSON backup
    save_json_backup(miniapps_data)
    
    # 3. Adatbázis frissítés
    update_database(miniapps_data)
    
    print("\n✅ Napi frissítés kész!")

if __name__ == "__main__":
    main() 