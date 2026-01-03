import os

def fix_line(line):
    try:
        # Try to encode back to CP1250 and decode as UTF-8
        # We only do this if it looks corrupted
        if any(c in line for c in ["đź", "âś", "âŹ", "đź’"]):
            bad_bytes = line.encode('cp1250')
            fixed_line = bad_bytes.decode('utf-8')
            return fixed_line, True
        return line, False
    except (UnicodeEncodeError, UnicodeDecodeError):
        return line, False

def process_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        new_lines = []
        changed = False
        for i, line in enumerate(lines):
            fixed, did_fix = fix_line(line)
            if did_fix:
                new_lines.append(fixed)
                changed = True
            else:
                new_lines.append(line)
        
        if changed:
            print(f"Fixing {file_path}...")
            with open(file_path, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
            print(f"Successfully fixed {file_path}")
            return True
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
    return False

def main():
    src_dir = 'src'
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx', '.css', '.md')):
                process_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
