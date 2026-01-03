import os

# More comprehensive map
EXTRA_MAP = {
    "đźŚ ": "🦄",
    "đźŽ ": "🎁",
    "đź”˜": "🔘",
    "â­ ": "⭐",
    "â™źď¸Ź": "⚡",
    "đź”Ť": "🔍",
    "đźŽ‰": "🎉",
    "đź“Š": "📊",
    "đź’°": "💰",
    "đź’Ş": "💪",
    "đź“±": "📱",
    "đź›‘": "🛑",
    "âš ď¸Ź": "⚠️",
    "âťŚ": "✖️",
    "đźš€": "🚀",
    "đź’Ž": "💎",
    "đź‘€": "👀",
    "đź”Ą": "🔥",
    "đź’¸": "💸",
    "đźŽ®": "🎮",
    "đźŽŻ": "🎯",
    "đźŹ†": "✨",
    "âś¨": "✨",
}

def main():
    path = 'src/app/promote/page.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for corrupt, fixed in EXTRA_MAP.items():
        content = content.replace(corrupt, fixed)
    
    # Also handle some common Hungarian characters that might have been missed
    replacements = {
        "Ă©": "é",
        "Ăł": "ó",
        "Ă¶": "ö",
        "Ă": "á", # This can be risky if not followed by anything, but usually it's Ăˇ for á
        "Ăˇ": "á",
        "Ĺ±": "ű",
        "Ĺ‘": "ő",
        "Ăş": "ú",
        "Ă­": "í",
        "Ăś": "Ö",
    }
    
    for c, f in replacements.items():
        content = content.replace(c, f)
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Final fix for promote/page.tsx applied.")

if __name__ == "__main__":
    main()
