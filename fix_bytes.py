import os

# Mapping of corrupted byte sequences to correct byte sequences (all UTF-8)
# Example: 🚀 is f0 9f 9a 80
# In CP1250: f0=đ, 9f=ź, 9a=š, 80=€
# If that string (đźš€) is saved as UTF-8, it becomes:
# đ = c4 91
# ź = c5 ba
# š = c5 a1
# € = e2 82 ac
# So we look for c4 91 c5 ba c5 a1 e2 82 ac and replace with f0 9f 9a 80

def get_corrupt_bytes(emoji_char):
    # original_bytes is the correct UTF-8
    original_bytes = emoji_char.encode('utf-8')
    # Try to simulate the corruption:
    # 1. Take original bytes and interpret as CP1250
    try:
        corrupt_str = original_bytes.decode('cp1250')
        # 2. Encode that corrupted string as UTF-8
        corrupt_bytes = corrupt_str.encode('utf-8')
        return corrupt_bytes, original_bytes
    except:
        return None, None

def main():
    emojis = [
        "🚀", "💎", "👥", "✅", "💬", "🎟️", "📈", "⏳", "📊", "🔍", "💰", "🎉", "💪", "📱", "🛑", "⚠️", "✖️", "🦄", "🎯", "💸", "🎮", "👀", "🔥", "✨", "🛡️", "🦍", "🎨", "💫", "👯", "🎟️"
    ]
    
    replacements = []
    for e in emojis:
        c_bytes, o_bytes = get_corrupt_bytes(e)
        if c_bytes:
            replacements.append((c_bytes, o_bytes))
    
    # Also add some manual ones that might fail the CP1250 check in Python
    # đź“ˆ -> 📈 (f0 9f 93 88)
    # đ = c4 91 (\xf0 interpreted as cp1250)
    # ź = c5 ba (\x9f)
    # “ = e2 80 9c (\x93) -> wait, \x93 is LEFT DOUBLE QUOTE in CP1250
    # ˆ = c4 88 ??? No. 
    # Let's just use a more aggressive approach.
    
    src_dir = 'src'
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx', '.css', '.md')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'rb') as f:
                        data = f.read()
                    
                    changed = False
                    for c_bytes, o_bytes in replacements:
                        if c_bytes in data:
                            data = data.replace(c_bytes, o_bytes)
                            changed = True
                    
                    if changed:
                        print(f"Fixing {file_path} (byte-wise)...")
                        with open(file_path, 'wb') as f:
                            f.write(data)
                except Exception as e:
                    print(f"Error processing {file_path}: {e}")

if __name__ == "__main__":
    main()
