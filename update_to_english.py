import os

file_path = 'src/app/admin/page.tsx'

# The current text to find and replace
target = '''              {dailyCode && (
                <div className="border-t border-gray-700 pt-6 mt-6">
                  <h3 className="text-xl font-bold text-white mb-4">📢 Promotion Post</h3>
                  <p className="text-gray-300 mb-4 text-center">
                    Oszd meg ezt a kódot a közösséggel! A felhasználók <span className="text-green-400 font-semibold">ingyen létrehozhatnak egy 10,000 $CHESS promóciót</span> ezzel a kóddal. 
                    Segíts nekik elkezdeni az AppRank-en! 🚀
                  </p>
                  <button
                    onClick={() => copyToClipboard('Daily Code: ' + dailyCode)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto font-semibold"
                  >
                    <FiCopy size={20} />
                    Copy Post Text
                  </button>
                </div>
              )}'''

# The new English replacement emphasizing daily free use and sharing
replacement = '''              {dailyCode && (
                <div className="border-t border-gray-700 pt-6 mt-6">
                  <h3 className="text-xl font-bold text-white mb-4">📢 Promotion Post</h3>
                  <p className="text-gray-300 mb-4 text-center">
                    Share this <span className="text-green-400 font-semibold">daily free code</span> with the community! Users can redeem it to <span className="text-green-400 font-semibold">create a free 10,000 $CHESS promotion</span> every day. 
                    Help them get started on AppRank! 🚀
                  </p>
                  <button
                    onClick={() => copyToClipboard('Daily Code: ' + dailyCode)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto font-semibold"
                  >
                    <FiCopy size={20} />
                    Copy Post Text
                  </button>
                </div>
              )}'''

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if target in content:
        new_content = content.replace(target, replacement)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"✅ Successfully updated {file_path} to English")
        print("Updated text to emphasize daily free code sharing")
    else:
        print("❌ Error: Target block not found in file.")
        print("The file structure may have changed.")

except Exception as e:
    print(f"❌ Error: {e}")
