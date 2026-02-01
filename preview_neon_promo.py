import os

def get_css_neon_lambo_promo(jackpot_formatted, next_jackpot_formatted):
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

if __name__ == "__main__":
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ background-color: #000; padding: 50px; display: flex; justify-content: center; }}
            .container {{ width: 600px; }}
        </style>
    </head>
    <body>
        <div class="container">
            {get_css_neon_lambo_promo("4.2M", "5.5M")}
        </div>
    </body>
    </html>
    """
    
    with open("lambo_neon_css_preview.html", "w", encoding="utf-8") as f:
        f.write(html_content)
    
    print("Preview generated: lambo_neon_css_preview.html")
