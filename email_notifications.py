import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, date
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

def send_success_notification(miniapps_count, top_changes):
    """Sikeres frissítés értesítése"""
    
    subject = f"✅ Farcaster Miniapp Frissítés Sikeres - {date.today()}"
    
    body = f"""
    <h2>🎉 Sikeres Automatikus Frissítés!</h2>
    
    <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3>📊 Frissített Adatok:</h3>
        <ul>
            <li><strong>Miniappok száma:</strong> {miniapps_count}</li>
            <li><strong>Frissítés időpontja:</strong> {datetime.now().strftime('%H:%M:%S')}</li>
            <li><strong>Státusz:</strong> ✅ Sikeres</li>
        </ul>
    </div>
    
    <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3>📈 Legnagyobb Változások:</h3>
        {top_changes}
    </div>
    
    <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3>🔗 Linkek:</h3>
        <ul>
            <li><a href="https://farcaster-miniapp.vercel.app">🌐 Weboldal</a></li>
            <li><a href="https://github.com/nkinki/farcaster_miniapp">📁 GitHub</a></li>
        </ul>
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
    # Teszt email
    test_body = """
    <h2>🧪 Email Teszt</h2>
    <p>Ez egy teszt email az automatikus értesítési rendszerhez.</p>
    <p>Időpont: {}</p>
    """.format(datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    
    send_email_notification("🧪 Farcaster Miniapp Email Teszt", test_body) 