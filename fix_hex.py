import os

# Map of corrupted UTF-8 byte sequences to correct UTF-8 byte sequences
# Based on the hex dump of the corrupted file
HEX_MAP = {
    b'\xc4\x91\xc5\xba\xe2\x80\x9c\xc2\x88': b'\xf0\x9f\x93\x88', # đź“ˆ -> 📈
    b'\xc4\x91\xc5\xba\xc5\x9a\xc2\xac': b'\xf0\x9f\x92\xac',     # đź’¬ -> 💬
    b'\xc4\x91\xc5\xba\xc5\xbd\xc2\xbc': b'\xf0\x9f\x8e\xbc',     # đźŽź -> 🎟️
    b'\xc4\x91\xc5\xba\xc5\xbd\xc2\x8e': b'\xf0\x9f\x8e\x8e',     # đźŽŽ -> 🏁?
    b'\xc4\x91\xc5\xba\xc5\xbd\xc2\x9e': b'\xf0\x9f\x8e\x9e',     # đźŽž -> 🎞️?
    b'\xc4\x91\xc5\xba\xc5\xbd\xc2\x9f': b'\xf0\x9f\x8e\x9f',     # đźŽŸ -> 🎟️
    b'\xc4\x91\xc5\xba\xc5\xa1\xe2\x82\xac': b'\xf0\x9f\x9a\x80', # đźš€ -> 🚀
    b'\xc3\xa2\xc5\x9b\xe2\x80\xa6': b'\xe2\x9c\x85',             # âś… -> ✅
}

def main():
    src_dir = 'src'
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx', '.css', '.md')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'rb') as f:
                        data = f.read()
                    
                    changed = False
                    for corrupt, fixed in HEX_MAP.items():
                        if corrupt in data:
                            data = data.replace(corrupt, fixed)
                            changed = True
                    
                    if changed:
                        print(f"Fixing {file_path} (hex-wise)...")
                        with open(file_path, 'wb') as f:
                            f.write(data)
                except Exception as e:
                    print(f"Error: {e}")

if __name__ == "__main__":
    main()
