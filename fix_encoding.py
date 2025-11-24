import os

file_path = 'eslint.config.mjs'

try:
    # Try reading as UTF-16 (which it seems to be)
    with open(file_path, 'r', encoding='utf-16') as f:
        content = f.read()
    
    # Write back as UTF-8
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Successfully converted {file_path} to UTF-8")

except UnicodeError:
    print("Could not read as UTF-16, trying UTF-8 to see if it's already correct...")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        print("File is already UTF-8 (or compatible).")
    except Exception as e:
        print(f"Error reading file: {e}")
except Exception as e:
    print(f"Error: {e}")
