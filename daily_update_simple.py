import os
import requests
import psycopg2
import json
from datetime import date, timedelta
from dotenv import load_dotenv
from config import get_api_headers, FARCASTER_API_URL, DEFAULT_LIMIT
from email_notifications import send_success_notification, send_error_notification

load_dotenv()
NEON_DB_URL = os.getenv("NEON_DB_URL")

def download_latest_rankings():
    """Downloads the latest miniapp rankings from Farcaster API."""
    url = f"{FARCASTER_API_URL}?limit={DEFAULT_LIMIT}"
    headers = get_api_headers()
    all_miniapps = []
    cursor = None
    print("Downloading miniapp rankings...")
    while True:
        full_url = url if not cursor else f"{url}&cursor={cursor}"
        response = requests.get(full_url, headers=headers)
        if response.status_code != 200:
            print(f"API Error: {response.status_code} - {response.text}")
            return None
        data = response.json()
        miniapps = data.get('result', {}).get('miniApps', data.get('miniApps'))
        if miniapps is None:
            print(f"Unexpected API response structure: {data}")
            return None
        all_miniapps.extend(miniapps)
        print(f"   Downloaded: {len(miniapps)} miniapps")
        next_cursor = data.get('next', {}).get('cursor')
        if not next_cursor:
            break
        cursor = next_cursor
    print(f"Total downloaded: {len(all_miniapps)} miniapps")
    return all_miniapps

def get_past_rank(cursor, miniapp_id, target_date):
    """Fetches the rank of a miniapp from the statistics table for a specific past date."""
    cursor.execute("SELECT current_rank FROM miniapp_statistics WHERE miniapp_id = %s AND stat_date = %s", (miniapp_id, target_date))
    result = cursor.fetchone()
    return result[0] if result else None

def get_aggregate_stats(cursor, miniapp_id):
    """Fetches aggregate stats (avg, best rank) for a miniapp."""
    cursor.execute("SELECT AVG(current_rank), MIN(current_rank) FROM miniapp_statistics WHERE miniapp_id = %s AND current_rank > 0", (miniapp_id,))
    result = cursor.fetchone()
    return result if result else (None, None)

