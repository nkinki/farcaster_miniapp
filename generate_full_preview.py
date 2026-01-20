import os
import sys
from datetime import date

# Add current directory to path so we can import email_notifications
sys.path.append(os.getcwd())

from email_notifications import send_success_notification

# Mock data for top gainers
top_gainers = [
    {"name": "Polling Center", "username": "poll", "rank": 1, "change": 12, "domain": "poll.xyz"},
    {"name": "Degen", "username": "degen", "rank": 5, "change": 8, "domain": "degen.tips"},
    {"name": "Lambo Lotto", "username": "lambo", "rank": 12, "change": 5, "domain": "farcaster.xyz/miniapps/LDihmHy56jDm/lambo-lotto"},
    {"name": "AppRank", "username": "apprank", "rank": 2, "change": 3, "domain": "farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank"}
]

# Mock data for top overall
top_overall = [
    {"name": "Polling Center", "username": "poll", "rank": 1, "domain": "poll.xyz"},
    {"name": "Warpcast", "username": "warpcast", "rank": 2, "domain": "warpcast.com"},
    {"name": "Supercast", "username": "supercast", "rank": 3, "domain": "supercast.xyz"},
    {"name": "Degen", "username": "degen", "rank": 4, "domain": "degen.tips"},
    {"name": "Lambo Lotto", "username": "lambo", "rank": 5, "domain": "farcaster.xyz/miniapps/LDihmHy56jDm/lambo-lotto"}
]

# Monkey patch send_email_notification to just save the HTML
import email_notifications
import psycopg2
from unittest.mock import MagicMock

def mock_send(subject, html_body):
    with open("full_email_preview.html", "w", encoding="utf-8") as f:
        f.write(f"<!-- Subject: {subject} -->\n")
        f.write(html_body)
    print(f"✅ Preview generated: full_email_preview.html")
    return True

email_notifications.send_email_notification = mock_send

# Mock database connection and cursor to return a winner
mock_conn = MagicMock()
mock_cursor = MagicMock()

# Configure cursor to return data for various queries
def mock_execute(query, params=None):
    pass

mock_cursor.execute = mock_execute
# Mock return for winner query sequence
mock_cursor.fetchone.side_effect = [
    ("APRANK123",), # 1. AppRank code
    ("LOTTO888",),  # 2. Lotto code
    (1, 155, 8630000), # 3. Active draw
    (42,),          # 4. Ticket count (MISSING BEFORE!)
    (1, 154, 8630000, 815252, "WinnerName") # 5. Winner row
]

mock_cursor.fetchall.side_effect = [
    [("apprank", 581), ("lambo-lotto", 44)], # 1. Subscribers
    [(202051, date.today())], # 2. AppRank usage
    [], # 3. Lotto usage
    [( "RisingApp", "author", 10)] # 4. Rising stars
]

email_notifications.psycopg2.connect = MagicMock(return_value=mock_conn)
mock_conn.cursor.return_value = mock_cursor

if __name__ == "__main__":
    print("Generating full email preview with winner...")
    try:
        send_success_notification(246, top_gainers, top_overall)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error generating preview: {e}")
