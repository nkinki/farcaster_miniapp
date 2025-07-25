import json
import requests
import os
import psycopg2
import datetime
from config import get_api_headers, FARCASTER_API_URL

def download_all_miniapps():
    url = f"{FARCASTER_API_URL}?limit=100"
    headers = get_api_headers()
    all_miniapps = []
    cursor = None
    while True:
        full_url = url if not cursor else url + f"&cursor={cursor}"
        response = requests.get(full_url, headers=headers)
        if response.status_code != 200:
            print(f"Hiba: {response.status_code}")
            return None
        data = response.json()
        if 'result' in data and 'miniApps' in data['result']:
            miniapps = data['result']['miniApps']
        elif 'miniApps' in data:
            miniapps = data['miniApps']
        else:
            print("Váratlan API válasz")
            return None
        all_miniapps.extend(miniapps)
        next_cursor = data.get('next', {}).get('cursor')
        if next_cursor:
            cursor = next_cursor
        else:
            break
    return all_miniapps

def get_rank_changes_from_db():
    conn = psycopg2.connect(os.environ["NEON_DB_URL"])
    cur = conn.cursor()
    cur.execute("""
        SELECT miniapp_id, rank_24h_change, rank_72h_change, rank_7d_change, rank_30d_change
        FROM miniapp_statistics
        WHERE stat_date = (SELECT MAX(stat_date) FROM miniapp_statistics)
    """)
    result = cur.fetchall()
    cur.close()
    conn.close()
    return {
        row[0]: {
            "rank24hChange": row[1],
            "rank72hChange": row[2],
            "rankWeeklyChange": row[3],
            "rank30dChange": row[4]
        }
        for row in result
    }

def merge_rank_changes(miniapps, rank_changes):
    for app in miniapps:
        miniapp_id = app.get("id") or app.get("miniApp", {}).get("id") or app.get("domain")
        changes = rank_changes.get(miniapp_id)
        if changes:
            app["rank24hChange"] = changes["rank24hChange"] or 0
            app["rank72hChange"] = changes["rank72hChange"] or 0
            app["rankWeeklyChange"] = changes["rankWeeklyChange"] or 0
            app["rank30dChange"] = changes["rank30dChange"] or 0
        else:
            app["rank24hChange"] = 0
            app["rank72hChange"] = 0
            app["rankWeeklyChange"] = 0
            app["rank30dChange"] = 0
    return miniapps

def save_to_json(miniapps_data):
    today = datetime.date.today().isoformat()
    output = {
        'snapshotDate': today,
        'miniapps': miniapps_data
    }
    with open("top_miniapps.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print("Adatok mentve: top_miniapps.json")

def main():
    miniapps_data = download_all_miniapps()
    if not miniapps_data:
        print("Letöltés sikertelen!")
        return
    rank_changes = get_rank_changes_from_db()
    miniapps_data = merge_rank_changes(miniapps_data, rank_changes)
    save_to_json(miniapps_data)
    print("Kész!")

if __name__ == "__main__":
    main() 