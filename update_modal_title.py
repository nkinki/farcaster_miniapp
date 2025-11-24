import os

file_path = r'c:\Users\bwbst\farcaster_miniapp\src\app\promote\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target_block = """            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <FiGift className="text-yellow-400" />
              Redeem Daily Code
            </h2>"""

replacement_block = """            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <FiGift className="text-yellow-400" />
              Redeem Daily Code (Under Dev)
            </h2>"""

# Normalize line endings
content = content.replace('\r\n', '\n')
target_block = target_block.replace('\r\n', '\n')
replacement_block = replacement_block.replace('\r\n', '\n')

if target_block in content:
    new_content = content.replace(target_block, replacement_block)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully replaced modal title.")
else:
    print("Target block not found.")
    start_index = content.find("Redeem Daily Code")
    if start_index != -1:
        print(f"Found 'Redeem Daily Code' at index {start_index}. Surrounding text:")
        print(content[start_index-100:start_index+100])
    else:
        print("Could not find 'Redeem Daily Code' in file.")
