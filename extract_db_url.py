import os
import re

env_path = '.env.local'
if os.path.exists(env_path):
    # Try different encodings
    encodings = ['utf-16', 'utf-8', 'latin-1']
    content = None
    for enc in encodings:
        try:
            with open(env_path, 'r', encoding=enc) as f:
                content = f.read()
            break
        except Exception:
            continue
    
    if content:
        match = re.search(r'DATABASE_URL=(postgresql://[^\s]+)', content)
        if match:
            url = match.group(1).strip()
            if url.endswith('requiree'):
                url = url[:-1]
            print(f"FOUND_URL={url}")
        else:
            # Fallback: maybe it's not starting with postgresql:// in this encoding?
            # Let's just look for the string
            if 'DATABASE_URL' in content:
                print("DATABASE_URL found but regex failed. Content sample:")
                idx = content.find('DATABASE_URL')
                print(content[idx:idx+200].replace('\n', ' '))
            else:
                print("DATABASE_URL not found in .env.local")
    else:
        print("Could not read .env.local with any encoding")
else:
    print(".env.local not found")
