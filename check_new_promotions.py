#!/usr/bin/env python3
"""
Új promotion értesítések ellenőrzése és küldése
Használat: python check_new_promotions.py
"""

import requests
import os
import json
from datetime import datetime, timedelta
from email_notifications import send_email_notification

def check_new_promotions():
    """Új promotionök ellenőrzése és értesítés küldése"""
    
    # API URL
    base_url = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://farc-nu.vercel.app')
    api_url = f'{base_url}/api/promotions/notify'
    
    # Utolsó ellenőrzés időpontja (30 perc)
    since_time = (datetime.utcnow() - timedelta(minutes=30)).isoformat()
    
    try:
        print(f"🔍 Checking for new promotions since: {since_time}")
        
        # Új promotionök lekérése
        response = requests.get(f'{api_url}?since={since_time}')
        
        if response.status_code != 200:
            print(f"❌ API Error: {response.status_code} - {response.text}")
            return False
            
        data = response.json()
        new_promotions = data.get('promotions', [])
        
        if not new_promotions:
            print("ℹ️ No new promotions found")
            return True
            
        print(f"🚀 Found {len(new_promotions)} new promotion(s)!")
        
        # Email értesítés összeállítása
        email_subject = f"🚀 {len(new_promotions)} New AppRank Promotion(s) Created!"
        
        email_body = f"""
<h2>🚀 New AppRank Promotions Alert</h2>
<p><strong>{len(new_promotions)} new promotion(s)</strong> have been created in the last 30 minutes:</p>

"""
        
        total_budget = 0
        
        for i, promo in enumerate(new_promotions, 1):
            total_budget += float(promo.get('total_budget', 0))
            
            email_body += f"""
<div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px;">
    <h3>#{i} - @{promo['username']}</h3>
    <ul>
        <li><strong>Display Name:</strong> {promo.get('display_name', 'N/A')}</li>
        <li><strong>Total Budget:</strong> {promo['total_budget']} CHESS</li>
        <li><strong>Reward per Share:</strong> {promo['reward_per_share']} CHESS</li>
        <li><strong>Cast URL:</strong> <a href="{promo['cast_url']}">{promo['cast_url']}</a></li>
        <li><strong>Created:</strong> {promo['created_at']}</li>
        <li><strong>Status:</strong> {promo['status']}</li>
    </ul>
</div>
"""
        
        email_body += f"""
<hr>
<p><strong>📊 Summary:</strong></p>
<ul>
    <li>Total new promotions: {len(new_promotions)}</li>
    <li>Combined budget: {total_budget} CHESS</li>
    <li>Check time: {datetime.utcnow().isoformat()}</li>
</ul>

<p><a href="{base_url}/promote" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View All Promotions</a></p>
"""
        
        # Email küldése
        if send_email_notification(email_subject, email_body):
            print("✅ Email notification sent successfully")
        else:
            print("⚠️ Failed to send email notification")
            
        # Console log minden promotionról
        for promo in new_promotions:
            print(f"""
📢 NEW PROMOTION:
   👤 User: @{promo['username']} ({promo.get('display_name', 'N/A')})
   💰 Budget: {promo['total_budget']} CHESS
   🎁 Reward/Share: {promo['reward_per_share']} CHESS
   🔗 Cast: {promo['cast_url']}
   ⏰ Created: {promo['created_at']}
   ---""")
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking promotions: {str(e)}")
        return False

def main():
    """Main function"""
    print("🔔 AppRank New Promotion Checker")
    print("=" * 50)
    
    success = check_new_promotions()
    
    if success:
        print("✅ Promotion check completed successfully")
    else:
        print("❌ Promotion check failed")
        exit(1)

if __name__ == "__main__":
    main()