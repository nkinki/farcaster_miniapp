import json
import os
import requests
import psycopg2
import psycopg2.extras
from datetime import date, datetime
from dotenv import load_dotenv
from config import get_api_headers, FARCASTER_API_URL, DEFAULT_LIMIT
from email_notifications import send_success_notification, send_error_notification, send_daily_summary

load_dotenv()
NEON_DB_URL = os.getenv("NEON_DB_URL")

def download_latest_rankings():
    """Downloads the latest miniapp rankings"""
    url = f"{FARCASTER_API_URL}?limit={DEFAULT_LIMIT}"
    headers = get_api_headers()
    
    all_miniapps = []
    cursor = None
    
    print("Downloading miniapp rankings...")
    
    while True:
        full_url = url if not cursor else url + f"&cursor={cursor}"
        response = requests.get(full_url, headers=headers)
        
        if response.status_code != 200:
            print(f"Error: {response.status_code}")
            print(f"Response: {response.text}")
            return None
        
        data = response.json()
        
        # Handle 'result' object
        if 'result' in data and 'miniApps' in data['result']:
            miniapps = data['result']['miniApps']
        elif 'miniApps' in data:
            miniapps = data['miniApps']
        else:
            print(f"Unexpected API response structure")
            print(f"Response keys: {list(data.keys())}")
            return None
        
        all_miniapps.extend(miniapps)
        
        print(f"   Downloaded: {len(miniapps)} miniapps")
        
        # Next page
        next_cursor = data.get('next', {}).get('cursor')
        if next_cursor:
            cursor = next_cursor
            print(f"   Pagination, next cursor: {cursor}")
        else:
            break
    
    print(f"Total downloaded: {len(all_miniapps)} miniapps")
    return all_miniapps

def update_database(miniapps_data):
    """Updates the database with new data"""
    try:
        conn = psycopg2.connect(NEON_DB_URL)
        cursor = conn.cursor()
        
        today = date.today()
        inserted_miniapps = 0
        inserted_rankings = 0
        
        print("Updating database...")
        
        # Process data
        for item in miniapps_data:
            miniapp = item['miniApp']
            rank = item['rank']
            rank_72h_change = item.get('rank72hChange')
            
            # 1. Insert/update miniapp metadata
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
            
            # 2. Insert daily ranking
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
        
        # 3. Save complete snapshot (force update with new timestamp)
        cursor.execute("DELETE FROM ranking_snapshots WHERE snapshot_date = %s", (today,))
        cursor.execute("""
            INSERT INTO ranking_snapshots (
                snapshot_date, total_miniapps, raw_json
            ) VALUES (%s, %s, %s)
        """, (
            today,
            len(miniapps_data),
            json.dumps(miniapps_data)
        ))
        
        # 4. Update 24h changes
        cursor.execute("""
            INSERT INTO miniapp_rankings_24h (miniapp_id, ranking_date, rank, rank_24h_change)
            SELECT 
                r1.miniapp_id,
                r1.ranking_date,
                r1.rank,
                (r1.rank - r2.rank) as rank_24h_change
            FROM miniapp_rankings r1
            LEFT JOIN miniapp_rankings r2 ON r1.miniapp_id = r2.miniapp_id 
                AND r2.ranking_date = r1.ranking_date - INTERVAL '1 day'
            WHERE r1.ranking_date = %s
            ON CONFLICT (miniapp_id, ranking_date) DO UPDATE SET
                rank = EXCLUDED.rank,
                rank_24h_change = EXCLUDED.rank_24h_change
        """, (today,))
        
        # 5. Update weekly changes
        cursor.execute("""
            INSERT INTO miniapp_rankings_weekly (miniapp_id, ranking_date, rank, rank_7d_change)
            SELECT 
                r1.miniapp_id,
                r1.ranking_date,
                r1.rank,
                (r1.rank - r2.rank) as rank_7d_change
            FROM miniapp_rankings r1
            LEFT JOIN miniapp_rankings r2 ON r1.miniapp_id = r2.miniapp_id 
                AND r2.ranking_date = r1.ranking_date - INTERVAL '7 days'
            WHERE r1.ranking_date = %s
            ON CONFLICT (miniapp_id, ranking_date) DO UPDATE SET
                rank = EXCLUDED.rank,
                rank_7d_change = EXCLUDED.rank_7d_change
        """, (today,))
        
        # 6.1. Update 30d changes
        cursor.execute("""
            INSERT INTO miniapp_rankings_30d (miniapp_id, ranking_date, rank, rank_30d_change)
            SELECT 
                r1.miniapp_id,
                r1.ranking_date,
                r1.rank,
                (r1.rank - r2.rank) as rank_30d_change
            FROM miniapp_rankings r1
            LEFT JOIN miniapp_rankings r2 ON r1.miniapp_id = r2.miniapp_id 
                AND r2.ranking_date = r1.ranking_date - INTERVAL '30 days'
            WHERE r1.ranking_date = %s
            ON CONFLICT (miniapp_id, ranking_date) DO UPDATE SET
                rank = EXCLUDED.rank,
                rank_30d_change = EXCLUDED.rank_30d_change
        """, (today,))

        # 6.2. Update aggregated statistics (bővítés rank_30d_change mezővel)
        cursor.execute("""
            INSERT INTO miniapp_statistics (
                miniapp_id, stat_date, current_rank, 
                rank_24h_change, rank_72h_change, rank_7d_change, rank_30d_change,
                total_rankings, avg_rank, best_rank, worst_rank
            )
            SELECT 
                r.miniapp_id,
                r.ranking_date,
                r.rank,
                r24.rank_24h_change,
                r.rank_72h_change,
                rw.rank_7d_change,
                r30.rank_30d_change,
                COUNT(*) OVER (PARTITION BY r.miniapp_id) as total_rankings,
                AVG(r.rank) OVER (PARTITION BY r.miniapp_id) as avg_rank,
                MIN(r.rank) OVER (PARTITION BY r.miniapp_id) as best_rank,
                MAX(r.rank) OVER (PARTITION BY r.miniapp_id) as worst_rank
            FROM miniapp_rankings r
            LEFT JOIN miniapp_rankings_24h r24 ON r.miniapp_id = r24.miniapp_id 
                AND r.ranking_date = r24.ranking_date
            LEFT JOIN miniapp_rankings_weekly rw ON r.miniapp_id = rw.miniapp_id 
                AND r.ranking_date = rw.ranking_date
            LEFT JOIN miniapp_rankings_30d r30 ON r.miniapp_id = r30.miniapp_id 
                AND r.ranking_date = r30.ranking_date
            WHERE r.ranking_date = %s
            ON CONFLICT (miniapp_id, stat_date) DO UPDATE SET
                current_rank = EXCLUDED.current_rank,
                rank_24h_change = EXCLUDED.rank_24h_change,
                rank_72h_change = EXCLUDED.rank_72h_change,
                rank_7d_change = EXCLUDED.rank_7d_change,
                rank_30d_change = EXCLUDED.rank_30d_change,
                total_rankings = EXCLUDED.total_rankings,
                avg_rank = EXCLUDED.avg_rank,
                best_rank = EXCLUDED.best_rank,
                worst_rank = EXCLUDED.worst_rank
        """, (today,))
        
        conn.commit()
        print(f"Database updated successfully!")
        print(f"   - Miniapps: {inserted_miniapps}")
        print(f"   - Rankings: {inserted_rankings}")
        print(f"   - Snapshot: {today}")
        
        # Email értesítés küldése
        try:
            # Top változások összegyűjtése
            top_changes = ""
            for i, item in enumerate(miniapps_data[:5], 1):
                miniapp = item['miniApp']
                rank_change = item.get('rank72hChange', 0)
                change_str = f"({rank_change:+d})" if rank_change != 0 else ""
                top_changes += f"<li>#{i} {miniapp['name']} {change_str}</li>"
            
            if top_changes:
                top_changes = f"<ul>{top_changes}</ul>"
            else:
                top_changes = "<p>Nincs jelentős változás</p>"
            
            # Sikeres frissítés értesítése
            send_success_notification(len(miniapps_data), top_changes)
            
            # Napi összefoglaló (csak reggel)
            if datetime.now().hour < 12:  # Csak reggel
                send_daily_summary(miniapps_data)
                
        except Exception as email_error:
            print(f"Email küldési hiba: {email_error}")
        
    except Exception as e:
        print(f"Database error: {e}")
        
        # Hiba értesítés küldése
        try:
            send_error_notification(str(e), str(e))
        except Exception as email_error:
            print(f"Email küldési hiba: {email_error}")
            
    finally:
        if conn:
            conn.close()

