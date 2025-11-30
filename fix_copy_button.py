import os

file_path = 'src/app/admin/page.tsx'

# Find and replace the copy button to copy a full promotional post
target = '''                  <button
                    onClick={() => copyToClipboard('Daily Code: ' + dailyCode)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto font-semibold"
                  >
                    <FiCopy size={20} />
                    Copy Post Text
                  </button>'''

replacement = '''                  <button
                    onClick={() => copyToClipboard(`🎁 DAILY FREE CODE! 🎁

Use code: ${dailyCode}

Redeem it now on AppRank for 10,000 $CHESS! ♟️
Limited to one use per person per day.

👉 https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank`)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto font-semibold"
                  >
                    <FiCopy size={20} />
                    Copy Post Text
                  </button>'''

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if target in content:
        new_content = content.replace(target, replacement)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("SUCCESS: Updated " + file_path)
        print("Updated copy button to copy full promotional post")
    else:
        print("ERROR: Target block not found in file.")
        print("The file structure may have changed.")

except Exception as e:
    print("ERROR: " + str(e))
