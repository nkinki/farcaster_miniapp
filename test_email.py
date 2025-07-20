#!/usr/bin/env python3
"""
Email értesítési rendszer tesztelése
"""

import os
from datetime import datetime
from dotenv import load_dotenv
from email_notifications import (
    send_email_notification, 
    send_success_notification, 
    send_error_notification, 
    send_daily_summary
)

load_dotenv()

def test_basic_email():
    """Alapvető email teszt"""
    print("🧪 Alapvető email teszt...")
    
    subject = "🧪 Farcaster Miniapp Email Teszt"
    body = f"""
    <h2>🧪 Email Teszt</h2>
    <p>Ez egy teszt email az automatikus értesítési rendszerhez.</p>
    <p><strong>Időpont:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    <p><strong>Státusz:</strong> ✅ Teszt sikeres</p>
    """
    
    success = send_email_notification(subject, body)
    if success:
        print("✅ Alapvető email teszt sikeres!")
    else:
        print("❌ Alapvető email teszt sikertelen!")
    
    return success

def test_success_notification():
    """Sikeres frissítés értesítés teszt"""
    print("🧪 Sikeres frissítés értesítés teszt...")
    
    miniapps_count = 246
    top_changes = """
    <ul>
        <li>#1 Polling Center</li>
        <li>#2 Degen (+88)</li>
        <li>#3 Ponder (+12)</li>
        <li>#4 Warpcast (-5)</li>
        <li>#5 Farcaster (+3)</li>
    </ul>
    """
    
    success = send_success_notification(miniapps_count, top_changes)
    if success:
        print("✅ Sikeres frissítés értesítés teszt sikeres!")
    else:
        print("❌ Sikeres frissítés értesítés teszt sikertelen!")
    
    return success

def test_error_notification():
    """Hiba értesítés teszt"""
    print("🧪 Hiba értesítés teszt...")
    
    error_message = "Teszt hiba üzenet"
    error_details = """
    Traceback (most recent call last):
      File "test_email.py", line 45, in test_error_notification
        raise Exception("Teszt hiba")
    Exception: Teszt hiba
    """
    
    success = send_error_notification(error_message, error_details)
    if success:
        print("✅ Hiba értesítés teszt sikeres!")
    else:
        print("❌ Hiba értesítés teszt sikertelen!")
    
    return success

def test_daily_summary():
    """Napi összefoglaló teszt"""
    print("🧪 Napi összefoglaló teszt...")
    
    # Teszt adatok
    miniapps_data = [
        {
            'miniApp': {'name': 'Polling Center', 'domain': 'polling.center'},
            'rank72hChange': 0
        },
        {
            'miniApp': {'name': 'Degen', 'domain': 'degen.com'},
            'rank72hChange': 88
        },
        {
            'miniApp': {'name': 'Ponder', 'domain': 'ponder.com'},
            'rank72hChange': 12
        },
        {
            'miniApp': {'name': 'Warpcast', 'domain': 'warpcast.com'},
            'rank72hChange': -5
        },
        {
            'miniApp': {'name': 'Farcaster', 'domain': 'farcaster.com'},
            'rank72hChange': 3
        }
    ]
    
    success = send_daily_summary(miniapps_data)
    if success:
        print("✅ Napi összefoglaló teszt sikeres!")
    else:
        print("❌ Napi összefoglaló teszt sikertelen!")
    
    return success

def check_email_config():
    """Email konfiguráció ellenőrzése"""
    print("🔧 Email konfiguráció ellenőrzése...")
    
    # Először .env-ből próbáljuk
    required_vars = ['EMAIL_SENDER', 'EMAIL_PASSWORD', 'EMAIL_RECIPIENT']
    missing_vars = []
    
    for var in required_vars:
        value = os.getenv(var)
        if not value:
            missing_vars.append(var)
        else:
            print(f"✅ {var}: {'*' * len(value)}")
    
    # Ha hiányzó .env változók, próbáljuk a config.py-t
    if missing_vars:
        try:
            from config import get_email_config
            email_config = get_email_config()
            
            print("\n📝 .env fájl hiányzik, config.py-ból olvasunk...")
            
            # Ellenőrizzük a config.py beállításokat
            if email_config["sender"] != "your-email@gmail.com":
                print(f"✅ EMAIL_SENDER: {email_config['sender']}")
                missing_vars = [var for var in missing_vars if var != "EMAIL_SENDER"]
            else:
                print(f"❌ EMAIL_SENDER: Nincs beállítva")
                
            if email_config["password"] != "your-app-password":
                print(f"✅ EMAIL_PASSWORD: {'*' * len(email_config['password'])}")
                missing_vars = [var for var in missing_vars if var != "EMAIL_PASSWORD"]
            else:
                print(f"❌ EMAIL_PASSWORD: Nincs beállítva")
                
            if email_config["recipient"] != "your-email@gmail.com":
                print(f"✅ EMAIL_RECIPIENT: {email_config['recipient']}")
                missing_vars = [var for var in missing_vars if var != "EMAIL_RECIPIENT"]
            else:
                print(f"❌ EMAIL_RECIPIENT: Nincs beállítva")
                
        except Exception as e:
            print(f"❌ Config.py hiba: {e}")
    
    if missing_vars:
        print(f"\n❌ Hiányzó email konfiguráció: {', '.join(missing_vars)}")
        print("\n📝 Állítsd be a config.py fájlban:")
        print("EMAIL_SENDER = 'your-email@gmail.com'")
        print("EMAIL_PASSWORD = 'your-app-password'")
        print("EMAIL_RECIPIENT = 'your-email@gmail.com'")
        return False
    else:
        print("✅ Minden email konfiguráció be van állítva!")
        return True

def main():
    """Fő teszt funkció"""
    print("📧 Farcaster Miniapp Email Értesítési Rendszer Teszt")
    print("=" * 60)
    
    # Konfiguráció ellenőrzése
    if not check_email_config():
        print("\n❌ Email konfiguráció hiányzik! Állítsd be a környezeti változókat.")
        return
    
    print("\n🚀 Email tesztek indítása...")
    
    # Tesztek futtatása
    tests = [
        ("Alapvető email", test_basic_email),
        ("Sikeres frissítés", test_success_notification),
        ("Hiba értesítés", test_error_notification),
        ("Napi összefoglaló", test_daily_summary)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n--- {test_name} ---")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} teszt hiba: {e}")
            results.append((test_name, False))
    
    # Eredmények összefoglalása
    print("\n" + "=" * 60)
    print("📊 TESZT EREDMÉNYEK:")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ SIKERES" if result else "❌ SIKERTELEN"
        print(f"{test_name:20} {status}")
        if result:
            passed += 1
    
    print(f"\n📈 Összesítés: {passed}/{total} teszt sikeres")
    
    if passed == total:
        print("🎉 Minden email teszt sikeres! Az értesítési rendszer működik.")
    else:
        print("⚠️  Néhány teszt sikertelen. Ellenőrizd a konfigurációt.")

if __name__ == "__main__":
    main() 