def update_database(miniapps_data):
    """Updates the database with the latest ranking data."""
    conn = None
    try:
        conn = psycopg2.connect(NEON_DB_URL)
        cursor = conn.cursor()
        today = date.today()
        
        print("Updating database...")

        print(f"Updating database for {len(miniapps_data)} miniapps...")
        
        # 1. Prepare batch data for miniapps metadata
        miniapp_meta_data = []
        for item in miniapps_data:
            m = item['miniApp']
            miniapp_meta_data.append((
                m['id'], m['name'], m['domain'], m.get('homeUrl'),
                m.get('iconUrl'), m.get('primaryCategory'),
                m.get('author', {}).get('fid'), m.get('author', {}).get('username'),
                m.get('author', {}).get('displayName'), m.get('author', {}).get('followerCount')
            ))

        # Bulk insert/update miniapps metadata
        from psycopg2.extras import execute_values
        execute_values(cursor, """
            INSERT INTO miniapps (id, name, domain, home_url, icon_url, primary_category, author_fid, author_username, author_display_name, author_follower_count)
            VALUES %s
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name, domain = EXCLUDED.domain, home_url = EXCLUDED.home_url,
                icon_url = EXCLUDED.icon_url, primary_category = EXCLUDED.primary_category,
                author_fid = EXCLUDED.author_fid, author_username = EXCLUDED.author_username,
                author_display_name = EXCLUDED.author_display_name,
                author_follower_count = EXCLUDED.author_follower_count;
        """, miniapp_meta_data)

        # 2. Pre-fetch historical ranks to avoid N+1 queries
        # We need ranks for 1, 3, 7, and 30 days ago
        past_dates = [today - timedelta(days=d) for d in [1, 3, 7, 30]]
        cursor.execute("""
            SELECT miniapp_id, stat_date, current_rank 
            FROM miniapp_statistics 
            WHERE stat_date IN %s
        """, (tuple(past_dates),))
        
        hist_ranks = {} # (miniapp_id, date) -> rank
        for mid, d, r in cursor.fetchall():
            hist_ranks[(mid, d)] = r

        # Pre-fetch aggregate stats
        cursor.execute("""
            SELECT miniapp_id, AVG(current_rank), MIN(current_rank) 
            FROM miniapp_statistics 
            WHERE current_rank > 0 
            GROUP BY miniapp_id
        """)
        agg_stats = {r[0]: (r[1], r[2]) for r in cursor.fetchall()}

        # 3. Prepare batch data for miniapp_statistics
        stats_batch_data = []
        for item in miniapps_data:
            mid = item['miniApp']['id']
            curr = item['rank']
            
            # Calculate changes using pre-fetched data
            r1 = hist_ranks.get((mid, today - timedelta(days=1)))
            r3 = hist_ranks.get((mid, today - timedelta(days=3)))
            r7 = hist_ranks.get((mid, today - timedelta(days=7)))
            r30 = hist_ranks.get((mid, today - timedelta(days=30)))
            
            c24h = (r1 - curr) if r1 is not None else None
            c72h = (r3 - curr) if r3 is not None else None
            c7d = (r7 - curr) if r7 is not None else None
            c30d = (r30 - curr) if r30 is not None else None
            
            avg_r, best_r = agg_stats.get(mid, (None, None))
            
            stats_batch_data.append((
                mid, today, curr, c24h, c72h, c7d, c30d, avg_r, best_r
            ))

        # Bulk insert/update statistics
        execute_values(cursor, """
            INSERT INTO miniapp_statistics (
                miniapp_id, stat_date, current_rank, 
                rank_24h_change, rank_72h_change, rank_7d_change, rank_30d_change,
                avg_rank, best_rank
            ) VALUES %s
            ON CONFLICT (miniapp_id, stat_date) DO UPDATE SET
                current_rank = EXCLUDED.current_rank,
                rank_24h_change = EXCLUDED.rank_24h_change,
                rank_72h_change = EXCLUDED.rank_72h_change,
                rank_7d_change = EXCLUDED.rank_7d_change,
                rank_30d_change = EXCLUDED.rank_30d_change,
                avg_rank = EXCLUDED.avg_rank,
                best_rank = EXCLUDED.best_rank;
        """, stats_batch_data)
        
        # 6. Fetch top 5 gainers and current top 5 for the notification
        cursor.execute("""
            SELECT m.name, m.author_username, s.current_rank, s.rank_24h_change, m.domain
            FROM miniapp_statistics s
            JOIN miniapps m ON s.miniapp_id = m.id
            WHERE s.stat_date = %s AND s.rank_24h_change IS NOT NULL
            ORDER BY s.rank_24h_change DESC
            LIMIT 10
        """, (today,))
        top_gainers = [
            {"name": r[0], "username": r[1], "rank": r[2], "change": r[3], "domain": r[4]} 
            for r in cursor.fetchall()
        ]

        cursor.execute("""
            SELECT m.name, m.author_username, s.current_rank, m.domain
            FROM miniapp_statistics s
            JOIN miniapps m ON s.miniapp_id = m.id
            WHERE s.stat_date = %s
            ORDER BY s.current_rank ASC
            LIMIT 5
        """, (today,))
        top_overall = [
            {"name": r[0], "username": r[1], "rank": r[2], "domain": r[3]} 
            for r in cursor.fetchall()
        ]

        # DEBUG: Check lists
        print(f"DEBUG: Found {len(top_gainers)} top gainers")
        print(f"DEBUG: Found {len(top_overall)} top overall")
        if not top_gainers:
            print(f"DEBUG: Today is {today}")
            cursor.execute("SELECT COUNT(*) FROM miniapp_statistics WHERE stat_date = %s", (today,))
            print(f"DEBUG: Stats count for today: {cursor.fetchone()[0]}")

        conn.commit()
        print(f"Database update successful for {len(miniapps_data)} miniapps.")
        send_success_notification(len(miniapps_data), top_gainers, top_overall)
    except Exception as e:
        print(f"Database error: {e}")
        send_error_notification("Database Update Failed", str(e))
    finally:
        if conn:
            conn.close()

def main():
    print(f"=== Starting Daily Miniapp Update: {date.today()} ===")
    miniapps_data = download_latest_rankings()
    if miniapps_data:
        update_database(miniapps_data)
    else:
        print("Download failed, aborting update.")
        send_error_notification("Download Failed", "Could not download miniapp data from Farcaster API.")
    print("\nDaily update completed!")

if __name__ == "__main__":
    main()