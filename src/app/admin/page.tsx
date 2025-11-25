"use client";
import AdminPendingFollowsManager from '@/components/AdminPendingFollowsManager';
import { useState, useEffect } from 'react';
import AdminPendingCommentsManager from '@/components/AdminPendingCommentsManager';
import { FiBarChart, FiShare2, FiCopy, FiMessageSquare, FiRefreshCw, FiPlay, FiPause, FiUsers, FiMail, FiGift } from 'react-icons/fi';


interface AdminStats {
  totalPromotions: number;
  activePromotions: number;
  totalShares: number;
  totalRewards: number;
  totalUsers: number;
  pendingVerifications: number;
  todayVerifications: number;
  totalBudget: number;
  remainingBudget: number;
  avgReward: string;
  farChess: {
    totalGames: number;
    activeGames: number;
    completedGames: number;
    totalPlayers: number;
    totalMoves: number;
    totalUsers: number;
    totalGamesPlayed: number;
    totalGamesWon: number;
  };
  lottery: {
    totalRounds: number;
    activeRounds: number;
    completedRounds: number;
    totalTicketsSold: number;
    totalRevenue: number;
    totalPrizesDistributed: number;
    totalWinners: number;
    currentJackpot: number;
    avgTicketsPerRound: number;
    mostPopularNumbers: Array<{ number: number, count: number }>;
    topWinners: Array<{ player_fid: number, total_winnings: number }>;
  };
}

interface ShareablePromo {
  id: number;
  cast_url: string;
  reward_per_share: number;
  remaining_budget: number;
  total_budget: number;
  shares_count: number;
  action_type: string;
  status: string;
  author_username: string;
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [shareablePromos, setShareablePromos] = useState<ShareablePromo[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'promos' | 'comments' | 'follows' | 'emails' | 'daily_code'>('stats');
  const [selectedPromos, setSelectedPromos] = useState<Set<number>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string>('');
  const [summaryPost, setSummaryPost] = useState<string>('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [airdropSummary, setAirdropSummary] = useState<string>('');
  const [airdropLoading, setAirdropLoading] = useState(false);
  const [weatherLottoSummary, setWeatherLottoSummary] = useState<string>('');
  const [weatherLottoLoading, setWeatherLottoLoading] = useState(false);
  const [dailyCode, setDailyCode] = useState<string | null>(null);
  const [dailyCodeLoading, setDailyCodeLoading] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchShareablePromos = async () => {
    try {
      const response = await fetch('/api/admin/shareable-promos');
      if (response.ok) {
        const data = await response.json();
        setShareablePromos(data.promos || []);
      }
    } catch (error) {
      console.error('Error fetching shareable promos:', error);
    }
  };



  useEffect(() => {
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
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };


  const togglePromoSelection = (promoId: number) => {
    const newSelected = new Set(selectedPromos);
    if (newSelected.has(promoId)) {
      newSelected.delete(promoId);
    } else {
      newSelected.add(promoId);
    }
    setSelectedPromos(newSelected);
  };

  const selectAllPromos = () => {
    setSelectedPromos(new Set(shareablePromos.map(promo => promo.id)));
  };

  const clearSelection = () => {
    setSelectedPromos(new Set());
  };

  const handleBulkStatusChange = async (newStatus: 'active' | 'paused') => {
    if (selectedPromos.size === 0) return;

    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedPromos).map(promoId =>
        fetch('/api/promotions/status', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            promotionId: promoId,
            status: newStatus
          })
        })
      );

      await Promise.all(promises);

      // Ne töltse újra az adatokat, csak frissítse a lokális state-et
      setShareablePromos(prev => prev.map(promo =>
        selectedPromos.has(promo.id)
          ? { ...promo, status: newStatus }
          : promo
      ));

