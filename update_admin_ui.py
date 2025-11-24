import os

file_path = r'c:\Users\bwbst\farcaster_miniapp\src\app\admin\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Imports
if "FiGift" not in content:
    content = content.replace("FiMail } from 'react-icons/fi';", "FiMail, FiGift } from 'react-icons/fi';")

# 2. Update State
state_insertion_point = "const [weatherLottoLoading, setWeatherLottoLoading] = useState(false);"
new_state = """  const [weatherLottoLoading, setWeatherLottoLoading] = useState(false);
  const [dailyCode, setDailyCode] = useState<string | null>(null);
  const [dailyCodeLoading, setDailyCodeLoading] = useState(false);"""

if state_insertion_point in content and "dailyCode" not in content:
    content = content.replace(state_insertion_point, new_state)

# 3. Update ActiveTab Type
if "'daily_code'" not in content:
    content = content.replace("useState<'stats' | 'promos' | 'comments' | 'follows' | 'emails'>('stats')", "useState<'stats' | 'promos' | 'comments' | 'follows' | 'emails' | 'daily_code'>('stats')")

# 4. Add Fetch Logic
fetch_logic_insertion_point = """  useEffect(() => {
    fetchStats();
    fetchShareablePromos();
  }, []);"""

new_fetch_logic = """  useEffect(() => {
    fetchStats();
    fetchShareablePromos();
    fetchDailyCode();
  }, []);

  const fetchDailyCode = async () => {
    try {
      const response = await fetch('/api/admin/generate-daily-code');
      if (response.ok) {
        const data = await response.json();
        setDailyCode(data.code);
      }
    } catch (error) {
      console.error('Error fetching daily code:', error);
    }
  };

  const generateNewDailyCode = async () => {
    setDailyCodeLoading(true);
    try {
      const response = await fetch('/api/admin/generate-daily-code', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setDailyCode(data.code);
      }
    } catch (error) {
      console.error('Error generating daily code:', error);
    } finally {
        setDailyCodeLoading(false);
    }
  };"""

if fetch_logic_insertion_point in content and "fetchDailyCode" not in content:
    content = content.replace(fetch_logic_insertion_point, new_fetch_logic)

# 5. Add Tab Button
tab_button_insertion_point = """              <FiMail className="inline mr-2" size={16} />
              Send Emails
            </button>
          </div>"""

new_tab_button = """              <FiMail className="inline mr-2" size={16} />
              Send Emails
            </button>
            <button
              onClick={() => setActiveTab('daily_code')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'daily_code'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <FiGift className="inline mr-2" size={16} />
              Daily Code
            </button>
          </div>"""

if tab_button_insertion_point in content and "Daily Code" not in content:
    content = content.replace(tab_button_insertion_point, new_tab_button)

# 6. Add Tab Content
tab_content_insertion_point = """        {/* Stats Tab */}"""
new_tab_content = """        {/* Daily Code Tab */}
        {activeTab === 'daily_code' && (
          <div className="max-w-2xl mx-auto">
             <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-8 text-center">
                <h2 className="text-2xl font-bold text-white mb-6">🎁 Daily Promotion Code</h2>
                
                <div className="mb-8">
                    <div className="text-gray-400 mb-2">Current Active Code</div>
                    <div className="text-4xl font-mono font-bold text-yellow-400 tracking-wider bg-black/30 p-4 rounded-xl border border-yellow-500/30 inline-block min-w-[300px]">
                        {dailyCode || 'NO ACTIVE CODE'}
                    </div>
                </div>

                <button
                    onClick={generateNewDailyCode}
                    disabled={dailyCodeLoading}
                    className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mx-auto"
                >
                    {dailyCodeLoading ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Generating...
                        </>
                    ) : (
                        <>
                            <FiRefreshCw size={24} />
                            Generate New Code
                        </>
                    )}
                </button>
                <p className="mt-4 text-sm text-gray-400">
                    Generating a new code will automatically deactivate the previous one.
                </p>
             </div>
          </div>
        )}

        {/* Stats Tab */}"""

if tab_content_insertion_point in content and "Daily Promotion Code" not in content:
    content = content.replace(tab_content_insertion_point, new_tab_content)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated Admin UI.")
