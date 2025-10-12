'use client';

import { useState, useEffect } from 'react';
import { FiUsers, FiAward, FiDollarSign, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';

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

export default function AirdropAdminPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [distribution, setDistribution] = useState<DistributionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  
  // Test mode states
  const [testAmount, setTestAmount] = useState(1000);
  const [testFids, setTestFids] = useState<string>('');

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
      // Always use test mode
      const fidsArray = testFids ? testFids.split(',').map(fid => parseInt(fid.trim())).filter(fid => !isNaN(fid)) : [];
      const response = await fetch('/api/season/test-airdrop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          testAmount: testAmount,
          testFids: fidsArray
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Distribution data received:', data);
        setDistribution(data);
        setMessage(`✅ Distribution calculated for ${data.total_users || 0} users (Test: ${testAmount.toLocaleString()} CHESS)`);
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
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-4">
            🎯 Airdrop Distribution
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Manage and distribute season rewards proportionally based on user activity
          </p>
        </div>

        {/* Season Selection */}
        <div className="bg-gradient-to-r from-slate-800/50 to-purple-900/20 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-purple-500/20">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <FiAward className="text-purple-400" />
            Select Season
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {seasons.map((season) => (
              <div
                key={season.id}
                onClick={() => setSelectedSeason(season.id)}
                className={`group p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                  selectedSeason === season.id
                    ? 'border-purple-500 bg-gradient-to-br from-purple-900/40 to-pink-900/20 shadow-lg shadow-purple-500/25'
                    : 'border-gray-600/50 bg-slate-800/50 hover:border-purple-400/50 hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                    {season.name}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    season.status === 'active' 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : season.status === 'completed'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                  }`}>
                    {season.status}
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-purple-300">
                    💰 {parseInt(season.total_rewards).toLocaleString()} CHESS
                  </p>
                  <p className="text-sm text-gray-400">
                    📅 {new Date(season.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CHESS Distribution Settings */}
        <div className="bg-gradient-to-r from-slate-800/50 to-blue-900/20 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-blue-500/20">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <FiDollarSign className="text-blue-400" />
            CHESS Distribution Settings
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="block text-lg font-semibold text-gray-300 mb-3">
                  💰 Total CHESS Amount to Distribute
                </label>
                <input
                  type="number"
                  value={testAmount}
                  onChange={(e) => setTestAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-blue-500/30 rounded-xl text-white text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all"
                  placeholder="1000000"
                  min="1"
                />
                <p className="text-sm text-gray-400 mt-2">Amount in CHESS tokens (follows season total_rewards)</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-lg font-semibold text-gray-300 mb-3">
                  👥 Filter by FIDs (Optional)
                </label>
                <input
                  type="text"
                  value={testFids}
                  onChange={(e) => setTestFids(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-blue-500/30 rounded-xl text-white text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all"
                  placeholder="12345,67890,11111"
                />
                <p className="text-sm text-gray-400 mt-2">Comma-separated FIDs (leave empty for all users)</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl">
            <p className="text-yellow-200 font-medium flex items-center gap-2">
              🧪 <strong>Test Mode:</strong> No real transactions will be sent. This is for preview and testing only.
            </p>
          </div>
        </div>

        {/* Actions */}
        {selectedSeason && (
          <div className="bg-gradient-to-r from-slate-800/50 to-green-900/20 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-green-500/20">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <FiRefreshCw className="text-green-400" />
              Actions
            </h2>
            <div className="flex justify-center">
              <button
                onClick={calculateDistribution}
                disabled={isLoading || !testAmount}
                className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white text-lg font-semibold rounded-xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100 shadow-lg hover:shadow-purple-500/25"
              >
                <FiRefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Calculating...' : `Calculate Distribution (${testAmount.toLocaleString()} CHESS)`}
              </button>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`p-6 rounded-2xl mb-8 border-2 ${
            message.includes('✅') || message.includes('🎉')
              ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30 text-green-200'
              : message.includes('❌')
              ? 'bg-gradient-to-r from-red-500/10 to-pink-500/10 border-red-500/30 text-red-200'
              : 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30 text-blue-200'
          }`}>
            <p className="text-lg font-medium text-center">{message}</p>
          </div>
        )}

        {/* Distribution Preview */}
        {distribution && distribution.total_users !== undefined && (
          <div className="bg-gradient-to-r from-slate-800/50 to-indigo-900/20 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-indigo-500/20">
            <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
              <FiUsers className="text-indigo-400" />
              Distribution Preview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 p-6 rounded-xl border border-blue-500/30">
                <div className="flex items-center gap-3 mb-3">
                  <FiUsers className="text-blue-400 w-6 h-6" />
                  <span className="text-lg font-semibold text-gray-300">Total Users</span>
                </div>
                <div className="text-3xl font-bold text-blue-300">{distribution.total_users}</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/10 p-6 rounded-xl border border-purple-500/30">
                <div className="flex items-center gap-3 mb-3">
                  <FiAward className="text-purple-400 w-6 h-6" />
                  <span className="text-lg font-semibold text-gray-300">Total Points</span>
                </div>
                <div className="text-3xl font-bold text-purple-300">{distribution.total_points.toLocaleString()}</div>
              </div>
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 p-6 rounded-xl border border-green-500/30">
                <div className="flex items-center gap-3 mb-3">
                  <FiDollarSign className="text-green-400 w-6 h-6" />
                  <span className="text-lg font-semibold text-gray-300">Total Rewards</span>
                </div>
                <div className="text-3xl font-bold text-green-300">
                  {distribution.total_reward_amount ? 
                    Math.floor(Number(BigInt(distribution.total_reward_amount)) / 1000000000000000000).toLocaleString() : 
                    '0'
                  } CHESS
                </div>
              </div>
              <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/10 p-6 rounded-xl border border-yellow-500/30">
                <div className="flex items-center gap-3 mb-3">
                  <FiCheckCircle className="text-yellow-400 w-6 h-6" />
                  <span className="text-lg font-semibold text-gray-300">Distributed</span>
                </div>
                <div className="text-3xl font-bold text-yellow-300">
                  {distribution.distributed_amount ? 
                    Math.floor(Number(BigInt(distribution.distributed_amount)) / 1000000000000000000).toLocaleString() : 
                    '0'
                  } CHESS
                </div>
              </div>
            </div>

            {/* All Users Table */}
            <div className="overflow-x-auto max-h-96 rounded-xl border border-gray-600/30">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-700">
                  <tr className="border-b border-gray-600/50">
                    <th className="text-left py-4 px-4 text-gray-300 font-semibold">Rank</th>
                    <th className="text-left py-4 px-4 text-gray-300 font-semibold">FID</th>
                    <th className="text-right py-4 px-4 text-gray-300 font-semibold">Points</th>
                    <th className="text-right py-4 px-4 text-gray-300 font-semibold">Percentage</th>
                    <th className="text-right py-4 px-4 text-gray-300 font-semibold">CHESS Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {distribution.distribution.map((user, index) => (
                    <tr key={user.user_fid} className={`border-b border-gray-700/50 hover:bg-gradient-to-r hover:from-slate-700/30 hover:to-slate-600/30 transition-colors ${
                      index % 2 === 0 ? 'bg-slate-800/20' : 'bg-slate-800/10'
                    }`}>
                      <td className="py-4 px-4 text-white font-bold">#{user.rank}</td>
                      <td className="py-4 px-4 text-gray-300 font-medium">{user.user_fid}</td>
                      <td className="py-4 px-4 text-right text-gray-300 font-medium">{user.points.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right text-purple-300 font-semibold">{user.percentage.toFixed(2)}%</td>
                      <td className="py-4 px-4 text-right text-green-400 font-bold">{user.reward_amount_formatted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {distribution.distribution.length > 50 && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-400">
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
