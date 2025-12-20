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

        for item in miniapps_data:
            miniapp = item['miniApp']
            current_rank = item['rank']
            miniapp_id = miniapp['id']

            # 1. Update miniapp metadata
            cursor.execute("""
                INSERT INTO miniapps (id, name, domain, home_url, icon_url, primary_category, author_fid, author_username, author_display_name, author_follower_count)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name, domain = EXCLUDED.domain, home_url = EXCLUDED.home_url,
                    icon_url = EXCLUDED.icon_url, primary_category = EXCLUDED.primary_category,
                    author_fid = EXCLUDED.author_fid, author_username = EXCLUDED.author_username,
                    author_display_name = EXCLUDED.author_display_name,
                    author_follower_count = EXCLUDED.author_follower_count;
            """, (
                miniapp_id, miniapp['name'], miniapp['domain'], miniapp.get('homeUrl'),
                miniapp.get('iconUrl'), miniapp.get('primaryCategory'),
                miniapp.get('author', {}).get('fid'), miniapp.get('author', {}).get('username'),
                miniapp.get('author', {}).get('displayName'), miniapp.get('author', {}).get('followerCount')
            ))

            # 2. Get past ranks for change calculation
            rank_1d_ago = get_past_rank(cursor, miniapp_id, today - timedelta(days=1))
            rank_3d_ago = get_past_rank(cursor, miniapp_id, today - timedelta(days=3))
            rank_7d_ago = get_past_rank(cursor, miniapp_id, today - timedelta(days=7))
            rank_30d_ago = get_past_rank(cursor, miniapp_id, today - timedelta(days=30))

            # 3. Calculate changes
            rank_24h_change = (rank_1d_ago - current_rank) if rank_1d_ago is not None else None
            rank_72h_change = (rank_3d_ago - current_rank) if rank_3d_ago is not None else None
            rank_7d_change = (rank_7d_ago - current_rank) if rank_7d_ago is not None else None
            rank_30d_change = (rank_30d_ago - current_rank) if rank_30d_ago is not None else None
            
            # Get aggregate stats
            avg_rank, best_rank = get_aggregate_stats(cursor, miniapp_id)
            
            # 4. Insert or update today's statistics
            cursor.execute("""
                INSERT INTO miniapp_statistics (
                    miniapp_id, stat_date, current_rank, 
                    rank_24h_change, rank_72h_change, rank_7d_change, rank_30d_change,
                    avg_rank, best_rank
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (miniapp_id, stat_date) DO UPDATE SET
                    current_rank = EXCLUDED.current_rank,
                    rank_24h_change = EXCLUDED.rank_24h_change,
                    rank_72h_change = EXCLUDED.rank_72h_change,
                    rank_7d_change = EXCLUDED.rank_7d_change,
                    rank_30d_change = EXCLUDED.rank_30d_change,
                    avg_rank = EXCLUDED.avg_rank,
                    best_rank = EXCLUDED.best_rank;
            """, (miniapp_id, today, current_rank, rank_24h_change, rank_72h_change, rank_7d_change, rank_30d_change, avg_rank, best_rank))
        
        # 6. Fetch top 5 gainers and current top 5 for the notification
        cursor.execute("""
            SELECT m.name, m.author_username, s.current_rank, s.rank_24h_change, m.domain
            FROM miniapp_statistics s
            JOIN miniapps m ON s.miniapp_id = m.id
            WHERE s.stat_date = %s AND s.rank_24h_change IS NOT NULL
            ORDER BY s.rank_24h_change DESC
            LIMIT 5
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