def get_real_stats_for_miniapps(miniapps_data):
    """Valódi statisztikai mezőket tölt ki minden időtávra."""
    conn = psycopg2.connect(NEON_DB_URL)
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    today = date.today()
    cursor.execute("""
        SELECT miniapp_id, rank_24h_change, rank_72h_change, rank_7d_change, rank_30d_change
        FROM miniapp_statistics
        WHERE stat_date = %s
    """, (today,))
    stats = {row['miniapp_id']: row for row in cursor.fetchall()}
    conn.close()
    for item in miniapps_data:
        miniapp_id = item['miniApp']['id'] if 'miniApp' in item and 'id' in item['miniApp'] else None
        stat = stats.get(miniapp_id)
        item['rank24hChange'] = int(stat['rank_24h_change']) if stat and stat['rank_24h_change'] is not None else 0
        item['rank72hChange'] = int(stat['rank_72h_change']) if stat and stat['rank_72h_change'] is not None else 0
        item['rankWeeklyChange'] = int(stat['rank_7d_change']) if stat and stat['rank_7d_change'] is not None else 0
        item['rank30dChange'] = int(stat['rank_30d_change']) if stat and stat['rank_30d_change'] is not None else 0
    return miniapps_data

def save_json_backup(miniapps_data):
    """Saves JSON as backup"""
    today = date.today()
    filename = f"top_miniapps_{today}.json"
    output = {
        'snapshotDate': str(today),
        'miniapps': miniapps_data
    }
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"JSON backup saved: {filename}")
    # Always update the main top_miniapps.json as well
    with open("top_miniapps.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print("top_miniapps.json updated!")

def main():
    """Main function - complete daily update"""
    print("=== DAILY MINIAPP RANKING UPDATE ===")
    print(f"Date: {date.today()}")
    print()
    
    # 1. Download
    miniapps_data = download_latest_rankings()
    if not miniapps_data:
        print("Download failed!")
        return
    
    # 2. DB statisztikák hozzáfűzése
    miniapps_data = get_real_stats_for_miniapps(miniapps_data)
    
    # 3. JSON backup
    save_json_backup(miniapps_data)
    
    # 4. Database update
    update_database(miniapps_data)
    
    print("\nDaily update completed!")

if __name__ == "__main__":
    main() 