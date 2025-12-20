import os

file_path = '.env'
if os.path.exists(file_path):
    try:
        # Read as UTF-16
        with open(file_path, 'rb') as f:
            raw = f.read()
        
        if raw.startswith(b'\xff\xfe'):
            content = raw.decode('utf-16')
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print("Successfully converted .env to UTF-8")
        else:
            print(".env is not UTF-16 LE, skipping conversion.")
    except Exception as e:
        print(f"Error converting .env: {e}")
else:
    print(".env does not exist.")
