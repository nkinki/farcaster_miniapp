import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, date
import psycopg2
from dotenv import load_dotenv
from config import get_email_config

load_dotenv()

def send_email_notification(subject, body, recipient_email=None):
    """Email értesítés küldése"""
    
    # Email konfiguráció - először .env-ből, majd config.py-ból
    sender_email = os.getenv("EMAIL_SENDER")
    sender_password = os.getenv("EMAIL_PASSWORD")
    
    # Ha nincs .env, használjuk a config.py-t
    if not sender_email or not sender_password:
        try:
            email_config = get_email_config()
            sender_email = email_config["sender"]
            sender_password = email_config["password"]
        except Exception as e:
            print(f"❌ Email config error: {e}")
            return False
    
    if not recipient_email:
        recipient_email = os.getenv("EMAIL_RECIPIENT")
        if not recipient_email:
            try:
                email_config = get_email_config()
                recipient_email = email_config.get("recipient", sender_email)
            except:
                recipient_email = sender_email
    
    if not sender_email or not sender_password:
        print("❌ Email konfiguráció hiányzik")
        return False
    
    try:
        # Email létrehozása
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = recipient_email
        msg['Subject'] = subject
        
        # HTML body
        html_body = f"""
        <html>
        <body>
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
                    <h1>🏆 Farcaster Miniapp Frissítés</h1>
                    <p>{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                </div>
                
                <div style="padding: 20px; background: #f9f9f9;">
                    {body}
                </div>
                
                <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
                    <p>🤖 Automatikus értesítés - Farcaster Miniapp Rendszer</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(html_body, 'html'))
        
        # Email küldése
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender_email, sender_password)
        
        text = msg.as_string()
        server.sendmail(sender_email, recipient_email, text)
        server.quit()
        
        print(f"✅ Email elküldve: {recipient_email}")
        return True
        
    except Exception as e:
        print(f"❌ Email küldési hiba: {e}")
        return False

def send_success_notification(miniapps_count, top_gainers, top_overall):
    """Sikeres frissítés értesítése továbbfejlesztett sablonnal"""
    
    subject = f"✅ AppRank Frissítés: {miniapps_count} miniapp naprakész! - {date.today()}"
    
    # Adatbázis kapcsolat a kódok lekéréséhez
    apprank_code = "N/A"
    lotto_code = "N/A"
    
    db_url = os.getenv("DATABASE_URL") or os.getenv("NEON_DB_URL")
    
    if not db_url:
        print("❌ DATABASE_URL/NEON_DB_URL hiányzik az environmentből!")
        sub_stats_html = "<p style='color:red;'>Hiba: Adatbázis URL hiányzik</p>"
        apprank_usages_html = lotto_usages_html = "<ul><li>N/A</li></ul>"
        lotto_info_html = "N/A"
    else:
        try:
            # SSL kényszerítése Neon esetén
            if "neon.tech" in db_url and "sslmode=" not in db_url:
                db_url += ("&" if "?" in db_url else "?") + "sslmode=require"
                
            conn = psycopg2.connect(db_url)
            cursor = conn.cursor()
        
            # AppRank kód lekérése
            cursor.execute("SELECT code FROM daily_codes WHERE is_active = TRUE LIMIT 1")
            row = cursor.fetchone()
            if row: apprank_code = row[0]
            
            # Lambo Lotto kód lekérése
            cursor.execute("SELECT code FROM lotto_daily_codes WHERE is_active = TRUE LIMIT 1")
            row = cursor.fetchone()
            if row: lotto_code = row[0]

            # RÉSZLETES STATISZTIKÁK LEKÉRÉSE
            
            # 1. Feliratkozók száma
            cursor.execute("SELECT app_id, COUNT(*) FROM notification_tokens GROUP BY app_id")
            sub_stats = cursor.fetchall()
            sub_stats_html = "<ul>"
            for app, count in sub_stats:
                sub_stats_html += f"<li><strong>{app}:</strong> {count} feliratkozó</li>"
            sub_stats_html += "</ul>"

            # 2. AppRank kód használat (Mai)
            cursor.execute("SELECT fid, used_at FROM daily_code_usages WHERE code = %s ORDER BY used_at DESC", (apprank_code,))
            apprank_usages = cursor.fetchall()
            apprank_usages_html = "<ul>"
            for fid, used_at in apprank_usages:
                apprank_usages_html += f"<li>FID: {fid} - {used_at.strftime('%H:%M')}</li>"
            if not apprank_usages: apprank_usages_html += "<li>Még nincs használat</li>"
            apprank_usages_html += "</ul>"

            # 3. Lambo Lotto kód használat (Mai)
            cursor.execute("SELECT fid, used_at FROM lotto_daily_code_usages WHERE code = %s ORDER BY used_at DESC", (lotto_code,))
            lotto_usages = cursor.fetchall()
            lotto_usages_html = "<ul>"
            for fid, used_at in lotto_usages:
                lotto_usages_html += f"<li>FID: {fid} - {used_at.strftime('%H:%M')}</li>"
            if not lotto_usages: lotto_usages_html += "<li>Még nincs használat</li>"
            lotto_usages_html += "</ul>"

            # 4. Aktuális Lotto Kör
            cursor.execute("SELECT id, draw_number FROM lottery_draws WHERE status = 'active' ORDER BY draw_number DESC LIMIT 1")
            active_draw = cursor.fetchone()
            lotto_info_html = "Nincs aktív kör"
            if active_draw:
                draw_id = active_draw[0]
                cursor.execute("SELECT COUNT(*) FROM lottery_tickets WHERE draw_id = %s", (draw_id,))
                ticket_count = cursor.fetchone()[0]
                lotto_info_html = f"Aktív kör (#{active_draw[1]}): <strong>{ticket_count} eladott jegy</strong>"

            conn.close()
        except Exception as e:
            print(f"❌ Hiba a statisztikák lekérésekor: {e}")
            sub_stats_html = f"<p style='color:red;'>Hiba: {e}</p>"
            apprank_usages_html = lotto_usages_html = "<ul><li>N/A</li></ul>"
            lotto_info_html = "N/A"
    
    # 1. HTML változások listája (Mostantól kattintható nevekkel)
    gainers_html = "<ul>"
    for m in top_gainers:
        domain = m.get('domain', '')
        if m['name'] == "Lambo Lotto":
            domain = "farcaster.xyz/miniapps/LDihmHy56jDm/lambo-lotto"
        
        url = f"https://{domain}" if "farcaster.xyz" not in domain else f"https://{domain}"
        gainers_html += f"<li><a href='{url}' style='color: #764ba2; text-decoration: none; font-weight: bold;'>{m['name']}</a>: #{m['rank']} <span style='color:green;'>(+{m['change']} hely)</span></li>"
    gainers_html += "</ul>"

    top_html = "<ol>"
    for m in top_overall:
        domain = m.get('domain', '')
        if m['name'] == "Lambo Lotto":
            domain = "farcaster.xyz/miniapps/LDihmHy56jDm/lambo-lotto"
            
        url = f"https://{domain}" if "farcaster.xyz" not in domain else f"https://{domain}"
        top_html += f"<li><a href='{url}' style='color: #764ba2; text-decoration: none; font-weight: bold;'>{m['name']}</a></li>"
    top_html += "</ol>"

    # 2. Alternating Promotion Logic (Lambo Lotto vs FarChess)
    # Even day: Lambo Lotto, Odd day: FarChess
    is_even_day = date.today().day % 2 == 0
    promo_name = "Lambo Lotto" if is_even_day else "FarChess"
    promo_link = "farcaster.xyz/miniapps/LDihmHy56jDm/lambo-lotto" if is_even_day else "farcaster.xyz/miniapps/DXCz8KIyfsme/farchess"

    # Promo szövegek megosztáshoz (Farcaster barát)
    apprank_promo = f"🚀 AppRank: 10,000 $CHESS Promo Code! 💎\nCode: {apprank_code}\nBoost your app now! 📈\nOpen: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank\n#AppRank #Farcaster"
    lotto_promo = f"🎰 Lambo Lotto: 1 Free Ticket! 🎟️\nToday's Code: {lotto_code}\nFirst 3 users only! 🏎️\nPlay: https://farcaster.xyz/miniapps/LDihmHy56jDm/lambo-lotto\n#LamboLotto #Base"

    # 3. Cast Preview (Tisztább, @mention alapú formátum)
    cast_text = f"🏆 Farcaster Miniapp Ranking Update!\n\n"
    cast_text += f"Top 5 Gainers today on @apprank:\n"
    for i, m in enumerate(top_gainers, 1):
        mention = f"@{m['username']}" if m.get('username') else m['name']
        
        # Speciális említés Lambo Lotto esetén
        if m['name'] == "Lambo Lotto":
            mention = "@ifun"
            
        cast_text += f"{i}. {m['name']} ({mention}) +{m['change']} 📈\n"
    
    cast_text += f"\nFeatured App: {promo_name} 🚀\n"
    cast_text += f"🔗 https://{promo_link}\n\n"
    
    cast_text += f"Full leaderboard (240+ apps):\n"
    cast_text += f"🔗 https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank\n\n"
    cast_text += f"Build on Base. @base.base.eth 🟦\n"
    cast_text += f"#Farcaster #Miniapps #AppRank #Build #Base"

    body = f"""
    <h2 style="color: #764ba2;">🎉 Sikeres Frissítés!</h2>
    
    <div style="background: #f0ecf9; padding: 15px; border-left: 5px solid #764ba2; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top:0;">📱 Cast Preview (Másold és posztold!)</h3>
        <pre style="background: #ffffff; padding: 15px; border: 1px dashed #764ba2; border-radius: 5px; white-space: pre-wrap; font-family: monospace; font-size: 13px;">{cast_text}</pre>
        <p style="font-size: 12px; color: #666;">💡 Tipp: A @ifun és @base.base.eth említések segítenek a láthatóság növelésében!</p>
    </div>

    <div style="background: #fff8e1; padding: 15px; border: 2px solid #ffc107; border-radius: 5px; margin: 15px 0; text-align: center;">
        <h3 style="margin-top:0; color: #ffa000;">🎁 Mai Napi Kódok:</h3>
        <div style="display: flex; justify-content: space-around; gap: 10px;">
            <div style="background: white; padding: 10px; border-radius: 5px; border: 1px solid #ffc107; flex: 1;">
                <p style="margin: 0; font-size: 12px; color: #666;">AppRank (10k Promo Code):</p>
                <p style="margin: 5px 0; font-size: 18px; font-weight: bold; font-family: monospace; color: #333;">{apprank_code}</p>
                <pre style="background: #f9f9f9; padding: 5px; border: 1px solid #ddd; font-size: 10px; white-space: pre-wrap; margin-top: 10px; text-align: left;">{apprank_promo}</pre>
            </div>
            <div style="background: white; padding: 10px; border-radius: 5px; border: 1px solid #ffc107; flex: 1;">
                <p style="margin: 0; font-size: 12px; color: #666;">Lambo Lotto (1 Free ticket - First 3 users):</p>
                <p style="margin: 5px 0; font-size: 18px; font-weight: bold; font-family: monospace; color: #333;">{lotto_code}</p>
                <pre style="background: #f9f9f9; padding: 5px; border: 1px solid #ddd; font-size: 10px; white-space: pre-wrap; margin-top: 10px; text-align: left;">{lotto_promo}</pre>
            </div>
        </div>
        <p style="font-size: 11px; color: #999; margin-top: 10px;">Másold ki a fenti szövegeket és oszd meg őket a közösséggel! 😉</p>
    </div>

    <div style="background: #e3f2fd; padding: 15px; border: 1px solid #2196f3; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top:0; color: #1976d2;">📊 Részletes Statisztikák (Valós idejű):</h3>
        
        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px;">
                <h4 style="margin: 10px 0 5px 0; font-size: 14px;">🔔 Feliratkozások:</h4>
                {sub_stats_html}
            </div>
            <div style="flex: 1; min-width: 200px;">
                <h4 style="margin: 10px 0 5px 0; font-size: 14px;">🏎️ Lambo Lotto Használat ({lotto_code}):</h4>
                {lotto_usages_html}
                <p style="font-size: 12px; margin-top: 5px;">{lotto_info_html}</p>
            </div>
            <div style="flex: 1; min-width: 200px;">
                <h4 style="margin: 10px 0 5px 0; font-size: 14px;">📈 AppRank Használat ({apprank_code}):</h4>
                {apprank_usages_html}
            </div>
        </div>
    </div>

    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 250px; background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 10px 0;">
            <h3 style="margin-top:0;">📈 Legnagyobb Emelkedők:</h3>
            <p style="font-size: 12px; color: #666;">(Kattints a nevekre az megnyitáshoz)</p>
            {gainers_html}
        </div>
        
        <div style="flex: 1; min-width: 250px; background: #fff3cd; padding: 15px; border-radius: 5px; margin: 10px 0;">
            <h3 style="margin-top:0;">🏆 Aktuális Top 5:</h3>
            {top_html}
        </div>
    </div>

    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: center;">
        <p><strong>Összes frissített miniapp:</strong> {miniapps_count}</p>
        <p style="margin-bottom: 5px;">🔥 Mai ajánlat: <strong>{promo_name}</strong></p>
        <a href="https://{promo_link}" style="display: inline-block; background: #333; color: white; padding: 10px 20px; text-decoration: none; border-radius: 20px; font-size: 14px; margin-bottom: 20px;">🎮 Megnyitás: {promo_name}</a>
        <br>
        <a href="https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: bold;">🌐 Irány az AppRank</a>
    </div>
    """
    
    return send_email_notification(subject, body)

def send_error_notification(error_message, error_details):
    """Hiba értesítése"""
    
    subject = f"❌ Farcaster Miniapp Frissítés Hiba - {date.today()}"
    
    body = f"""
    <h2>🚨 Automatikus Frissítés Hiba!</h2>
    
    <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3>❌ Hiba Részletek:</h3>
        <p><strong>Hiba:</strong> {error_message}</p>
        <p><strong>Időpont:</strong> {datetime.now().strftime('%H:%M:%S')}</p>
        <pre style="background: #f1f1f1; padding: 10px; border-radius: 3px; overflow-x: auto;">{error_details}</pre>
    </div>
    
    <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3>🔧 Javaslatok:</h3>
        <ul>
            <li>Ellenőrizd a GitHub Actions logokat</li>
            <li>Nézd meg az adatbázis kapcsolatot</li>
            <li>Ellenőrizd a Bearer token érvényességét</li>
        </ul>
    </div>
    """
    
    return send_email_notification(subject, body)

def send_daily_summary(miniapps_data):
    """Napi összefoglaló"""
    
    subject = f"📊 Farcaster Miniapp Napi Összefoglaló - {date.today()}"
    
    # Top 10 miniapp
    top_10_html = ""
    for i, item in enumerate(miniapps_data[:10], 1):
        miniapp = item['miniApp']
        rank_change = item.get('rank72hChange', 0)
        change_str = f"({rank_change:+d})" if rank_change != 0 else ""
        
        top_10_html += f"""
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">#{i}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">{miniapp['name']}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">{miniapp['domain']}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; color: {'green' if rank_change > 0 else 'red' if rank_change < 0 else 'gray'};">
                {change_str}
            </td>
        </tr>
        """
    
    body = f"""
    <h2>📊 Napi Miniapp Összefoglaló</h2>
    
    <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3>📈 Áttekintés:</h3>
        <ul>
            <li><strong>Összes miniapp:</strong> {len(miniapps_data)}</li>
            <li><strong>Frissítés időpontja:</strong> {datetime.now().strftime('%H:%M:%S')}</li>
            <li><strong>Dátum:</strong> {date.today()}</li>
        </ul>
    </div>
    
    <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3>🏆 Top 10 Miniapp:</h3>
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f8f9fa;">
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Rangsor</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Név</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Domain</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">72h Változás</th>
                </tr>
            </thead>
            <tbody>
                {top_10_html}
            </tbody>
        </table>
    </div>
    """
    
    return send_email_notification(subject, body)

if __name__ == "__main__":
    # Teszt adatok
    test_gainers = [
        {"name": "Polling Center", "username": "poll", "rank": 1, "change": 12, "domain": "poll.xyz"},
        {"name": "Degen", "username": "degen", "rank": 5, "change": 8, "domain": "degen.tips"},
        {"name": "Lambo Lotto", "username": "lambo", "rank": 12, "change": 5, "domain": "farcaster.xyz/miniapps/LDihmHy56jDm/lambo-lotto"}
    ]
    test_top = [
        {"name": "Polling Center", "username": "poll", "rank": 1, "domain": "poll.xyz"},
        {"name": "Warpcast", "username": "warpcast", "rank": 2, "domain": "warpcast.com"},
        {"name": "Supercast", "username": "supercast", "rank": 3, "domain": "supercast.xyz"},
        {"name": "Degen", "username": "degen", "rank": 4, "domain": "degen.tips"},
        {"name": "Lambo Lotto", "username": "lambo", "rank": 5, "domain": "farcaster.xyz/miniapps/LDihmHy56jDm/lambo-lotto"}
    ]
    
    print("Testing send_success_notification with Farcaster App Links...")
    send_success_notification(246, test_gainers, test_top)
