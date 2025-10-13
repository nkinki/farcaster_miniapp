'use client';

import { useState, useEffect } from 'react';
import { FiPlay, FiSquare, FiPlus, FiRefreshCw, FiUsers, FiAward, FiCalendar, FiClock, FiAlertTriangle } from 'react-icons/fi';

interface Season {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  total_rewards: string;
  status: string;
  created_at: string;
}

export default function SeasonManagementPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  
  // New season form
  const [newSeasonName, setNewSeasonName] = useState('');
  const [newSeasonDuration, setNewSeasonDuration] = useState(30);
  const [newSeasonRewards, setNewSeasonRewards] = useState(10000000);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    fetchSeasons();
  }, []);

  // Check for expired seasons on load (info only)
  useEffect(() => {
    const checkExpiredSeasons = () => {
      const expiredSeasons = seasons.filter(season => isSeasonExpired(season));
      if (expiredSeasons.length > 0) {
        setMessage(`ℹ️ ${expiredSeasons.length} season(s) have reached their end date and are ready to be manually ended.`);
      }
    };

    if (seasons.length > 0) {
      checkExpiredSeasons();
    }
  }, [seasons]);

  // Countdown timer effect
  useEffect(() => {
    const updateCountdowns = () => {
      const now = new Date().getTime();
      const newTimeLeft: { [key: number]: string } = {};

      seasons.forEach((season) => {
        if (season.status === 'active') {
          const endTime = new Date(season.end_date).getTime();
          const timeDiff = endTime - now;

          if (timeDiff > 0) {
            const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

            if (days > 0) {
              newTimeLeft[season.id] = `${days}d ${hours}h ${minutes}m`;
            } else if (hours > 0) {
              newTimeLeft[season.id] = `${hours}h ${minutes}m ${seconds}s`;
            } else if (minutes > 0) {
              newTimeLeft[season.id] = `${minutes}m ${seconds}s`;
            } else {
              newTimeLeft[season.id] = `${seconds}s`;
            }
          } else {
            newTimeLeft[season.id] = 'EXPIRED';
          }
        }
      });

      setTimeLeft(newTimeLeft);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);

    return () => clearInterval(interval);
  }, [seasons]);

  const fetchSeasons = async () => {
    try {
      const response = await fetch('/api/season/current');
      if (response.ok) {
        const data = await response.json();
        setSeasons(data.seasons || []);
      }
    } catch (error) {
      console.error('Failed to fetch seasons:', error);
    }
  };

  const endSeason = async (seasonId: number) => {
    if (!confirm('Are you sure you want to end this season? This will distribute airdrops and create a new season.')) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/season/end-season', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          seasonId, 
          distributeAirdrop: true, 
          createNewSeason: true 
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ Season ended successfully! ${data.new_season ? `New season created: ${data.new_season.name}` : ''}`);
        await fetchSeasons();
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewSeason = async () => {
    if (!newSeasonName.trim()) {
      setMessage('❌ Season name is required');
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/season/create-new-season', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSeasonName,
          durationDays: newSeasonDuration,
          totalRewards: newSeasonRewards,
          status: 'active'
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ New season created: ${data.season.name}`);
        setNewSeasonName('');
        setShowCreateForm(false);
        await fetchSeasons();
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'completed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'upcoming': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const isSeasonExpired = (season: Season) => {
    const now = new Date().getTime();
    const endTime = new Date(season.end_date).getTime();
    return endTime <= now && season.status === 'active';
  };

  const isSeasonExpiringSoon = (season: Season) => {
    const now = new Date().getTime();
    const endTime = new Date(season.end_date).getTime();
    const timeDiff = endTime - now;
    const hoursLeft = timeDiff / (1000 * 60 * 60);
    return hoursLeft <= 24 && hoursLeft > 0 && season.status === 'active';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <FiCalendar className="text-purple-400" />
            Season Management
          </h1>
          <p className="text-gray-400">Manage seasons, distribute airdrops, and create new seasons</p>
          
          {/* Info Section */}
          <div className="mt-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-300 mb-2 flex items-center gap-2">
              <FiClock className="w-5 h-5" />
              Season Information
            </h3>
            <div className="text-sm text-gray-300 space-y-1">
              <p>• <span className="text-green-400">Green</span> - Season is active and running normally</p>
              <p>• <span className="text-yellow-400">Yellow</span> - Season is ending within 24 hours</p>
              <p>• <span className="text-red-400">Red</span> - Season has reached its end date and is ready to be manually ended</p>
              <p>• Seasons must be manually ended to distribute airdrops and create new seasons</p>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg mb-6 border ${
            message.includes('✅') 
              ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30 text-green-200'
              : 'bg-gradient-to-r from-red-500/10 to-pink-500/10 border-red-500/30 text-red-200'
          }`}>
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}

        {/* Create New Season Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" />
            Create New Season
          </button>
        </div>

        {/* Create Season Form */}
        {showCreateForm && (
          <div className="bg-gradient-to-r from-slate-800/50 to-indigo-900/20 backdrop-blur-sm rounded-xl p-6 mb-6 border border-indigo-500/20">
            <h3 className="text-lg font-bold text-white mb-4">Create New Season</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Season Name</label>
                <input
                  type="text"
                  value={newSeasonName}
                  onChange={(e) => setNewSeasonName(e.target.value)}
                  placeholder="e.g., Season 1, Summer 2024"
                  className="w-full px-3 py-2 bg-slate-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Duration (days)</label>
                <input
                  type="number"
                  value={newSeasonDuration}
                  onChange={(e) => setNewSeasonDuration(parseInt(e.target.value))}
                  min="1"
                  max="365"
                  className="w-full px-3 py-2 bg-slate-700/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Total Rewards (CHESS)</label>
                <input
                  type="number"
                  value={newSeasonRewards}
                  onChange={(e) => setNewSeasonRewards(parseInt(e.target.value))}
                  min="1000000"
                  step="1000000"
                  className="w-full px-3 py-2 bg-slate-700/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={createNewSeason}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiPlus className="w-4 h-4" />}
                Create Season
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Seasons List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {seasons.map((season) => {
            const expired = isSeasonExpired(season);
            const expiringSoon = isSeasonExpiringSoon(season);
            const countdown = timeLeft[season.id];
            
            return (
              <div key={season.id} className={`bg-gradient-to-br from-slate-800/50 to-slate-700/30 backdrop-blur-sm rounded-xl p-6 border ${
                expired 
                  ? 'border-red-500/50 bg-gradient-to-br from-red-900/20 to-slate-700/30' 
                  : expiringSoon 
                    ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-900/20 to-slate-700/30'
                    : 'border-slate-600/30'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">{season.name}</h3>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(season.status)}`}>
                      {season.status}
                    </span>
                    {season.status === 'active' && countdown && (
                      <span className={`text-xs font-bold ${
                        expired 
                          ? 'text-red-400' 
                          : expiringSoon 
                            ? 'text-yellow-400' 
                            : 'text-green-400'
                      }`}>
                        {expired ? 'EXPIRED' : countdown}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <FiAward className="text-purple-400 w-4 h-4" />
                    <span className="text-gray-300">Rewards:</span>
                    <span className="text-white font-semibold">{formatNumber(parseInt(season.total_rewards))} CHESS</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <FiCalendar className="text-blue-400 w-4 h-4" />
                    <span className="text-gray-300">Start:</span>
                    <span className="text-white">{formatDate(season.start_date)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <FiCalendar className="text-orange-400 w-4 h-4" />
                    <span className="text-gray-300">End:</span>
                    <span className="text-white">{formatDate(season.end_date)}</span>
                  </div>

                  {season.status === 'active' && (
                    <div className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
                      expired 
                        ? 'bg-red-500/20 text-red-300' 
                        : expiringSoon 
                          ? 'bg-yellow-500/20 text-yellow-300'
                          : 'bg-green-500/20 text-green-300'
                    }`}>
                      <FiClock className="w-4 h-4" />
                      <span className="font-semibold">
                        {expired ? 'Ready to end season' : expiringSoon ? 'Ending soon!' : 'Time remaining:'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {season.status === 'active' && (
                    <button
                      onClick={() => endSeason(season.id)}
                      disabled={isLoading}
                      className={`flex-1 px-3 py-2 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-semibold ${
                        expired 
                          ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                          : expiringSoon
                            ? 'bg-yellow-600 hover:bg-yellow-700'
                            : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {isLoading ? (
                        <FiRefreshCw className="w-4 h-4 animate-spin" />
                      ) : expired ? (
                        <>
                          <FiAlertTriangle className="w-4 h-4" />
                          Ready to End
                        </>
                      ) : (
                        <>
                          <FiSquare className="w-4 h-4" />
                          End Season
                        </>
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={() => window.open(`/admin/airdrop?season=${season.id}`, '_blank')}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm"
                  >
                    <FiUsers className="w-4 h-4" />
                    Airdrop
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {seasons.length === 0 && (
          <div className="text-center py-12">
            <FiCalendar className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No seasons found</p>
            <p className="text-gray-500 text-sm">Create your first season to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
