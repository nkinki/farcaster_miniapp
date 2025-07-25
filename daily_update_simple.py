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
    """Downloads the latest miniapp rankings."""
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
        
        if 'result' in data and 'miniApps' in data['result']:
            miniapps = data['result']['miniApps']
        elif 'miniApps' in data:
            miniapps = data['miniApps']
        else:
            print("Unexpected API response structure")
            print(f"Response keys: {list(data.keys())}")
            return None
        
        all_miniapps.extend(miniapps)
        print(f"   Downloaded: {len(miniapps)} miniapps")
        
        next_cursor = data.get('next', {}).get('cursor')
        if next_cursor:
            cursor = next_cursor
            print(f"   Pagination, next cursor: {cursor}")
        else:
            break
    
    print(f"Total downloaded: {len(all_miniapps)} miniapps")
    return all_miniapps

def update_database(miniapps_data):
    """Updates the database with new data."""
    conn = None
    try:
        conn = psycopg2.connect(NEON_DB_URL)
        cursor = conn.cursor()
        
        today = date.today()
        
        print("Updating database...")
        
        # 1. & 2. Insert/update miniapp metadata and today's raw ranking
        for item in miniapps_data:
            miniapp = item['miniApp']
            rank = item['rank']
            
            # Insert/update miniapp metadata
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
                miniapp['id'], miniapp.get('shortId'), miniapp['name'], miniapp['domain'],
                miniapp.get('homeUrl'), miniapp.get('iconUrl'), miniapp.get('imageUrl'),
                miniapp.get('splashImageUrl'), miniapp.get('splashBackgroundColor'),
                miniapp.get('buttonTitle'), miniapp.get('supportsNotifications', False),
                miniapp.get('primaryCategory'), miniapp.get('author', {}).get('fid'),
                miniapp.get('author', {}).get('username'), miniapp.get('author', {}).get('displayName'),
                miniapp.get('author', {}).get('followerCount'), miniapp.get('author', {}).get('followingCount')
            ))
            
            # Insert daily ranking (without 72h change from API)
            cursor.execute("""
                INSERT INTO miniapp_rankings (miniapp_id, ranking_date, rank)
                VALUES (%s, %s, %s)
                ON CONFLICT (miniapp_id, ranking_date) DO UPDATE SET rank = EXCLUDED.rank
            """, (miniapp['id'], today, rank))
        
        print(f"Processed {len(miniapps_data)} miniapps and their daily ranks.")
        conn.commit()

        # 3. Calculate rank changes directly in the final statistics table
        print("Calculating and updating aggregated statistics...")
        cursor.execute("""
            INSERT INTO miniapp_statistics (
                miniapp_id, stat_date, current_rank,
                rank_24h_change, rank_72h_change, rank_7d_change, rank_30d_change,
                total_rankings, avg_rank, best_rank, worst_rank
            )
            SELECT
                r_today.miniapp_id,
                r_today.ranking_date,
                r_today.rank,
                (r_1d.rank - r_today.rank) AS rank_24h_change,
                (r_3d.rank - r_today.rank) AS rank_72h_change, -- JAVÍTÁS: Számolás DB-ből
                (r_7d.rank - r_today.rank) AS rank_7d_change,
                (r_30d.rank - r_today.rank) AS rank_30d_change,
                agg.total_rankings,
                agg.avg_rank,
                agg.best_rank,
                agg.worst_rank
            FROM
                miniapp_rankings AS r_today
            LEFT JOIN
                miniapp_rankings AS r_1d ON r_today.miniapp_id = r_1d.miniapp_id AND r_1d.ranking_date = r_today.ranking_date - INTERVAL '1 day'
            LEFT JOIN
                miniapp_rankings AS r_3d ON r_today.miniapp_id = r_3d.miniapp_id AND r_3d.ranking_date = r_today.ranking_date - INTERVAL '3 days'
            LEFT JOIN
                miniapp_rankings AS r_7d ON r_today.miniapp_id = r_7d.miniapp_id AND r_7d.ranking_date = r_today.ranking_date - INTERVAL '7 days'
            LEFT JOIN
                miniapp_rankings AS r_30d ON r_today.miniapp_id = r_30d.miniapp_id AND r_30d.ranking_date = r_today.ranking_date - INTERVAL '30 days'
            JOIN
                (SELECT
                    miniapp_id,
                    COUNT(*) as total_rankings,
                    AVG(rank) as avg_rank,
                    MIN(rank) as best_rank,
                    MAX(rank) as worst_rank
                FROM miniapp_rankings
                GROUP BY miniapp_id) AS agg ON r_today.miniapp_id = agg.miniapp_id
            WHERE
                r_today.ranking_date = %s
            ON CONFLICT (miniapp_id, stat_date) DO UPDATE SET
                current_rank = EXCLUDED.current_rank,
                rank_24h_change = EXCLUDED.rank_24h_change,
                rank_72h_change = EXCLUDED.rank_72h_change,
                rank_7d_change = EXCLUDED.rank_7d_change,
                rank_30d_change = EXCLUDED.rank_30d_change,
                total_rankings = EXCLUDED.total_rankings,
                avg_rank = EXCLUDED.avg_rank,
                best_rank = EXCLUDED.best_rank,
                worst_rank = EXCLUDED.worst_rank;
        """, (today,))

        # JAVÍTÁS: A felesleges ideiglenes táblák (`_24h`, `_weekly`, `_30d`) és a "kamu" adat pótlás el lettek távolítva.
        # A statisztikák most már közvetlenül a `miniapp_rankings` táblából számolódnak.

        conn.commit()
        print("Database statistics updated successfully!")

        # Send email notifications
        try:
            send_success_notification(len(miniapps_data), "Daily DB update complete.")
            if datetime.now().hour < 12:
                send_daily_summary(miniapps_data)
        except Exception as email_error:
            print(f"Failed to send email: {email_error}")

    except Exception as e:
        print(f"Database error: {e}")
        try:
            send_error_notification("Database Update Failed", str(e))
        except Exception as email_error:
            print(f"Failed to send error email: {email_error}")
            
    finally:
        if conn:
            conn.close()

def main():
    """Main function to run the daily update process."""
    print(f"=== Starting Daily Miniapp Update: {date.today()} ===")
    
    miniapps_data = download_latest_rankings()
    if not miniapps_data:
        print("Download failed, aborting update.")
        return
    
    update_database(miniapps_data)
    
    print("\nDaily update completed!")

if __name__ == "__main__":
    main()