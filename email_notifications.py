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
    """Send email notification"""
    
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
        print("❌ Email configuration missing")
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
                    <h1>🏆 Farcaster Miniapp Update</h1>
                    <p>{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                </div>
                
                <div style="padding: 20px; background: #f9f9f9;">
                    {body}
                </div>
                
                <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
                    <p>🤖 Automated Notification - Farcaster Miniapp System</p>
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
        
        print(f"✅ Email sent: {recipient_email}")
        return True
        
    except Exception as e:
        print(f"❌ Email sending error: {e}")
        return False

def get_vice_city_lambo_promo(jackpot_formatted, next_jackpot_formatted):
    """Returns a CSS-based GTA Vice City styled HTML promotional block (No external images)"""
    
    vice_pink = "#ff00ff"
    vice_cyan = "#00f2ff"
    vice_navy = "#050810"
    
    return f"""
    <div style="background: {vice_navy}; border-radius: 12px; overflow: hidden; margin: 20px 0; border: 2px solid {vice_cyan}; box-shadow: 0 0 20px rgba(0, 242, 255, 0.3); font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; position: relative;">
        
        <!-- CSS Grid Background Effect -->
        <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 150px; background-image: linear-gradient({vice_cyan}22 1px, transparent 1px), linear-gradient(90deg, {vice_cyan}22 1px, transparent 1px); background-size: 30px 30px; transform: perspective(100px) rotateX(45deg); transform-origin: top; opacity: 0.4; z-index: 0;"></div>
        
        <div style="position: relative; z-index: 1; padding: 40px 20px; text-align: center;">
            <div style="margin-bottom: 25px;">
                <h2 style="margin: 0; color: {vice_pink}; text-transform: uppercase; font-style: italic; font-size: 42px; font-weight: 900; text-shadow: 0 0 10px {vice_pink}, 0 0 20px {vice_pink}; letter-spacing: 2px;">BUY A LAMBO</h2>
                <div style="height: 3px; width: 120px; background: {vice_cyan}; margin: 10px auto; box-shadow: 0 0 10px {vice_cyan};"></div>
            </div>
            
            <div style="margin: 30px 0;">
                <p style="margin: 0; font-size: 14px; color: {vice_cyan}; letter-spacing: 4px; text-transform: uppercase; font-weight: 800; text-shadow: 0 0 5px {vice_cyan};">Current Jackpot</p>
                <h1 style="margin: 10px 0; font-size: 58px; color: white; text-shadow: 0 0 20px {vice_cyan}, 0 0 40px {vice_cyan}; letter-spacing: -1px; font-weight: 900;">{jackpot_formatted} $CHESS</h1>
            </div>
            
            <div style="background: rgba(112, 0, 255, 0.2); backdrop-filter: blur(8px); border: 1px solid {vice_pink}; border-radius: 12px; padding: 20px; display: inline-block; min-width: 300px; box-shadow: 0 0 20px rgba(255, 0, 255, 0.2);">
                <p style="margin: 0; font-size: 13px; color: {vice_pink}; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Tonight's Estimated Prize</p>
                <div style="font-size: 32px; color: {vice_cyan}; font-weight: 900; margin-top: 8px; text-shadow: 0 0 10px {vice_cyan};">🔥 {next_jackpot_formatted} $CHESS 🔥</div>
            </div>
            
            <div style="margin-top: 40px;">
                <a href="https://farcaster.xyz/miniapps/LDihmHy56jDm/lambo-lotto" 
                   style="display: inline-block; background: {vice_cyan}; color: {vice_navy}; padding: 18px 50px; text-decoration: none; border-radius: 4px; font-weight: 900; font-size: 22px; text-transform: uppercase; box-shadow: 0 0 15px {vice_cyan}; transform: skew(-10deg); transition: all 0.2s ease;">
                   PLAY NOW
                </a>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: white; letter-spacing: 5px; font-weight: 900; text-transform: uppercase; opacity: 0.8;">✨ PLAY EVERY DAY ✨</p>
            
            <div style="margin-top: 20px; font-size: 11px; opacity: 0.6;">
                <a href="https://farcaster.xyz/miniapps/LDihmHy56jDm/lambo-lotto" style="color: {vice_cyan}; text-decoration: none; font-family: monospace;">https://farcaster.xyz/miniapps/LDihmHy56jDm/lambo-lotto</a>
            </div>
        </div>
    </div>
    """

def get_lambo_winner_block(fid, name, prize_formatted, round_number):
    """Returns a high-impact winner announcement block with retro neon style and CLAIM button"""
    
    display_name = name if name and name != "None" else f"FID {fid}"
    vice_pink = "#ff00ff"
    vice_cyan = "#00f2ff"
    vice_navy = "#050810"
    vice_gold = "#ffd700"
    claim_link = "https://farcaster.xyz/miniapps/LDihmHy56jDm/lambo-lotto"
    
    return f"""
    <div style="background: {vice_navy}; border-radius: 12px; overflow: hidden; margin: 20px 0; border: 4px solid {vice_gold}; box-shadow: 0 0 30px rgba(255, 215, 0, 0.4); font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; position: relative;">
        
        <!-- CSS Grid Background Effect (Gold version) -->
        <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 150px; background-image: linear-gradient({vice_gold}22 1px, transparent 1px), linear-gradient(90deg, {vice_gold}22 1px, transparent 1px); background-size: 30px 30px; transform: perspective(100px) rotateX(45deg); transform-origin: top; opacity: 0.3; z-index: 0;"></div>
        
        <div style="position: relative; z-index: 1; padding: 40px 20px; text-align: center; color: white;">
            <div style="background: {vice_gold}; color: {vice_navy}; display: inline-block; padding: 6px 25px; border-radius: 4px; font-weight: 900; font-size: 14px; text-transform: uppercase; margin-bottom: 20px; box-shadow: 0 0 20px {vice_gold}; transform: skew(-10deg);">
                🏆 WE HAVE A WINNER! 🏆
            </div>
            
            <h2 style="margin: 0; font-size: 42px; text-transform: uppercase; font-weight: 900; text-shadow: 0 0 10px {vice_pink}, 0 0 20px {vice_pink}; color: white; italic; letter-spacing: 2px;">ROUND #{round_number}</h2>
            
            <div style="margin: 25px 0; background: rgba(112, 0, 255, 0.1); border: 1px dashed {vice_cyan}; padding: 20px; border-radius: 8px; display: inline-block; min-width: 280px;">
                <p style="margin: 0; font-size: 14px; color: {vice_cyan}; text-transform: uppercase; font-weight: 800; letter-spacing: 2px;">Congratulations to</p>
                <h3 style="margin: 10px 0; font-size: 32px; color: white; text-shadow: 0 0 10px {vice_cyan};">⭐ {display_name} ⭐</h3>
                <p style="margin: 0; font-size: 12px; font-family: monospace; opacity: 0.6; color: {vice_cyan};">(FID: {fid})</p>
            </div>
            
            <div style="margin: 30px 0;">
                <p style="margin: 0; font-size: 16px; font-weight: 900; color: {vice_gold}; letter-spacing: 4px; text-transform: uppercase;">PRIZE WON:</p>
                <h1 style="margin: 10px 0; font-size: 64px; color: white; text-shadow: 0 0 20px {vice_gold}, 0 0 40px {vice_gold}; font-weight: 900;">{prize_formatted} $CHESS</h1>
            </div>

            <div style="margin: 40px 0;">
                <a href="{claim_link}" 
                   style="display: inline-block; background: {vice_gold}; color: {vice_navy}; padding: 18px 45px; text-decoration: none; border-radius: 4px; font-weight: 900; font-size: 20px; text-transform: uppercase; box-shadow: 0 0 20px {vice_gold}; transform: skew(-5deg); transition: all 0.2s ease;">
                   🚀 CLAIM YOUR PRIZE NOW
                </a>
            </div>
            
            <div style="margin-top: 30px;">
                <p style="font-size: 18px; font-weight: 900; font-style: italic; color: {vice_pink}; text-shadow: 0 0 10px {vice_pink}; text-transform: uppercase;">THE LAMBO DREAM IS REAL! 🏎️💨</p>
            </div>
        </div>
        
        <!-- Decorative signs -->
        <div style="position: absolute; top: 15px; right: 15px; font-size: 24px; opacity: 0.8;">🤑</div>
        <div style="position: absolute; bottom: 15px; left: 15px; font-size: 24px; opacity: 0.8;">🔥</div>
    </div>
    """


def send_success_notification(miniapps_count, top_gainers, top_overall):
    """Successful update notification with enhanced template"""
    
    subject = f"✅ AppRank Update: {miniapps_count} miniapps updated! - {date.today()}"
    
    # Format jackpot helper
    def format_jackpot(amount):
        try:
            val = int(amount)
            if val >= 1000000:
                return f"{(val / 1000000):.1f}M"
            if val >= 1000:
                return f"{int(val / 1000)}K"
            return str(val)
        except:
            return "1.0M"

    # Default values to prevent NameError
    apprank_code = "N/A"
    lotto_code = "N/A"
    jackpot_amount = 1000000 # Default to 1M if DB fails
    jackpot_formatted = "1.0M"
    winner_block_html = ""
    sub_stats_html = "<ul><li>No data available</li></ul>"
    apprank_usages_html = "<ul><li>No data available</li></ul>"
    lotto_usages_html = "<ul><li>No data available</li></ul>"
    lotto_info_html = "No active round info"
    
    db_url = os.getenv("DATABASE_URL") or os.getenv("NEON_DB_URL")
    
    if not db_url:
        print("❌ DATABASE_URL/NEON_DB_URL missing from environment!")
        sub_stats_html = "<p style='color:red;'>Error: Database URL missing</p>"
    else:
        try:
            # Force SSL for Neon
            if "neon.tech" in db_url and "sslmode=" not in db_url:
                db_url += ("&" if "?" in db_url else "?") + "sslmode=require"
                
            conn = psycopg2.connect(db_url)
            cursor = conn.cursor()
        
            # Get AppRank code
            cursor.execute("SELECT code FROM daily_codes WHERE is_active = TRUE LIMIT 1")
            row = cursor.fetchone()
            if row: apprank_code = row[0]
            
            # Get Lambo Lotto code
            cursor.execute("SELECT code FROM lotto_daily_codes WHERE is_active = TRUE LIMIT 1")
            row = cursor.fetchone()
            if row: lotto_code = row[0]

            # GET DETAILED STATISTICS
            
            # 1. Number of subscribers
            cursor.execute("SELECT app_id, COUNT(*) FROM notification_tokens GROUP BY app_id")
            sub_stats = cursor.fetchall()
            sub_stats_html = "<ul>"
            for app, count in sub_stats:
                sub_stats_html += f"<li><strong>{app}:</strong> {count} subscribers</li>"
            sub_stats_html += "</ul>"

            # 2. AppRank code usage (Today)
            cursor.execute("SELECT fid, used_at FROM daily_code_usages WHERE code = %s ORDER BY used_at DESC", (apprank_code,))
            apprank_usages = cursor.fetchall()
            apprank_usages_html = "<ul>"
            for fid, used_at in apprank_usages:
                apprank_usages_html += f"<li>FID: {fid} - {used_at.strftime('%H:%M')}</li>"
            if not apprank_usages: apprank_usages_html += "<li>No usage yet</li>"
            apprank_usages_html += "</ul>"

            # 3. Lambo Lotto code usage (Today)
            cursor.execute("SELECT fid, used_at FROM lotto_daily_code_usages WHERE code = %s ORDER BY used_at DESC", (lotto_code,))
            lotto_usages = cursor.fetchall()
            lotto_usages_html = "<ul>"
            for fid, used_at in lotto_usages:
                lotto_usages_html += f"<li>FID: {fid} - {used_at.strftime('%H:%M')}</li>"
            if not lotto_usages: lotto_usages_html += "<li>No usage yet</li>"
            lotto_usages_html += "</ul>"

            # 4. Current Lotto Round & Jackpot
            cursor.execute("SELECT id, draw_number, jackpot FROM lottery_draws WHERE status = 'active' ORDER BY draw_number DESC LIMIT 1")
            active_draw = cursor.fetchone()
            lotto_info_html = "No active round"
            jackpot_amount = 0
            if active_draw:
                draw_id = active_draw[0]
                jackpot_amount = int(active_draw[2])
                cursor.execute("SELECT COUNT(*) FROM lottery_tickets WHERE draw_id = %s", (draw_id,))
                ticket_count = cursor.fetchone()[0]
                lotto_info_html = f"Active Round (#{active_draw[1]}): <strong>{ticket_count} tickets sold</strong>"
            
            # Format jackpot
            jackpot_formatted = format_jackpot(jackpot_amount)

            # 5. Rising Stars (apps with positive change, not in top 10)
            cursor.execute("""
                SELECT m.name, m.author_username, s.rank_24h_change 
                FROM miniapp_statistics s
                JOIN miniapps m ON s.miniapp_id = m.id
                WHERE s.stat_date = %s 
                AND s.rank_24h_change > 0
                AND s.current_rank > 10
                ORDER BY s.rank_24h_change DESC
                LIMIT 20
            """, (date.today(),))
            rising_stars_all = cursor.fetchall()
            
            # Randomize and pick 5-8
            import random
            num_stars = random.randint(min(5, len(rising_stars_all)), min(8, len(rising_stars_all))) if rising_stars_all else 0
            rising_stars = random.sample(rising_stars_all, num_stars) if num_stars > 0 else []

            # 6. Fetch Latest Winners for Winner Block
            cursor.execute("""
                SELECT ld.id, ld.draw_number, ld.jackpot, lt.player_fid, lt.player_name
                FROM lottery_draws ld
                JOIN lottery_tickets lt ON ld.id = lt.draw_id AND ld.winning_number = lt.number
                WHERE ld.status = 'completed'
                ORDER BY ld.draw_number DESC
                LIMIT 1
            """)
            winner_row = cursor.fetchone()
            winner_block_html = ""
            if winner_row:
                draw_id, win_draw_num, win_jackpot, win_fid, win_name = winner_row
                winner_block_html = get_lambo_winner_block(win_fid, win_name, format_jackpot(int(win_jackpot)), win_draw_num)

            conn.close()
        except Exception as e:
            print(f"❌ Error fetching statistics: {e}")
            # Keep existing default values on error
    
    
    # 1. HTML list of changes (Clickable names)
    gainers_html = "<ul>"
    if not top_gainers:
        gainers_html += "<li>No Data</li>"
    else:
        for m in top_gainers:
            domain = m.get('domain', '')
            if m['name'] == "Lambo Lotto":
                domain = "farcaster.xyz/miniapps/LDihmHy56jDm/lambo-lotto"
            
            url = f"https://{domain}" if "farcaster.xyz" not in domain else f"https://{domain}"
            gainers_html += f"<li><a href='{url}' style='color: #764ba2; text-decoration: none; font-weight: bold;'>{m['name']}</a>: #{m['rank']} <span style='color:green;'>(+{m['change']} pos)</span></li>"
    gainers_html += "</ul>"

    top_html = "<ol>"
    if not top_overall:
        top_html += "<li>No Data</li>"
    else:
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

    # Promo texts for sharing (Farcaster friendly)
    apprank_promo = f"🚀 AppRank: 10,000 $CHESS Promo Code! 💎\nCode: {apprank_code}\nBoost your app now! 📈\nOpen: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank\n#AppRank #Farcaster"
    lotto_promo = f"🎰 Lambo Lotto: 1 Free Ticket! 🎟️\nToday's Code: {lotto_code}\nFirst 3 users only! 🏎️\nPlay: https://farcaster.xyz/miniapps/LDihmHy56jDm/lambo-lotto\n#LamboLotto #Base"

    # 3. Cast Preview (Cleaner, @mention based format)
    cast_text = f"🏆 Farcaster Miniapp Ranking Update!\n\n"
    cast_text += f"Top 10 Gainers today on @apprank:\n"
    for i, m in enumerate(top_gainers, 1):
        mention = f"@{m['username']}" if m.get('username') else m['name']
        
        # Special mention for Lambo Lotto
        if m['name'] == "Lambo Lotto":
            mention = "@ifun"
            
        # Removed parentheses around mention as requested
        cast_text += f"{i}. {m['name']} {mention} +{m['change']} 📈\n"
    
    cast_text += f"\nFeatured App: {promo_name} 🚀\n"
    cast_text += f"🔗 https://{promo_link}\n\n"
    
    cast_text += f"Full leaderboard (240+ apps):\n"
    cast_text += f"🔗 https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank\n\n"
    cast_text += f"Build on Base. @base.base.eth 🟦\n"
    cast_text += f"#Farcaster #Miniapps #AppRank #Build #Base"

    # 4. Rising Stars HTML
    import random
    rising_stars_html = "<ul>"
    if 'rising_stars' in locals() and rising_stars:
        for star in rising_stars:
            mention = f"@{star[1]}" if star[1] else star[0]
            rising_stars_html += f"<li><strong>{star[0]}</strong> {mention} <span style='color:green;'>+{star[2]} 📈</span></li>"
    else:
        rising_stars_html += "<li>Check back tomorrow!</li>"
    rising_stars_html += "</ul>"

    # 5. Dynamic Promotional Blocks (Randomized)
    promo_variants = [
        {
            'title': '♟️ FarChess',
            'texts': [
                f"Play chess, earn $CHESS tokens! Challenge players worldwide.",
                f"Sharpen your skills and stack $CHESS. Every move counts!",
                f"From beginner to grandmaster - earn $CHESS while you play!"
            ],
            'link': 'https://farcaster.xyz/miniapps/DXCz8KIyfsme/farchess'
        },
        {
            'title': '🏎️ Buy a Lambo',
            'texts': [
                f"Current jackpot: {jackpot_formatted if 'jackpot_formatted' in locals() else '3.5M'} $CHESS! One winner takes all tonight at 19:00 UTC.",
                f"{jackpot_formatted if 'jackpot_formatted' in locals() else '3.5M'} $CHESS up for grabs! Will you be the lucky one?",
                f"The Lambo dream is real: {jackpot_formatted if 'jackpot_formatted' in locals() else '3.5M'} $CHESS jackpot waiting!"
            ],
            'link': 'https://farcaster.xyz/miniapps/LDihmHy56jDm/lambo-lotto'
        },
        {
            'title': '❄️ Winter Airdrop Season',
            'texts': [
                "Join the season, climb the leaderboard, and earn exclusive rewards!",
                "Limited time: Winter Airdrop Season is live! Don't miss your chance.",
                "Compete, share, and win big in the Winter Airdrop Season!"
            ],
            'link': 'https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank'
        }
    ]
    
    # Pick 2-3 random promos
    num_promos = random.randint(2, 3)
    selected_promos = random.sample(promo_variants, num_promos)
    
    promo_blocks_html = ""
    for promo in selected_promos:
        promo_text = random.choice(promo['texts'])
        promo_blocks_html += f"""
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 10px; margin: 10px 0;">
            <h4 style="margin: 0 0 10px 0;">{promo['title']}</h4>
            <p style="margin: 0 0 10px 0; font-size: 14px;">{promo_text}</p>
            <a href="{promo['link']}" style="display: inline-block; background: white; color: #764ba2; padding: 8px 16px; text-decoration: none; border-radius: 20px; font-weight: bold; font-size: 13px;">Try Now →</a>
        </div>
        """

    body = f"""
    <h2 style="color: #764ba2;">🎉 Update Successful!</h2>
    
    <div style="background: #f0ecf9; padding: 15px; border-left: 5px solid #764ba2; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top:0;">📱 Cast Preview (Copy & Post!)</h3>
        <pre style="background: #ffffff; padding: 15px; border: 1px dashed #764ba2; border-radius: 5px; white-space: pre-wrap; font-family: monospace; font-size: 13px;">{cast_text}</pre>
        <p style="font-size: 12px; color: #666;">💡 Tip: Mentions like @ifun and @base.base.eth help visibility!</p>
    </div>

    <div style="background: #fff3e0; padding: 15px; border: 2px solid #ff9800; border-radius: 10px; margin: 15px 0;">
        <h3 style="margin-top:0; color: #e65100;">🌟 Rising Stars - Apps on the Move!</h3>
        <p style="font-size: 12px; color: #666; margin-bottom: 10px;">Check out these up-and-coming miniapps making waves:</p>
        {rising_stars_html}
    </div>

    <div style="background: #fff8e1; padding: 15px; border: 2px solid #ffc107; border-radius: 5px; margin: 15px 0; text-align: center;">
        <h3 style="margin-top:0; color: #ffa000;">🎁 Daily Codes & Promotions:</h3>
        <div style="display: flex; justify-content: space-around; gap: 10px; margin-bottom: 15px;">
            <div style="background: white; padding: 10px; border-radius: 5px; border: 1px solid #ffc107; flex: 1;">
                <p style="margin: 0; font-size: 12px; color: #666;">AppRank (10k Promo Code):</p>
                <p style="margin: 5px 0; font-size: 18px; font-weight: bold; font-family: monospace; color: #333;">{apprank_code}</p>
                <pre style="background: #f9f9f9; padding: 5px; border: 1px solid #ddd; font-size: 10px; white-space: pre-wrap; margin-top: 10px; text-align: left;">{apprank_promo}</pre>
            </div>
            <div style="background: white; padding: 10px; border-radius: 5px; border: 1px solid #ffc107; flex: 1;">
                <p style="margin: 0; font-size: 12px; color: #666;">Lambo Lotto (1 Free ticket):</p>
                <p style="margin: 5px 0; font-size: 18px; font-weight: bold; font-family: monospace; color: #333;">{lotto_code}</p>
                <p style="margin: 5px 0; font-size: 14px; color: #ff6f00;">💰 Jackpot: {jackpot_formatted if 'jackpot_formatted' in locals() else '3.5M'} $CHESS</p>
                <pre style="background: #f9f9f9; padding: 5px; border: 1px solid #ddd; font-size: 10px; white-space: pre-wrap; margin-top: 10px; text-align: left;">{lotto_promo}</pre>
            </div>
        </div>
        
        {promo_blocks_html}
        
        <p style="font-size: 11px; color: #999; margin-top: 15px;">Copy the texts above and share with the community! 😉</p>
    </div>

    <div style="background: #e3f2fd; padding: 15px; border: 1px solid #2196f3; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top:0; color: #1976d2;">📊 Detailed Stats (Real-time):</h3>
        
        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px;">
                <h4 style="margin: 10px 0 5px 0; font-size: 14px;">🔔 Subscribers:</h4>
                {sub_stats_html}
            </div>
            <div style="flex: 1; min-width: 200px;">
                <h4 style="margin: 10px 0 5px 0; font-size: 14px;">🏎️ Lambo Lotto Usage ({lotto_code}):</h4>
                {lotto_usages_html}
                <p style="font-size: 12px; margin-top: 5px;">{lotto_info_html}</p>
            </div>
            <div style="flex: 1; min-width: 200px;">
                <h4 style="margin: 10px 0 5px 0; font-size: 14px;">📈 AppRank Usage ({apprank_code}):</h4>
                {apprank_usages_html}
            </div>
        </div>
    </div>

    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 250px; background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 10px 0;">
            <h3 style="margin-top:0;">📈 Top Gainers:</h3>
            <p style="font-size: 12px; color: #666;">(Click names to open)</p>
            {gainers_html}
        </div>
        
        <div style="flex: 1; min-width: 250px; background: #fff3cd; padding: 15px; border-radius: 5px; margin: 10px 0;">
            <h3 style="margin-top:0;">🏆 Current Top 5:</h3>
            {top_html}
        </div>
    </div>

    <!-- WINNER NOTIFICATION (Moved to bottom) -->
    {winner_block_html if 'winner_block_html' in locals() and winner_block_html else ""}

    <!-- GTA VICE CITY LOTTO PROMO (Moved to bottom) -->
    {get_vice_city_lambo_promo(jackpot_formatted, format_jackpot(int(jackpot_amount * 1.25)))}

    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: center;">
        <p><strong>Total miniapps updated:</strong> {miniapps_count}</p>
        <p style="margin-bottom: 5px;">🔥 Today's Offer: <strong>{promo_name}</strong></p>
        <a href="https://{promo_link}" style="display: inline-block; background: #333; color: white; padding: 10px 20px; text-decoration: none; border-radius: 20px; font-size: 14px; margin-bottom: 20px;">🎮 Open: {promo_name}</a>
        <br>
        <a href="https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: bold;">🌐 Go to AppRank</a>
    </div>
    """
    
    return send_email_notification(subject, body)

def send_error_notification(error_message, error_details):
    """Error notification"""
    
    subject = f"❌ Farcaster Miniapp Update Error - {date.today()}"
    
    body = f"""
    <h2>🚨 Automated Update Error!</h2>
    
    <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3>❌ Error Details:</h3>
        <p><strong>Error:</strong> {error_message}</p>
        <p><strong>Time:</strong> {datetime.now().strftime('%H:%M:%S')}</p>
        <pre style="background: #f1f1f1; padding: 10px; border-radius: 3px; overflow-x: auto;">{error_details}</pre>
    </div>
    
    <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3>🔧 Suggestions:</h3>
        <ul>
            <li>Check GitHub Actions logs</li>
            <li>Check database connection</li>
            <li>Check Bearer token validity</li>
        </ul>
    </div>
    """
    
    return send_email_notification(subject, body)

def send_daily_summary(miniapps_data):
    """Daily summary"""
    
    subject = f"📊 Farcaster Miniapp Daily Summary - {date.today()}"
    
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
    <h2>📊 Daily Miniapp Summary</h2>
    
    <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3>📈 Overview:</h3>
        <ul>
            <li><strong>Total miniapps:</strong> {len(miniapps_data)}</li>
            <li><strong>Update time:</strong> {datetime.now().strftime('%H:%M:%S')}</li>
            <li><strong>Date:</strong> {date.today()}</li>
        </ul>
    </div>
    
    <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3>🏆 Top 10 Miniapps:</h3>
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f8f9fa;">
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Rank</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Name</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Domain</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">72h Change</th>
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
    # Test data
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
