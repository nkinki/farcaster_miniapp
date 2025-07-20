# Farcaster API konfiguráció
# Frissítsd ezt a tokent, ha lejár!

# Bearer token a Farcaster API-hoz
# Hogyan szerezz be friss tokent:
# 1. Menj a https://farcaster.xyz/miniapps oldalra
# 2. Jelentkezz be
# 3. F12 → Network → Frissítsd az oldalt
# 4. Keresd meg a top-mini-apps kérést
# 5. Jobb klikk → Copy → Copy as cURL (bash)
# 6. Másold ki a "authorization: Bearer ..." részt

FARCASTER_BEARER_TOKEN = "MK-PXfYbf6AWlkzxxVsH+JB2tle893ShkAm8DvNk6KSQRVzRe4BAsdX4BOJ7nbllK0q81rE1NUYazujfWrFRVCDtw=="

# API endpoint
FARCASTER_API_URL = "https://client.farcaster.xyz/v1/top-mini-apps"

# Alapértelmezett limit (maximum 100)
DEFAULT_LIMIT = 100

# Email konfiguráció
# Állítsd be ezeket az értékeket a saját email címeddel és app jelszavaddal

# Gmail SMTP konfiguráció
EMAIL_SENDER = "nkinki2014@gmail.com"  # GitHub email cím
EMAIL_PASSWORD = "rnox qetx aytt geeo"   # Gmail app jelszó
EMAIL_RECIPIENT = "nkinki2014@gmail.com"  # GitHub email cím

# Email beállítások teszteléshez
def get_email_config():
    """Visszaadja az email konfigurációt"""
    return {
        "sender": EMAIL_SENDER,
        "password": EMAIL_PASSWORD,
        "recipient": EMAIL_RECIPIENT
    }

# Headers template
def get_api_headers():
    """Visszaadja az API fejléceket"""
    return {
        "authorization": f"Bearer {FARCASTER_BEARER_TOKEN}",
        "origin": "https://farcaster.xyz",
        "referer": "https://farcaster.xyz/",
        "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        "accept": "*/*",
        "content-type": "application/json; charset=utf-8"
    }