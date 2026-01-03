with open('src/app/promote/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    line = lines[2695] # 0-indexed, so 2696 is 2695
    print(f"Line: {line}")
    print(f"Bytes: {line.encode('utf-8').hex(' ')}")
    try:
        raw = line.encode('cp1250')
        print(f"Raw CP1250: {raw.hex(' ')}")
        fixed = raw.decode('utf-8')
        print(f"Fixed: {fixed}")
    except Exception as e:
        print(f"Error: {e}")
