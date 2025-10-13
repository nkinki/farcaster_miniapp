"use client"

import { useState, useEffect } from 'react';
import { FiBarChart, FiShare2, FiCopy, FiMessageSquare, FiRefreshCw, FiPlay, FiPause, FiUsers, FiAward, FiCalendar } from 'react-icons/fi';
import AdminPendingCommentsManager from '@/components/AdminPendingCommentsManager';
import AdminPendingFollowsManager from '@/components/AdminPendingFollowsManager';


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
    mostPopularNumbers: Array<{number: number, count: number}>;
    topWinners: Array<{player_fid: number, total_winnings: number}>;
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
  const [activeTab, setActiveTab] = useState<'stats' | 'promos' | 'comments' | 'follows' | 'airdrop'>('stats');
  const [selectedPromos, setSelectedPromos] = useState<Set<number>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  // Airdrop states
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);
  const [airdropMessage, setAirdropMessage] = useState<string | null>(null);

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

  const fetchSeasons = async () => {
    try {
      const response = await fetch('/api/season/current');
      if (response.ok) {
        const data = await response.json();
        setSeasons(data.seasons || []);
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
    }
  };


  useEffect(() => {
    fetchStats();
    fetchShareablePromos();
    fetchSeasons();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Airdrop functions
  const calculateDistribution = async () => {
    if (!selectedSeason) {
      setAirdropMessage('❌ Please select a season first');
      return;
    }

    setIsCalculating(true);
    setAirdropMessage(null);

    try {
      const response = await fetch('/api/season/manual-airdrop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: selectedSeason,
          distributeNow: false
        })
      });

      const data = await response.json();

      if (data.success) {
        setRecipients(data.distribution || []);
        setAirdropMessage(`✅ Distribution calculated for ${data.total_users} users based on points`);
      } else {
        setAirdropMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setAirdropMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCalculating(false);
    }
  };

  const distributeAirdrop = async () => {
    if (!selectedSeason) {
      setAirdropMessage('❌ Please select a season first');
      return;
    }

    setIsDistributing(true);
    setAirdropMessage(null);

    try {
      const response = await fetch('/api/season/manual-airdrop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: selectedSeason,
          distributeNow: true
        })
      });

      const data = await response.json();

      if (data.success) {
        setAirdropMessage(`✅ Airdrop distributed successfully! ${data.successful_distributions} distributions completed.`);
        setRecipients([]);
        fetchSeasons(); // Refresh seasons
      } else {
        setAirdropMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setAirdropMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDistributing(false);
    }
  };

  const calculateTotal = () => {
    return recipients.reduce((sum, recipient) => sum + parseFloat(recipient.reward_amount || '0'), 0);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
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
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'stats'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <FiBarChart className="inline mr-2" size={16} />
              Statistics
            </button>
            <button
              onClick={() => setActiveTab('promos')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'promos'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <FiShare2 className="inline mr-2" size={16} />
              Shareable Promos
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'comments'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <FiMessageSquare className="inline mr-2" size={16} />
              Pending Comments
            </button>
            <button
              onClick={() => setActiveTab('follows')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'follows'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <FiUsers className="inline mr-2" size={16} />
              Pending Follows
            </button>
            <button
              onClick={() => setActiveTab('airdrop')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'airdrop'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <FiAward className="inline mr-2" size={16} />
              Airdrop Distribution
            </button>
          </div>
        </div>

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
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    promo.status === 'active' ? 'bg-green-600 text-white' :
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

        {/* Airdrop Distribution Tab */}
        {activeTab === 'airdrop' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <FiAward className="text-purple-400" />
                Airdrop Distribution
              </h2>
              <p className="text-gray-300">Calculate and distribute season rewards based on user points</p>
            </div>

            {/* Message */}
            {airdropMessage && (
              <div className={`p-4 rounded-lg mb-6 border ${
                airdropMessage.includes('✅') 
                  ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30 text-green-200'
                  : 'bg-gradient-to-r from-red-500/10 to-pink-500/10 border-red-500/30 text-red-200'
              }`}>
                <p className="text-sm font-medium">{airdropMessage}</p>
              </div>
            )}

            {/* Season Selection */}
            <div className="bg-gradient-to-r from-slate-800/50 to-indigo-900/20 backdrop-blur-sm rounded-xl p-6 mb-6 border border-indigo-500/20">
              <h3 className="text-lg font-bold text-white mb-4">Select Season</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {seasons.map((season) => (
                  <div
                    key={season.id}
                    onClick={() => setSelectedSeason(season.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedSeason === season.id
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-gray-600 bg-slate-700/30 hover:border-purple-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-white">{season.name}</h4>
                      <span className={`px-2 py-1 rounded text-xs ${
                        season.status === 'completed' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {season.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">
                      Rewards: {formatNumber(parseInt(season.total_rewards))} CHESS
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculate Distribution */}
            {selectedSeason && (
              <div className="bg-gradient-to-r from-slate-800/50 to-indigo-900/20 backdrop-blur-sm rounded-xl p-6 mb-6 border border-indigo-500/20">
                <h3 className="text-lg font-bold text-white mb-4">Calculate Distribution</h3>
                <p className="text-gray-300 mb-4">
                  Calculate airdrop distribution based on user points for the selected season.
                </p>
                <button
                  onClick={calculateDistribution}
                  disabled={isCalculating}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isCalculating ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiAward className="w-4 h-4" />}
                  {isCalculating ? 'Calculating...' : 'Calculate Distribution Based on Points'}
                </button>
              </div>
            )}

            {/* Distribution Preview */}
            {recipients.length > 0 && (
              <div className="bg-gradient-to-r from-slate-800/50 to-indigo-900/20 backdrop-blur-sm rounded-xl p-6 mb-6 border border-indigo-500/20">
                <h3 className="text-lg font-bold text-white mb-4">Distribution Preview</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-white font-semibold">
                      Recipients ({recipients.length})
                    </h4>
                    <div className="text-lg font-bold text-purple-400">
                      Total: {formatNumber(calculateTotal())} CHESS
                    </div>
                  </div>
                  
                  {recipients.slice(0, 10).map((recipient, index) => (
                    <div key={index} className="p-4 bg-slate-700/30 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <span className="text-sm text-gray-400">FID:</span>
                          <span className="ml-2 text-white font-semibold">{recipient.user_fid}</span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-400">Points:</span>
                          <span className="ml-2 text-blue-400 font-semibold">{recipient.points}</span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-400">Percentage:</span>
                          <span className="ml-2 text-yellow-400 font-semibold">{recipient.percentage}%</span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-400">Reward:</span>
                          <span className="ml-2 text-green-400 font-semibold">{recipient.reward_amount_formatted}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {recipients.length > 10 && (
                    <div className="text-center text-gray-400 text-sm">
                      ... and {recipients.length - 10} more recipients
                    </div>
                  )}
                </div>

                {/* Distribute Button */}
                <div className="flex justify-center mt-6">
                  <button
                    onClick={distributeAirdrop}
                    disabled={isDistributing}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 flex items-center gap-3 text-lg font-semibold"
                  >
                    {isDistributing ? (
                      <FiRefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <FiAward className="w-5 h-5" />
                    )}
                    {isDistributing ? 'Distributing...' : `Distribute ${formatNumber(calculateTotal())} CHESS to ${recipients.length} Recipients`}
                  </button>
                </div>
              </div>
            )}
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