import json
import requests
from config import get_api_headers, FARCASTER_API_URL

def download_all_miniapps():
    """Letölti az összes miniapp-ot és menti JSON fájlba"""
    
    url = f"{FARCASTER_API_URL}?limit=100"
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

def save_to_json(miniapps_data):
    """Menti a miniapp adatokat JSON fájlba"""
    
    # Menti a teljes adatot a top_miniapps.json fájlba
    with open("top_miniapps.json", "w", encoding="utf-8") as f:
        json.dump(miniapps_data, f, ensure_ascii=False, indent=2)
    
    print(f"💾 Adatok mentve: top_miniapps.json")
    print(f"   - Miniappok száma: {len(miniapps_data)}")
    print(f"   - Fájl méret: {len(json.dumps(miniapps_data))} karakter")

def main():
    """Fő függvény"""
    print("=== MINIAPP RANGSOR FRISSÍTÉS ===")
    print()
    
    # 1. Letöltés
    miniapps_data = download_all_miniapps()
    if not miniapps_data:
        print("❌ Letöltés sikertelen!")
        return
    
    # 2. Mentés
    save_to_json(miniapps_data)
    
    print("\n✅ Ranking snapshot kész!")

if __name__ == "__main__":
    main() 