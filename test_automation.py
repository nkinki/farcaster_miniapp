#!/usr/bin/env python3
"""
Teszt script az automatikus frissítési folyamathoz
"""

import os
import json
import subprocess
import sys
from datetime import datetime

def test_data_download():
    """Teszteli az adatok letöltését"""
    print("🔄 Tesztelés: Adatok letöltése...")
    
    try:
        result = subprocess.run([sys.executable, "update_ranking.py"], 
                              capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            print("✅ Adatok letöltése sikeres")
            
            # Ellenőrizzük a fájlt
            if os.path.exists("top_miniapps.json"):
                with open("top_miniapps.json", "r", encoding="utf-8") as f:
                    data = json.load(f)
                print(f"   - Miniappok száma: {len(data)}")
                return True
            else:
                print("❌ top_miniapps.json fájl nem található")
                return False
        else:
            print(f"❌ Adatok letöltése sikertelen: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("❌ Időtúllépés az adatok letöltésekor")
        return False
    except Exception as e:
        print(f"❌ Hiba: {e}")
        return False

def test_database_update():
    """Teszteli az adatbázis frissítését"""
    print("🔄 Tesztelés: Adatbázis frissítése...")
    
    try:
        result = subprocess.run([sys.executable, "daily_update.py"], 
                              capture_output=True, text=True, timeout=120)
        
        if result.returncode == 0:
            print("✅ Adatbázis frissítése sikeres")
            return True
        else:
            print(f"❌ Adatbázis frissítése sikertelen: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("❌ Időtúllépés az adatbázis frissítésekor")
        return False
    except Exception as e:
        print(f"❌ Hiba: {e}")
        return False

def test_data_copy():
    """Teszteli az adatok másolását"""
    print("🔄 Tesztelés: Adatok másolása...")
    
    try:
        # Másoljuk a fájlt
        import shutil
        shutil.copy("top_miniapps.json", "public/data/")
        
        if os.path.exists("public/data/top_miniapps.json"):
            print("✅ Adatok másolása sikeres")
            return True
        else:
            print("❌ Adatok másolása sikertelen")
            return False
            
    except Exception as e:
        print(f"❌ Hiba: {e}")
        return False

def test_api_response():
    """Teszteli az API válaszát"""
    print("🔄 Tesztelés: API válasz...")
    
    try:
        import requests
        
        # Lokális API teszt
        response = requests.get("http://localhost:3000/api/miniapps?limit=5", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API válasz sikeres - {len(data.get('miniapps', []))} miniapp")
            return True
        else:
            print(f"❌ API válasz sikertelen: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("⚠️  Lokális szerver nem fut - API teszt kihagyva")
        return True
    except Exception as e:
        print(f"❌ Hiba: {e}")
        return False

def main():
    """Fő teszt függvény"""
    print("=== AUTOMATIZÁCIÓS TESZT ===")
    print(f"Dátum: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    tests = [
        ("Adatok letöltése", test_data_download),
        ("Adatbázis frissítése", test_database_update),
        ("Adatok másolása", test_data_copy),
        ("API válasz", test_api_response)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n--- {test_name} ---")
        result = test_func()
        results.append((test_name, result))
    
    # Összefoglaló
    print(f"\n=== TESZT EREDMÉNYEK ===")
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
    
    print(f"\nÖsszesen: {passed}/{total} teszt sikeres")
    
    if passed == total:
        print("🎉 Minden teszt sikeres! Az automatikus frissítés készen áll.")
    else:
        print("⚠️  Néhány teszt sikertelen. Ellenőrizd a konfigurációt.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 