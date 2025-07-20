import json
import requests
from config import get_api_headers, FARCASTER_API_URL

def download_all_miniapps():
    """Downloads all miniapps and saves to JSON file"""
    
    url = f"{FARCASTER_API_URL}?limit=100"
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

def save_to_json(miniapps_data):
    """Saves miniapp data to JSON file"""
    
    # Save complete data to top_miniapps.json
    with open("top_miniapps.json", "w", encoding="utf-8") as f:
        json.dump(miniapps_data, f, ensure_ascii=False, indent=2)
    
    print(f"Data saved: top_miniapps.json")
    print(f"   - Miniapps count: {len(miniapps_data)}")
    print(f"   - File size: {len(json.dumps(miniapps_data))} characters")

def main():
    """Main function"""
    print("=== MINIAPP RANKING UPDATE ===")
    print()
    
    # 1. Download
    miniapps_data = download_all_miniapps()
    if not miniapps_data:
        print("Download failed!")
        return
    
    # 2. Save
    save_to_json(miniapps_data)
    
    print("\nRanking snapshot ready!")

if __name__ == "__main__":
    main() 