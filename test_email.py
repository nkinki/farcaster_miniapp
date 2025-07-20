#!/usr/bin/env python3
"""
Email notification test script
Tests the email configuration and sends a test email
"""

import os
from dotenv import load_dotenv
from email_notifications import send_email_notification, send_success_notification, send_error_notification
from config import get_email_config

load_dotenv()

def test_email_config():
    """Tests email configuration"""
    print("=== EMAIL CONFIGURATION TEST ===")
    print()
    
    # Check environment variables
    print("1. Environment Variables:")
    email_sender = os.getenv("EMAIL_SENDER")
    email_password = os.getenv("EMAIL_PASSWORD")
    email_recipient = os.getenv("EMAIL_RECIPIENT")
    
    print(f"   EMAIL_SENDER: {'✅ Set' if email_sender else '❌ Not set'}")
    print(f"   EMAIL_PASSWORD: {'✅ Set' if email_password else '❌ Not set'}")
    print(f"   EMAIL_RECIPIENT: {'✅ Set' if email_recipient else '❌ Not set'}")
    print()
    
    # Check config.py
    print("2. Config.py:")
    try:
        config = get_email_config()
        print(f"   Sender: {config['sender']}")
        print(f"   Password: {'✅ Set' if config['password'] else '❌ Not set'}")
        print(f"   Recipient: {config['recipient']}")
    except Exception as e:
        print(f"   ❌ Config error: {e}")
    print()
    
    # Test email sending
    print("3. Test Email Sending:")
    test_subject = "🧪 Email Test - Farcaster Miniapp"
    test_body = """
    <h2>✅ Email Test Sikeres!</h2>
    <p>Ez egy teszt email a Farcaster Miniapp rendszerből.</p>
    <p><strong>Időpont:</strong> {}</p>
    <p><strong>Státusz:</strong> ✅ Email rendszer működik</p>
    """.format(os.popen('date').read().strip())
    
    success = send_email_notification(test_subject, test_body)
    
    if success:
        print("   ✅ Test email sent successfully!")
    else:
        print("   ❌ Test email failed!")
    print()
    
    # Test success notification
    print("4. Test Success Notification:")
    try:
        send_success_notification(246, "<ul><li>Teszt frissítés sikeres</li></ul>")
        print("   ✅ Success notification sent!")
    except Exception as e:
        print(f"   ❌ Success notification failed: {e}")
    print()
    
    # Test error notification
    print("5. Test Error Notification:")
    try:
        send_error_notification("Teszt hiba", "Ez egy teszt hibaüzenet")
        print("   ✅ Error notification sent!")
    except Exception as e:
        print(f"   ❌ Error notification failed: {e}")
    print()
    
    print("=== TEST COMPLETED ===")

if __name__ == "__main__":
    test_email_config() 