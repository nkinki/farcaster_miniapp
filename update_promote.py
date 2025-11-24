import os

file_path = r'c:\Users\bwbst\farcaster_miniapp\src\app\promote\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target_block = """        {/* Join AppRank */}
        <button
          onClick={() => {
            try {
              (miniAppSdk as any).actions.openUrl('https://farcaster.xyz/~/group/Vxk-YQtXXh7CiTo2xY4Tvw');
            } catch (error) {
              console.log('SDK openUrl error:', error);
              window.open('https://farcaster.xyz/~/group/Vxk-YQtXXh7CiTo2xY4Tvw', '_blank');
            }
          }}
          className="flex flex-col items-center gap-3 p-6 text-lg font-bold bg-[#23283a] border border-[#a64d79] hover:bg-[#2a2f42] rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer pulse-glow"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center border-2 border-white/60">
            <FiUsers size={32} className="text-white" />
          </div>
          <div className="text-center">
            <div className="text-orange-300">Join AppRank</div>
            <div className="text-xs text-gray-400">Community</div>
          </div>
        </button>"""

replacement_block = """        {/* Join AppRank - Wide Button */}
        <button
          onClick={() => {
            try {
              (miniAppSdk as any).actions.openUrl('https://farcaster.xyz/~/group/Vxk-YQtXXh7CiTo2xY4Tvw');
            } catch (error) {
              console.log('SDK openUrl error:', error);
              window.open('https://farcaster.xyz/~/group/Vxk-YQtXXh7CiTo2xY4Tvw', '_blank');
            }
          }}
          className="flex items-center justify-between p-4 my-4 bg-[#23283a] border border-[#a64d79] hover:bg-[#2a2f42] rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer pulse-glow max-w-md mx-auto"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center border-2 border-white/60">
              <FiUsers size={24} className="text-white" />
            </div>
            <div className="text-left">
              <div className="text-orange-300 font-bold">Join AppRank Community</div>
              <div className="text-xs text-gray-400">Connect with builders</div>
            </div>
          </div>
          <FiChevronDown className="text-gray-400" size={20} />
        </button>"""

# Normalize line endings to avoid issues
content = content.replace('\r\n', '\n')
target_block = target_block.replace('\r\n', '\n')
replacement_block = replacement_block.replace('\r\n', '\n')

if target_block in content:
    new_content = content.replace(target_block, replacement_block)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully replaced content.")
else:
    print("Target block not found.")
    # Print a snippet of where it should be to debug
    start_index = content.find("Join AppRank")
    if start_index != -1:
        print(f"Found 'Join AppRank' at index {start_index}. Surrounding text:")
        print(content[start_index:start_index+500])
    else:
        print("Could not find 'Join AppRank' in file.")
