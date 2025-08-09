#!/usr/bin/env python3
"""
Promotion értesítő rendszer tesztelése
"""

import requests
import json
from datetime import datetime

def test_notification_api():
    """Teszt API endpoint ellenőrzése"""
    
    print("🧪 Testing Promotion Notification API")
    print("=" * 50)
    
    base_url = "http://localhost:3000"
    
    # 1. GET teszt
    print("\n1️⃣ Testing GET endpoint...")
    try:
        response = requests.get(f"{base_url}/api/test-promotion-notify")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ GET Success: {data['count']} promotions found")
            print(f"📊 Response: {json.dumps(data, indent=2)}")
        else:
            print(f"❌ GET Failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ GET Error: {str(e)}")
    
    # 2. POST teszt
    print("\n2️⃣ Testing POST endpoint...")
    try:
        test_data = {
            "promotionId": "test-notification-123",
            "notificationType": "new_promotion"
        }
        
        response = requests.post(
            f"{base_url}/api/test-promotion-notify",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ POST Success: {data['message']}")
            print(f"📊 Response: {json.dumps(data, indent=2)}")
        else:
            print(f"❌ POST Failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ POST Error: {str(e)}")

def test_real_notification_check():
    """Valós notification check tesztelése"""
    
    print("\n3️⃣ Testing real notification check...")
    
    base_url = "http://localhost:3000"
    api_url = f"{base_url}/api/promotions/notify"
    
    try:
        # Utolsó 24 óra promotionjai
        response = requests.get(api_url)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Real API Success: {data.get('count', 0)} promotions")
            
            if data.get('promotions'):
                print("📋 Found promotions:")
                for promo in data['promotions']:
                    print(f"   - @{promo.get('username', 'N/A')}: {promo.get('total_budget', 0)} CHESS")
            else:
                print("ℹ️ No promotions found in last 24 hours")
                
        else:
            print(f"❌ Real API Failed: {response.status_code}")
            print(f"📄 Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Real API Error: {str(e)}")

def main():
    """Main teszt function"""
    
    print("🔔 AppRank Promotion Notification System Test")
    print("=" * 60)
    
    # API tesztek
    test_notification_api()
    
    # Valós API teszt
    test_real_notification_check()
    
    print("\n" + "=" * 60)
    print("✅ Test completed!")

if __name__ == "__main__":
    main()