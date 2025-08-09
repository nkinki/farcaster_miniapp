#!/usr/bin/env python3
"""
Farcaster notification rendszer tesztelése
"""

import requests
import json
from datetime import datetime

def test_farcaster_cast_api():
    """Farcaster cast API tesztelése"""
    
    print("🔔 Testing Farcaster Cast API")
    print("=" * 50)
    
    base_url = "https://farc-nu.vercel.app"
    
    # Teszt cast küldése
    test_cast = {
        "text": "🧪 Test cast from AppRank notification system!\n\nThis is a test of our automated promotion alerts.\n\n#AppRank #Test #Farcaster",
        "embeds": ["https://farc-nu.vercel.app"],
        "channelId": "apprank"
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/farcaster/cast",
            json=test_cast,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Cast Success: {data.get('message', 'Cast sent')}")
            if data.get('cast'):
                print(f"📝 Cast Hash: {data['cast'].get('hash', 'N/A')}")
                print(f"🔗 Cast URL: https://warpcast.com/{data['cast'].get('author', {}).get('username', 'unknown')}/{data['cast'].get('hash', '')}")
        else:
            print(f"❌ Cast Failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Cast Error: {str(e)}")

def test_promotion_notification():
    """Promotion notification tesztelése"""
    
    print("\n🚀 Testing Promotion Notification")
    print("=" * 50)
    
    base_url = "https://farc-nu.vercel.app"
    
    # Mock promotion notification
    test_notification = {
        "promotionId": "test-123",
        "username": "testuser",
        "displayName": "Test User",
        "totalBudget": 10000,
        "rewardPerShare": 100,
        "castUrl": "https://warpcast.com/testuser/0x123456",
        "channelId": "apprank"
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/farcaster/notify-promotion",
            json=test_notification,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Notification Success: {data.get('message', 'Notification sent')}")
            if data.get('cast'):
                print(f"📝 Cast Hash: {data['cast'].get('hash', 'N/A')}")
                print(f"👤 Promotion by: @{data['promotion']['username']}")
                print(f"💰 Budget: {data['promotion']['totalBudget']} CHESS")
        else:
            print(f"❌ Notification Failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Notification Error: {str(e)}")

def main():
    """Main teszt function"""
    
    print("🔔 AppRank Farcaster Notification System Test")
    print("=" * 60)
    
    # API tesztek
    test_farcaster_cast_api()
    test_promotion_notification()
    
    print("\n" + "=" * 60)
    print("✅ Farcaster notification test completed!")
    print("\n📋 Next steps:")
    print("1. Set up NEYNAR_API_KEY in environment")
    print("2. Set up FARCASTER_SIGNER_UUID for bot account")
    print("3. Test with real promotion creation")

if __name__ == "__main__":
    main()