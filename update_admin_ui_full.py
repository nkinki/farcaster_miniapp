import os

file_path = 'src/app/admin/page.tsx'

target_block = """                {dailyCode && (
                    <div className="border-t border-gray-700 pt-6 mt-6">
                        <h3 className="text-xl font-bold text-white mb-4">Promotion Post</h3>
                        <button
                            onClick={() => copyToClipboard('Daily Code: ' + dailyCode)}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto font-semibold"
                        >
                            <FiCopy size={20} />
                            Copy Post Text
                        </button>
                    </div>
                )}"""

replacement_block = """                {dailyCode && (() => {
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

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if target_block in content:
        new_content = content.replace(target_block, replacement_block)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Successfully updated {file_path}")
    else:
        print("Error: Target block not found in file.")
        # Debug: print part of content to see why it didn't match
        # print(content[480:600]) 

except Exception as e:
    print(f"Error: {e}")
