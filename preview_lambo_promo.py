import os
from email_notifications import get_vice_city_lambo_promo

def create_preview():
    # Mock data
    jackpot = "8.6M"
    next_jackpot = "10.8M"
    
    # Get HTML
    promo_html = get_vice_city_lambo_promo(jackpot, next_jackpot)
    
    # Wrap in a basic container for preview
    full_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>GTA Vice City Lotto Preview</title>
        <style>
            body {{
                background-color: #f0f0f0;
                padding: 40px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
            }}
            .email-container {{
                width: 600px;
                background: white;
                box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                border-radius: 8px;
                padding: 20px;
            }}
        </style>
    </head>
    <body>
        <div class="email-container">
            <h1 style="color: #333; font-family: Arial; font-size: 18px;">Email Preview: Daily Update</h1>
            <p style="color: #666; font-family: Arial; font-size: 14px;">This is how the new Lambo Lotto block will appear in the daily email.</p>
            <hr>
            {promo_html}
        </div>
    </body>
    </html>
    """
    
    output_file = "lambo_promo_preview.html"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(full_html)
    
    print(f"✅ Preview generated: {os.path.abspath(output_file)}")

if __name__ == "__main__":
    create_preview()
