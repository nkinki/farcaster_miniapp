import os

# Mapping of corrupted strings (CP1250 interpreted as UTF-8) to their original characters (UTF-8)
CORRUPT_MAP = {
    "đźš€": "🚀",
    "đź’Ž": "💎",
    "đź‘Ą": "👥",
    "âś…": "✅",
    "đź’¬": "💬",
    "đźŽź": "🎟️",
    "đź“ˆ": "📈",
    "âŹł": "⏳",
    "đź“Š": "📊",
    "đź”Ť": "🔍",
    "đź’°": "💰",
    "đźŽ‰": "🎉",
    "đź’Ş": "💪",
    "đź“±": "📱",
    "đź›‘": "🛑",
    "âš ď¸Ź": "⚠️",
    "âťŚ": "✖️",
    "đźŚ ": "🦄", # Guessing based on "đźŚ " in comments
    "đźŽŻ": "🎯",
    "đź’¸": "💸",
    "đźŽ®": "🎮",
    "đź‘€": "👀",
    "đź”Ą": "🔥",
    "đźŹ†": "✨",
    "âś¨": "✨",
    "đźš€": "🚀",
    "âšˇ": "🛡️",
    "đźŚź": "🦍",
    "đźŽ¨": "🎨",
    "đź’«": "💫",
    "đź‘Ź": "👯",
    "đźŽźď¸Ź": "🎟️",
}

def fix_content(content):
    changed = False
    new_content = content
    for corrupt, fix in CORRUPT_MAP.items():
        if corrupt in new_content:
            new_content = new_content.replace(corrupt, fix)
            changed = True
    return new_content, changed

def main():
    src_dir = 'src'
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx', '.css', '.md')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    fixed_content_str, did_change = fix_content(content)
                    
                    if did_change:
                        print(f"Fixing {file_path} with map...")
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(fixed_content_str)
                        print(f"Successfully fixed {file_path}")
                except Exception as e:
                    print(f"Error processing {file_path}: {e}")

if __name__ == "__main__":
    main()