      setSelectedPromos(new Set());
    } catch (error) {
      console.error('Bulk status change error:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const sendLamboLotteryEmail = async () => {
    setEmailLoading(true);
    setEmailStatus('');

    try {
      // Get current active round (not completed rounds)
      const currentResponse = await fetch('/api/lottery/current-round');
      if (!currentResponse.ok) {
        throw new Error('Failed to fetch current round');
      }

      const currentData = await currentResponse.json();
      const currentRound = currentData.round;

      if (!currentRound) {
        throw new Error('No current lottery round found');
      }

      // Get the last completed round to get the winning number
      const recentResponse = await fetch('/api/lottery/recent-results');
      let lastWinningNumber = 0;
      if (recentResponse.ok) {
        const recentData = await recentResponse.json();
        if (recentData.rounds && recentData.rounds.length > 0) {
          lastWinningNumber = recentData.rounds[0].winning_number;
        }
      }

      // Use the current active round's jackpot
      const nextJackpot = currentRound.prize_pool;

      // Send email with current round data
      const emailResponse = await fetch('/api/lottery/send-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round: {
            draw_number: currentRound.round_number,
            jackpot: currentRound.prize_pool
          },
          winningNumber: lastWinningNumber, // Last completed round's winning number
          winners: [], // Will be calculated by the API
          totalPayout: 0, // Will be calculated by the API
          nextJackpot: nextJackpot
        })
      });

      if (emailResponse.ok) {
        setEmailStatus('✅ Lambo Lottery email sent successfully!');
      } else {
        const errorData = await emailResponse.json();
        throw new Error(errorData.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending Lambo Lottery email:', error);
      setEmailStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setEmailLoading(false);
    }
  };

  const sendWeatherLottoEmail = async () => {
    setEmailLoading(true);
    setEmailStatus('');

    try {
      // Trigger weather lotto draw and email
      const response = await fetch('/api/cron/weather-lotto-draw', {
        method: 'POST'
      });

      if (response.ok) {
        setEmailStatus('✅ Weather Lotto email sent successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send weather lotto email');
      }
    } catch (error) {
      console.error('Error sending Weather Lotto email:', error);
      setEmailStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setEmailLoading(false);
    }
  };

  const generateShareEarnSummary = async () => {
    setSummaryLoading(true);
    setSummaryPost('');

    try {
      const response = await fetch('/api/admin/share-earn-summary', {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        setSummaryPost(data.summaryPost);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate summary');
      }
    } catch (error) {
      console.error('Error generating Share & Earn summary:', error);
      setSummaryPost(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSummaryLoading(false);
    }
  };

  const copySummaryToClipboard = () => {
    if (summaryPost) {
      navigator.clipboard.writeText(summaryPost);
      setEmailStatus('📋 Summary copied to clipboard!');
    }
  };

  const generateAirdropSummary = async () => {
    setAirdropLoading(true);
    setAirdropSummary('');

    try {
      const response = await fetch('/api/admin/airdrop-summary', {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        setAirdropSummary(data.airdropSummaryPost);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate airdrop summary');
      }
    } catch (error) {
      console.error('Error generating Airdrop summary:', error);
      setAirdropSummary(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAirdropLoading(false);
    }
  };

  const copyAirdropToClipboard = () => {
    if (airdropSummary) {
      navigator.clipboard.writeText(airdropSummary);
      setEmailStatus('📋 Airdrop summary copied to clipboard!');
    }
  };

  const generateWeatherLottoSummary = async () => {
    setWeatherLottoLoading(true);
    setWeatherLottoSummary('');

    try {
      const response = await fetch('/api/admin/weather-lotto-summary', {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        setWeatherLottoSummary(data.weatherLottoSummaryPost);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate weather lotto summary');
      }
    } catch (error) {
      console.error('Error generating Weather Lotto summary:', error);
      setWeatherLottoSummary(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setWeatherLottoLoading(false);
    }
  };

  const copyWeatherLottoToClipboard = () => {
    if (weatherLottoSummary) {
      navigator.clipboard.writeText(weatherLottoSummary);
      setEmailStatus('📋 Weather Lotto summary copied to clipboard!');
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white text-center mb-2">🔐 Admin Panel</h1>
          <p className="text-purple-300 text-center">System Statistics & Promotion Management</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 flex justify-center">
          <div className="bg-[#23283a] rounded-lg p-1 flex gap-1">
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'stats'
                ? 'bg-purple-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
            >
              <FiBarChart className="inline mr-2" size={16} />
              Statistics
            </button>
            <button
              onClick={() => setActiveTab('promos')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'promos'
                ? 'bg-purple-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
            >
              <FiShare2 className="inline mr-2" size={16} />
              Shareable Promos
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'comments'
                ? 'bg-purple-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
            >
              <FiMessageSquare className="inline mr-2" size={16} />
              Pending Comments
            </button>
            <button
              onClick={() => setActiveTab('follows')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'follows'
                ? 'bg-purple-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
            >
              <FiUsers className="inline mr-2" size={16} />
              Pending Follows
            </button>
            <button
              onClick={() => setActiveTab('emails')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'emails'
                ? 'bg-purple-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
            >
              <FiMail className="inline mr-2" size={16} />
              Send Emails
            </button>
            <button
              onClick={() => setActiveTab('daily_code')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'daily_code'
                ? 'bg-purple-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
            >
              <FiGift className="inline mr-2" size={16} />
              Daily Code
            </button>
          </div>
        </div>

        {/* Daily Code Tab */}
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
              <p className="mt-4 text-sm text-gray-400 mb-6">
                Generating a new code will automatically deactivate the previous one.
              </p>

              {dailyCode && (
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
              )}
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && stats && (
          <div className="space-y-6">
            {/* Fő statisztikák */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">{stats.totalPromotions}</div>
                <div className="text-sm text-gray-300">Total Promotions</div>
              </div>
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{stats.activePromotions}</div>
                <div className="text-sm text-gray-300">Active Promotions</div>
              </div>
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">{stats.totalShares}</div>
                <div className="text-sm text-gray-300">Total Shares</div>
              </div>
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">{stats.totalRewards}</div>
                <div className="text-sm text-gray-300">Total Rewards</div>
              </div>
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-pink-400">{stats.totalUsers}</div>
                <div className="text-sm text-gray-300">Total Users</div>
              </div>
            </div>

            {/* További statisztikák */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-400">{stats.pendingVerifications || 0}</div>
                <div className="text-sm text-gray-300">Pending Verifications</div>
              </div>
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-cyan-400">{stats.todayVerifications || 0}</div>
                <div className="text-sm text-gray-300">Today's Verifications</div>
              </div>
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-400">{stats.totalBudget || 0}</div>
                <div className="text-sm text-gray-300">Total Budget</div>
              </div>
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-emerald-400">{stats.remainingBudget || 0}</div>
                <div className="text-sm text-gray-300">Remaining Budget</div>
              </div>
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-indigo-400">{stats.avgReward || '0.00'}</div>
                <div className="text-sm text-gray-300">Avg Reward/Share</div>
              </div>
            </div>

            {/* Lottery Statisztikák */}
            {stats.lottery && (
              <>
                <div className="mt-8">
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    🎰 Lottery Statistics
                  </h2>
                </div>

                {/* Lottery fő statisztikák */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-400">{stats.lottery.totalRounds}</div>
                    <div className="text-sm text-gray-300">Total Rounds</div>
                  </div>
                  <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">{stats.lottery.activeRounds}</div>
                    <div className="text-sm text-gray-300">Active Rounds</div>
                  </div>
                  <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400">{stats.lottery.totalTicketsSold}</div>
                    <div className="text-sm text-gray-300">Tickets Sold</div>
                  </div>
                  <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-400">{stats.lottery.totalRevenue.toLocaleString()}</div>
                    <div className="text-sm text-gray-300">Total Revenue (CHESS)</div>
                  </div>
                  <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-pink-400">{stats.lottery.currentJackpot.toLocaleString()}</div>
                    <div className="text-sm text-gray-300">Current Jackpot</div>
                  </div>
                </div>

                {/* Lottery részletes statisztikák */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-400">{stats.lottery.totalWinners}</div>
                    <div className="text-sm text-gray-300">Total Winners</div>
                  </div>
                  <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-orange-400">{stats.lottery.totalPrizesDistributed.toLocaleString()}</div>
                    <div className="text-sm text-gray-300">Prizes Distributed</div>
                  </div>
                  <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-cyan-400">{stats.lottery.avgTicketsPerRound.toFixed(1)}</div>
                    <div className="text-sm text-gray-300">Avg Tickets/Round</div>
                  </div>
                  <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-indigo-400">{stats.lottery.completedRounds}</div>
                    <div className="text-sm text-gray-300">Completed Rounds</div>
                  </div>
                </div>

                {/* Legnépszerűbb számok */}
                {stats.lottery.mostPopularNumbers && stats.lottery.mostPopularNumbers.length > 0 && (
                  <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-6">
                    <h3 className="text-xl font-bold text-white mb-4">🔥 Most Popular Numbers</h3>
                    <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                      {stats.lottery.mostPopularNumbers.slice(0, 10).map((item, index) => (
                        <div key={item.number} className="text-center">
                          <div className="bg-purple-600 text-white rounded-lg p-2 font-bold text-lg">
                            {item.number}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">{item.count} tickets</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top nyertesek */}
                {stats.lottery.topWinners && stats.lottery.topWinners.length > 0 && (
                  <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-6">
                    <h3 className="text-xl font-bold text-white mb-4">🏆 Top Winners</h3>
                    <div className="space-y-2">
                      {stats.lottery.topWinners.slice(0, 5).map((winner, index) => (
                        <div key={winner.player_fid} className="flex justify-between items-center bg-gray-800/50 rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                            </div>
                            <div>
                              <div className="font-bold text-white">FID: {winner.player_fid}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-yellow-400">
                              {winner.total_winnings.toLocaleString()} CHESS
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* FarChess statisztikák */}
            {stats.farChess && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  ♟️ FarChess Statistics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="bg-[#23283a] border border-[#8b5a3c] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-amber-400">{stats.farChess.totalGames || 0}</div>
                    <div className="text-sm text-gray-300">Chess Games</div>
                  </div>
                  <div className="bg-[#23283a] border border-[#8b5a3c] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">{stats.farChess.activeGames || 0}</div>
                    <div className="text-sm text-gray-300">Active Games</div>
                  </div>
                  <div className="bg-[#23283a] border border-[#8b5a3c] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400">{stats.farChess.completedGames || 0}</div>
                    <div className="text-sm text-gray-300">Completed Games</div>
                  </div>
                  <div className="bg-[#23283a] border border-[#8b5a3c] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-rose-400">{stats.farChess.totalMoves || 0}</div>
                    <div className="text-sm text-gray-300">Total Moves</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#23283a] border border-[#8b5a3c] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-400">{stats.farChess.totalUsers || 0}</div>
                    <div className="text-sm text-gray-300">Chess Users</div>
                  </div>
                  <div className="bg-[#23283a] border border-[#8b5a3c] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-cyan-400">{stats.farChess.totalGamesPlayed || 0}</div>
                    <div className="text-sm text-gray-300">Games Played</div>
                  </div>
                  <div className="bg-[#23283a] border border-[#8b5a3c] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-emerald-400">{stats.farChess.totalGamesWon || 0}</div>
                    <div className="text-sm text-gray-300">Games Won</div>
                  </div>
                  <div className="bg-[#23283a] border border-[#8b5a3c] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-orange-400">{stats.farChess.totalPlayers || 0}</div>
                    <div className="text-sm text-gray-300">Unique Players</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Shareable Promos Tab */}
        {activeTab === 'promos' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Shareable Promotions</h2>
              <div className="flex gap-2">
                <button
                  onClick={fetchShareablePromos}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                >
                  <FiRefreshCw />
                  Refresh
                </button>
              </div>
            </div>

            {/* Bulk Actions */}
            {shareablePromos.length > 0 && (
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedPromos.size === shareablePromos.length && shareablePromos.length > 0}
                        onChange={selectedPromos.size === shareablePromos.length ? clearSelection : selectAllPromos}
                        className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-white text-sm">
                        {selectedPromos.size > 0 ? `${selectedPromos.size} selected` : 'Select All'}
                      </span>
                    </div>
                    {selectedPromos.size > 0 && (
                      <button
                        onClick={clearSelection}
                        className="text-gray-400 hover:text-white text-sm"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {selectedPromos.size > 0 && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleBulkStatusChange('active')}
                        disabled={bulkActionLoading}
                        className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm disabled:opacity-50"
                      >
                        <FiPlay size={12} />
                        Activate ({selectedPromos.size})
                      </button>
                      <button
                        onClick={() => handleBulkStatusChange('paused')}
                        disabled={bulkActionLoading}
                        className="flex items-center gap-1 px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm disabled:opacity-50"
                      >
                        <FiPause size={12} />
                        Pause ({selectedPromos.size})
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            {shareablePromos.map((promo) => (
              <div key={promo.id} className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={selectedPromos.has(promo.id)}
                    onChange={() => togglePromoSelection(promo.id)}
                    className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-white text-sm font-medium">#{promo.id}</span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${promo.status === 'active' ? 'bg-green-600 text-white' :
                    promo.status === 'paused' ? 'bg-yellow-600 text-white' :
                      'bg-red-600 text-white'
                    }`}>
                    {promo.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                  <div>
                    <div className="text-purple-300 text-xs font-semibold">Promoter</div>
                    <div className="text-cyan-400 font-medium">@{promo.author_username}</div>
                  </div>
                  <div>
                    <div className="text-purple-300 text-xs font-semibold">Type</div>
                    <div className="text-white capitalize">{promo.action_type}</div>
                  </div>
                  <div>
                    <div className="text-purple-300 text-xs font-semibold">Reward</div>
                    <div className="text-green-400 font-bold">{promo.reward_per_share} $CHESS</div>
                  </div>
                  <div>
                    <div className="text-purple-300 text-xs font-semibold">Budget</div>
                    <div className="text-white">{promo.remaining_budget}/{promo.total_budget}</div>
                  </div>
                  <div>
                    <div className="text-purple-300 text-xs font-semibold">Shares</div>
                    <div className="text-blue-400">{promo.shares_count}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(promo.cast_url)}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                    >
                      <FiCopy size={12} />
                      Copy URL
                    </button>
                  </div>
                </div>
                {/* Másolható szövegek */}
                <div className="mt-4 space-y-2">
                  <div className="text-purple-300 text-xs font-semibold">Cast URL (kattintható)</div>
                  <div
                    className="bg-[#1a1f2e] border border-gray-600 rounded p-3 cursor-pointer hover:bg-[#252b3d] transition-colors"
                    onClick={() => copyToClipboard(promo.cast_url)}
                  >
                    <div className="text-blue-400 text-sm break-all select-all">{promo.cast_url}</div>
                  </div>

                  <div className="text-purple-300 text-xs font-semibold">Share Text (másolható)</div>
                  <div
                    className="bg-[#1a1f2e] border border-gray-600 rounded p-3 cursor-pointer hover:bg-[#252b3d] transition-colors"
                    onClick={() => copyToClipboard(`🎯 @${promo.author_username} offers ${promo.reward_per_share} $CHESS for ${promo.action_type} (${promo.remaining_budget}/${promo.total_budget} budget left)! Join: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank`)}
                  >
                    <div className="text-green-400 text-sm select-all">
                      🎯 @{promo.author_username} offers {promo.reward_per_share} $CHESS for {promo.action_type} ({promo.remaining_budget}/{promo.total_budget} budget left)! Join: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}


        {/* Pending Comments Tab */}
        {activeTab === 'comments' && (
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white mb-2">💬 Pending Comments</h2>
              <p className="text-gray-300">Review and approve pending comment submissions</p>
            </div>
            <AdminPendingCommentsManager />
          </div>
        )}

        {/* Pending Follows Tab */}
        {activeTab === 'follows' && (
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white mb-2">👥 Pending Follows</h2>
              <p className="text-gray-300">Review and approve pending follow submissions</p>
            </div>
            <AdminPendingFollowsManager />
          </div>
        )}

        {/* Send Emails Tab */}
        {activeTab === 'emails' && (
          <div className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">📧 Send Email Notifications</h2>
              <p className="text-gray-300">Manually send lottery and weather lotto result emails</p>
            </div>

            {/* Email Status */}
            {emailStatus && (
              <div className={`p-4 rounded-lg border ${emailStatus.includes('✅')
                ? 'bg-green-900/20 border-green-500/30 text-green-200'
                : 'bg-red-900/20 border-red-500/30 text-red-200'
                }`}>
                {emailStatus}
              </div>
            )}

            {/* Email Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Lambo Lottery Email */}
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-6">
                <div className="text-center">
                  <div className="text-4xl mb-4">🏁</div>
                  <h3 className="text-xl font-bold text-white mb-2">Lambo Lottery Results</h3>
                  <p className="text-gray-300 mb-4">
                    Send the latest Lambo Lottery draw results with random emojis and formatting
                  </p>
                  <button
                    onClick={sendLamboLotteryEmail}
                    disabled={emailLoading}
                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {emailLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <FiRefreshCw className="animate-spin" size={16} />
                        Sending...
                      </div>
                    ) : (
                      'Send Lambo Lottery Email'
                    )}
                  </button>
                </div>
              </div>

              {/* Weather Lotto Email */}
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-6">
                <div className="text-center">
                  <div className="text-4xl mb-4">🌤️</div>
                  <h3 className="text-xl font-bold text-white mb-2">Weather Lotto</h3>
                  <p className="text-gray-300 mb-4">
                    Send Weather Lotto results and generate summary post
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={sendWeatherLottoEmail}
                      disabled={emailLoading}
                      className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {emailLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <FiRefreshCw className="animate-spin" size={16} />
                          Sending...
                        </div>
                      ) : (
                        'Send Weather Lotto Email'
                      )}
                    </button>
                    <button
                      onClick={generateWeatherLottoSummary}
                      disabled={weatherLottoLoading}
                      className="w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {weatherLottoLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <FiRefreshCw className="animate-spin" size={16} />
                          Generating...
                        </div>
                      ) : (
                        'Generate Summary Post'
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Share & Earn Summary */}
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-6">
                <div className="text-center">
                  <div className="text-4xl mb-4">📊</div>
                  <h3 className="text-xl font-bold text-white mb-2">Share & Earn Summary</h3>
                  <p className="text-gray-300 mb-4">
                    Generate shareable post with community statistics
                  </p>
                  <button
                    onClick={generateShareEarnSummary}
                    disabled={summaryLoading}
                    className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {summaryLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <FiRefreshCw className="animate-spin" size={16} />
                        Generating...
                      </div>
                    ) : (
                      'Generate Summary Post'
                    )}
                  </button>
                </div>
              </div>

              {/* Airdrop Summary */}
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-6">
                <div className="text-center">
                  <div className="text-4xl mb-4">🎁</div>
                  <h3 className="text-xl font-bold text-white mb-2">Airdrop Summary</h3>
                  <p className="text-gray-300 mb-4">
                    Generate post about airdrops and CHESS holding benefits
                  </p>
                  <button
                    onClick={generateAirdropSummary}
                    disabled={airdropLoading}
                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {airdropLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <FiRefreshCw className="animate-spin" size={16} />
                        Generating...
                      </div>
                    ) : (
                      'Generate Airdrop Post'
                    )}
                  </button>
                </div>
              </div>

            </div>

            {/* Summary Post Display */}
            {summaryPost && (
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">📊 Generated Summary Post</h3>
                  <button
                    onClick={copySummaryToClipboard}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <FiCopy size={16} />
                    Copy to Clipboard
                  </button>
                </div>
                <div className="bg-[#1a1f2e] border border-gray-600 rounded p-4">
                  <pre className="text-green-400 text-sm whitespace-pre-wrap font-mono select-all">
                    {summaryPost}
                  </pre>
                </div>
              </div>
            )}

            {/* Airdrop Summary Display */}
            {airdropSummary && (
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">🎁 Generated Airdrop Post</h3>
                  <button
                    onClick={copyAirdropToClipboard}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <FiCopy size={16} />
                    Copy to Clipboard
                  </button>
                </div>
                <div className="bg-[#1a1f2e] border border-gray-600 rounded p-4">
                  <pre className="text-green-400 text-sm whitespace-pre-wrap font-mono select-all">
                    {airdropSummary}
                  </pre>
                </div>
              </div>
            )}

            {/* Weather Lotto Summary Display */}
            {weatherLottoSummary && (
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">🌤️ Generated Weather Lotto Post</h3>
                  <button
                    onClick={copyWeatherLottoToClipboard}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <FiCopy size={16} />
                    Copy to Clipboard
                  </button>
                </div>
                <div className="bg-[#1a1f2e] border border-gray-600 rounded p-4">
                  <pre className="text-green-400 text-sm whitespace-pre-wrap font-mono select-all">
                    {weatherLottoSummary}
                  </pre>
                </div>
              </div>
            )}


            {/* Instructions */}
            <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-3">📋 Instructions</h3>
              <div className="space-y-2 text-gray-300">
                <p>• <strong>Lambo Lottery:</strong> Sends the latest draw results with dynamic formatting and random emojis</p>
                <p>• <strong>Weather Lotto:</strong> Triggers a new draw, sends results via email, and generates summary post</p>
                <p>• <strong>Share & Earn Summary:</strong> Generates a shareable post with community statistics</p>
                <p>• <strong>Airdrop Summary:</strong> Generates a post about airdrops and CHESS holding benefits</p>
                <p>• All content can be copied and posted directly to social media</p>
                <p>• Emails are sent to the configured admin email address</p>
              </div>
            </div>
          </div>
        )}


        <div className="mt-8 text-center">
          <a
            href="/promote"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            ← Back to Promotions
          </a>
        </div>
      </div>
    </div>
  );
}