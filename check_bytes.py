with open('src/app/promote/page.tsx', 'rb') as f:
    content = f.read()
    # Find the sequence for "đźš€"
    # đ = \xc4\x91 in UTF-8
    # ź = \xc5\xba in UTF-8
    # š = \xc5\xa1 in UTF-8
    # € = \xe2\x82\xac in UTF-8
    pattern = "đźš€".encode('utf-8')
    pos = content.find(pattern)
    if pos != -1:
        print(f"Found pattern at {pos}")
        print(f"Bytes: {content[pos:pos+len(pattern)].hex(' ')}")
    else:
        print("Pattern not found as UTF-8 literal")
        # Maybe it's not and actually it's just the bytes?
        # But view_file showed đźš€.
