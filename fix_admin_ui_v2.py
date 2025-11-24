import os

file_path = 'src/app/admin/page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# The target string to find (the paragraph below the generate button)
target_string = """                <p className="mt-4 text-sm text-gray-400">
                    Generating a new code will automatically deactivate the previous one.
                </p>"""

# The new content to insert (using IIFE to define variable safely)
new_content = """                <p className="mt-4 text-sm text-gray-400 mb-6">
                    Generating a new code will automatically deactivate the previous one.
                </p>

                {dailyCode && (() => {
                    const promoText = `🎁 DAILY CODE DROP! 🎁

Use code: ${dailyCode}

Redeem it now on AppRank for 5000 $CHESS! ♟️
Limited to one use per person per day.

👉 https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank`;
                    return (
                        <div className="border-t border-gray-700 pt-6 mt-6">
                            <h3 className="text-xl font-bold text-white mb-4">📢 Promotion Post</h3>
                            <div className="bg-[#1a1f2e] border border-gray-600 rounded-lg p-4 mb-4 text-left">
                                <pre className="text-green-400 text-sm whitespace-pre-wrap font-mono select-all">
                                    {promoText}
                                </pre>
                            </div>
                            <button
                                onClick={() => copyToClipboard(promoText)}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto font-semibold"
                            >
                                <FiCopy size={20} />
                                Copy Post Text
                            </button>
                        </div>
                    );
                })()}"""

if target_string in content:
    new_file_content = content.replace(target_string, new_content)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_file_content)
    print("Successfully updated src/app/admin/page.tsx")
else:
    print("Error: Target string not found in file.")
