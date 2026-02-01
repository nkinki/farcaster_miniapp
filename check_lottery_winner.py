import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
NEON_DB_URL = os.getenv("NEON_DB_URL") or os.getenv("DATABASE_URL")

def check_winners():
    print(f"Connecting to DB...")
    conn = psycopg2.connect(NEON_DB_URL)
    cursor = conn.cursor()

    # Get the last 3 draws
    cursor.execute("""
        SELECT id, draw_number, winning_number, jackpot, status, end_time
        FROM lottery_draws
        ORDER BY draw_number DESC
        LIMIT 3
    """)
    draws = cursor.fetchall()
    
    print("\nRecent Draws:")
    for d in draws:
        print(f"ID: {d[0]}, Round: #{d[1]}, Winning Number: {d[2]}, Jackpot: {d[3]}, Status: {d[4]}, End Time: {d[5]}")
        
        # Check for winners in this draw if it's completed
        if d[4] == 'completed' and d[2] is not None:
            # First, let's see what columns we have in lottery_tickets
            cursor.execute("SELECT * FROM lottery_tickets LIMIT 1")
            colnames = [desc[0] for desc in cursor.description]
            # print(f"  Columns: {colnames}")
            
            cursor.execute("""
                SELECT player_fid, player_name, number
                FROM lottery_tickets
                WHERE draw_id = %s AND number = %s
            """, (d[0], d[2]))
            winners = cursor.fetchall()
            if winners:
                print(f"  🏆 Winners for Round #{d[1]}:")
                for w in winners:
                    print(f"    - FID: {w[0]}, Name: {w[1]}, Ticket Number: {w[2]}, Prize: {d[3]}")
            else:
                print(f"  ❌ No winners for Round #{d[1]}")

    conn.close()

if __name__ == "__main__":
    check_winners()
