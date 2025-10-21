'use client';

import { useState, useEffect } from 'react';
import { FiUsers, FiAward, FiDollarSign, FiCheckCircle, FiRefreshCw, FiArrowLeft } from 'react-icons/fi';

interface Season {
  id: number;
  name: string;
  total_rewards: string;
  status: string;
  created_at: string;
  end_date: string;
}

interface DistributionUser {
  rank: number;
  user_fid: number;
  points: number;
  percentage: number;
  reward_amount: number;
  reward_amount_formatted: string;
}

interface DistributionResult {
  season_id: number;
  total_reward_amount: number;
  total_users: number;
  total_points: number;
  distributed_amount: number;
  remaining_amount: number;
  distribution: DistributionUser[];
}

export default function AirdropPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [distribution, setDistribution] = useState<DistributionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  
  // Test mode states
  const [testAmount, setTestAmount] = useState(10000000); // 10M CHESS tokens

  useEffect(() => {
    fetchSeasons();
  }, []);

  // Update testAmount when season changes
  useEffect(() => {
    if (selectedSeason && seasons.length > 0) {
      const selectedSeasonData = seasons.find(s => s.id === selectedSeason);
      if (selectedSeasonData) {
        // total_rewards is already in CHESS tokens (not wei)
        const chessAmount = parseInt(selectedSeasonData.total_rewards);
        setTestAmount(chessAmount);
      }
    }
  }, [selectedSeason, seasons]);

  const fetchSeasons = async () => {
    try {
      const response = await fetch('/api/season/current');
      if (response.ok) {
        const data = await response.json();
        setSeasons(data.seasons || []);
        // Auto-select first season if none selected
        if (data.seasons && data.seasons.length > 0 && !selectedSeason) {
          setSelectedSeason(data.seasons[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch seasons:', error);
    }
  };

  const calculateDistribution = async () => {
    if (!selectedSeason) return;
    
    if (testAmount <= 0) {
      setMessage('❌ Please enter a valid test amount greater than 0');
      return;
    }

    setIsLoading(true);
    setMessage(null);
    
    try {
      // Always use test mode with 10M CHESS
      const response = await fetch('/api/season/test-airdrop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          testAmount: testAmount,
          testFids: [] // Empty array means all users
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Distribution data received:', data);
        setDistribution(data);
        setMessage(`✅ Distribution calculated for ${data.total_users || 0} users (${testAmount.toLocaleString()} CHESS)`);
      } else {
        const error = await response.json();
        setMessage(`❌ Error: ${error.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error calculating distribution: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };


  const selectedSeasonData = seasons.find(s => s.id === selectedSeason);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
            >
              <FiArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Homepage</span>
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-2">
              AppRank Airdrop Distribution
            </h1>
            <p className="text-sm text-gray-400">
              Manage and distribute season rewards proportionally
            </p>
          </div>
        </div>

        {/* Season Selection */}
        <div className="bg-gradient-to-r from-slate-800/50 to-purple-900/20 backdrop-blur-sm rounded-xl p-4 mb-4 border border-purple-500/20">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <FiAward className="text-purple-400 w-4 h-4" />
            Select Season
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {seasons.map((season) => (
              <div
                key={season.id}
                onClick={() => setSelectedSeason(season.id)}
                className={`group p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:scale-102 ${
                  selectedSeason === season.id
                    ? 'border-purple-500 bg-gradient-to-br from-purple-900/40 to-pink-900/20 shadow-md shadow-purple-500/25'
                    : 'border-gray-600/50 bg-slate-800/50 hover:border-purple-400/50 hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                    {season.name}
                  </h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    season.status === 'active' 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : season.status === 'completed'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                  }`}>
                    {season.status}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-purple-300">
                    💰 {parseInt(season.total_rewards).toLocaleString()} CHESS
                  </p>
                  <p className="text-xs text-gray-400">
                    📅 {new Date(season.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 10M CHESS Distribution Pool */}
        <div className="bg-gradient-to-r from-slate-800/50 to-blue-900/20 backdrop-blur-sm rounded-xl p-4 mb-4 border border-blue-500/20">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <FiDollarSign className="text-blue-400 w-4 h-4" />
            10M CHESS Distribution Pool
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                💰 Total CHESS Amount to Distribute
              </label>
              <div className="w-full px-3 py-2 bg-slate-700/50 border border-blue-500/30 rounded-lg text-white">
                <span className="text-2xl font-bold text-blue-400">{testAmount.toLocaleString()} CHESS</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Fixed 10M CHESS tokens for distribution</p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                📊 Distribution Method
              </label>
              <div className="w-full px-3 py-2 bg-slate-700/50 border border-green-500/30 rounded-lg text-white">
                <span className="text-lg font-bold text-green-400">Points-Based Proportional</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Based on user activity and engagement</p>
            </div>
          </div>
          
          <div className="mt-3 p-2 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-200 text-sm flex items-center gap-1">
              🎯 <strong>Distribution Ready:</strong> 10M CHESS tokens will be distributed proportionally based on user points.
            </p>
          </div>
        </div>

        {/* Actions */}
        {selectedSeason && (
          <div className="bg-gradient-to-r from-slate-800/50 to-green-900/20 backdrop-blur-sm rounded-xl p-4 mb-4 border border-green-500/20">
            <div className="flex justify-center">
              <button
                onClick={calculateDistribution}
                disabled={isLoading || !testAmount}
                className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 hover:scale-105 disabled:hover:scale-100 shadow-md hover:shadow-purple-500/25"
              >
                <FiRefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Calculating...' : `Calculate Distribution (${testAmount.toLocaleString()} CHESS)`}
              </button>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`p-3 rounded-lg mb-4 border ${
            message.includes('✅') || message.includes('🎉')
              ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30 text-green-200'
              : message.includes('❌')
              ? 'bg-gradient-to-r from-red-500/10 to-pink-500/10 border-red-500/30 text-red-200'
              : 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30 text-blue-200'
          }`}>
            <p className="text-sm font-medium text-center">{message}</p>
          </div>
        )}

        {/* Distribution Preview */}
        {distribution && distribution.total_users !== undefined && (
          <div className="bg-gradient-to-r from-slate-800/50 to-indigo-900/20 backdrop-blur-sm rounded-xl p-4 mb-4 border border-indigo-500/20">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FiUsers className="text-indigo-400 w-4 h-4" />
              User Rankings & 10M CHESS Distribution
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 p-3 rounded-lg border border-blue-500/30">
                <div className="flex items-center gap-2 mb-1">
                  <FiUsers className="text-blue-400 w-4 h-4" />
                  <span className="text-xs font-semibold text-gray-300">Total Users</span>
                </div>
                <div className="text-lg font-bold text-blue-300">{distribution.total_users}</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/10 p-3 rounded-lg border border-purple-500/30">
                <div className="flex items-center gap-2 mb-1">
                  <FiAward className="text-purple-400 w-4 h-4" />
                  <span className="text-xs font-semibold text-gray-300">Total Points</span>
                </div>
                <div className="text-lg font-bold text-purple-300">{distribution.total_points.toLocaleString()}</div>
              </div>
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 p-3 rounded-lg border border-green-500/30">
                <div className="flex items-center gap-2 mb-1">
                  <FiDollarSign className="text-green-400 w-4 h-4" />
                  <span className="text-xs font-semibold text-gray-300">Total Pool</span>
                </div>
                <div className="text-lg font-bold text-green-300">10M CHESS</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/10 p-3 rounded-lg border border-yellow-500/30">
                <div className="flex items-center gap-2 mb-1">
                  <FiCheckCircle className="text-yellow-400 w-4 h-4" />
                  <span className="text-xs font-semibold text-gray-300">Avg Reward</span>
                </div>
                <div className="text-lg font-bold text-yellow-300">
                  {distribution.total_users > 0 ? Math.round(testAmount / distribution.total_users).toLocaleString() : '0'} CHESS
                </div>
              </div>
            </div>

            {/* All Users Table */}
            <div className="overflow-x-auto max-h-96 rounded-lg border border-gray-600/30">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-700">
                  <tr className="border-b border-gray-600/50">
                    <th className="text-left py-2 px-2 text-gray-300 font-semibold">Rank</th>
                    <th className="text-left py-2 px-2 text-gray-300 font-semibold">FID</th>
                    <th className="text-right py-2 px-2 text-gray-300 font-semibold">Points</th>
                    <th className="text-right py-2 px-2 text-gray-300 font-semibold">%</th>
                    <th className="text-right py-2 px-2 text-gray-300 font-semibold">CHESS Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {distribution.distribution.map((user, index) => {
                    const getRankIcon = (rank: number) => {
                      if (rank === 1) return '🥇';
                      if (rank === 2) return '🥈';
                      if (rank === 3) return '🥉';
                      return `#${rank}`;
                    };

                    return (
                      <tr key={user.user_fid} className={`border-b border-gray-700/50 hover:bg-gradient-to-r hover:from-slate-700/30 hover:to-slate-600/30 transition-colors ${
                        index % 2 === 0 ? 'bg-slate-800/20' : 'bg-slate-800/10'
                      }`}>
                        <td className="py-2 px-2">
                          <span className="font-bold text-lg">
                            {getRankIcon(user.rank)}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-gray-300 font-medium">{user.user_fid}</td>
                        <td className="py-2 px-2 text-right text-white font-bold">{user.points.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right text-purple-300 font-semibold">{user.percentage.toFixed(2)}%</td>
                        <td className="py-2 px-2 text-right text-green-400 font-bold">{user.reward_amount_formatted}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {distribution.distribution.length > 50 && (
              <div className="mt-2 text-center">
                <p className="text-xs text-gray-400">
                  Showing all {distribution.distribution.length} users. Scroll to see more.
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}