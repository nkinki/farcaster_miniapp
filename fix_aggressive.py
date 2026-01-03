import os

def fix_content(content):
    # Try to fix by re-encoding to CP1250 and back to UTF-8
    # We do it character by character to avoid total failure
    res = []
    i = 0
    while i < len(content):
        fixed_part = None
        # Try to take a chunk and fix it
        # Patterns: 2-char (Ă©), 3-char (âś…), 4-char (đźš€)
        for length in [4, 3, 2]:
            if i + length <= len(content):
                chunk = content[i:i+length]
                try:
                    # Only try if it contains "suspicious" characters
                    if any(ord(c) > 127 for c in chunk):
                        fixed = chunk.encode('cp1250').decode('utf-8')
                        fixed_part = (fixed, length)
                        break
                except:
                    continue
        
        if fixed_part:
            res.append(fixed_part[0])
            i += fixed_part[1]
        else:
            res.append(content[i])
            i += 1
    return "".join(res)

def main():
    src_dir = 'src'
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx', '.css', '.md')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    if any(ord(c) > 127 for c in content):
                        print(f"Checking {file_path} for corruption...")
                        fixed = fix_content(content)
                        if fixed != content:
                            print(f"Fixing {file_path}...")
                            with open(file_path, 'w', encoding='utf-8') as f:
                                f.write(fixed)
                except Exception as e:
                    pass # Skip errors

if __name__ == "__main__":
    main()
