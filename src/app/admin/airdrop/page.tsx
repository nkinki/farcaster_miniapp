'use client';

import { useState, useEffect } from 'react';
import { FiUsers, FiAward, FiDollarSign, FiCheckCircle, FiXCircle, FiRefreshCw } from 'react-icons/fi';

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
  const [isDistributing, setIsDistributing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [distributionResults, setDistributionResults] = useState<any>(null);
  
  // Test mode states
  const [testMode, setTestMode] = useState(true); // Always test mode
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
        const seasonRewards = parseInt(selectedSeasonData.total_rewards) / 1000000000000000000; // Convert from wei
        setTestAmount(seasonRewards);
      }
    }
  }, [selectedSeason, seasons]);

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

  const calculateDistribution = async () => {
    if (!selectedSeason) return;

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
        setDistribution(data);
        setMessage(`✅ Distribution calculated for ${data.total_users} users (Test: ${testAmount.toLocaleString()} CHESS)`);
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

  const distributeAirdrop = async (dryRun = false) => {
    if (!selectedSeason) return;

    setIsDistributing(true);
    setMessage(null);
    
    try {
      // Always use test mode (dry run)
      const response = await fetch('/api/season/distribute-airdrop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          seasonId: selectedSeason, 
          dryRun: true,
          testMode: true,
          testAmount: testAmount
        })
      });

      if (response.ok) {
        const data = await response.json();
        setDistributionResults(data);
        setMessage(`🧪 Test simulation completed: ${data.successful_distributions} would be successful, ${data.failed_distributions} would fail`);
      } else {
        const error = await response.json();
        setMessage(`❌ Error: ${error.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error distributing airdrop: ${error}`);
    } finally {
      setIsDistributing(false);
    }
  };

  const selectedSeasonData = seasons.find(s => s.id === selectedSeason);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🎯 Airdrop Distribution</h1>
          <p className="text-gray-400">Manage and distribute season rewards proportionally</p>
        </div>

        {/* Season Selection */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Select Season</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {seasons.map((season) => (
              <div
                key={season.id}
                onClick={() => setSelectedSeason(season.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedSeason === season.id
                    ? 'border-purple-500 bg-purple-900/20'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white">{season.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs ${
                    season.status === 'active' 
                      ? 'bg-green-900 text-green-300' 
                      : season.status === 'completed'
                      ? 'bg-blue-900 text-blue-300'
                      : 'bg-gray-900 text-gray-300'
                  }`}>
                    {season.status}
                  </span>
                </div>
                <p className="text-sm text-gray-400">
                  Rewards: {(parseInt(season.total_rewards) / 1000000000000000000).toFixed(0)} CHESS
                </p>
                <p className="text-xs text-gray-500">
                  Created: {new Date(season.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CHESS Amount Selection */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">CHESS Distribution Settings (Test Mode)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Total CHESS Amount to Distribute
              </label>
              <input
                type="number"
                value={testAmount}
                onChange={(e) => setTestAmount(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="1000000"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">Amount in CHESS tokens (follows season total_rewards)</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Filter by FIDs (Optional)
              </label>
              <input
                type="text"
                value={testFids}
                onChange={(e) => setTestFids(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="12345,67890,11111"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated FIDs (leave empty for all users)</p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-600 rounded-lg">
            <p className="text-sm text-yellow-300">
              🧪 <strong>Test Mode:</strong> No real transactions will be sent. This is for preview and testing only.
            </p>
          </div>
        </div>

        {/* Actions */}
        {selectedSeason && (
          <div className="bg-slate-800 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Actions</h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={calculateDistribution}
                disabled={isLoading || !testAmount}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <FiRefreshCw className={isLoading ? 'animate-spin' : ''} />
                {isLoading ? 'Calculating...' : `Calculate Distribution (${testAmount.toLocaleString()} CHESS)`}
              </button>
              
              <button
                onClick={() => distributeAirdrop(true)}
                disabled={isDistributing || !distribution}
                className="flex items-center gap-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <FiUsers />
                Preview Distribution
              </button>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.includes('✅') || message.includes('🎉')
              ? 'bg-green-900/20 border border-green-600 text-green-300'
              : message.includes('❌')
              ? 'bg-red-900/20 border border-red-600 text-red-300'
              : 'bg-blue-900/20 border border-blue-600 text-blue-300'
          }`}>
            {message}
          </div>
        )}

        {/* Distribution Preview */}
        {distribution && (
          <div className="bg-slate-800 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Distribution Preview</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-700 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FiUsers className="text-blue-400" />
                  <span className="text-sm text-gray-400">Total Users</span>
                </div>
                <div className="text-2xl font-bold text-white">{distribution.total_users}</div>
              </div>
              <div className="bg-slate-700 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FiAward className="text-purple-400" />
                  <span className="text-sm text-gray-400">Total Points</span>
                </div>
                <div className="text-2xl font-bold text-white">{distribution.total_points.toLocaleString()}</div>
              </div>
              <div className="bg-slate-700 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FiDollarSign className="text-green-400" />
                  <span className="text-sm text-gray-400">Total Rewards</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {(distribution.total_reward_amount / 1000000000000000000).toFixed(0)} CHESS
                </div>
              </div>
              <div className="bg-slate-700 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FiCheckCircle className="text-yellow-400" />
                  <span className="text-sm text-gray-400">Distributed</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {(distribution.distributed_amount / 1000000000000000000).toFixed(0)} CHESS
                </div>
              </div>
            </div>

            {/* All Users Table */}
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-800">
                  <tr className="border-b border-gray-600">
                    <th className="text-left py-2 text-gray-400">Rank</th>
                    <th className="text-left py-2 text-gray-400">FID</th>
                    <th className="text-right py-2 text-gray-400">Points</th>
                    <th className="text-right py-2 text-gray-400">Percentage</th>
                    <th className="text-right py-2 text-gray-400">CHESS Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {distribution.distribution.map((user) => (
                    <tr key={user.user_fid} className="border-b border-gray-700 hover:bg-slate-700/50">
                      <td className="py-2 text-white font-semibold">#{user.rank}</td>
                      <td className="py-2 text-white">{user.user_fid}</td>
                      <td className="py-2 text-right text-white">{user.points.toLocaleString()}</td>
                      <td className="py-2 text-right text-purple-400">{user.percentage.toFixed(4)}%</td>
                      <td className="py-2 text-right text-green-400 font-semibold">{user.reward_amount_formatted}</td>
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

        {/* Distribution Results */}
        {distributionResults && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Distribution Results</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-700 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FiCheckCircle className="text-green-400" />
                  <span className="text-sm text-gray-400">Successful</span>
                </div>
                <div className="text-2xl font-bold text-green-400">{distributionResults.successful_distributions}</div>
              </div>
              <div className="bg-slate-700 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FiXCircle className="text-red-400" />
                  <span className="text-sm text-gray-400">Failed</span>
                </div>
                <div className="text-2xl font-bold text-red-400">{distributionResults.failed_distributions}</div>
              </div>
              <div className="bg-slate-700 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FiUsers className="text-blue-400" />
                  <span className="text-sm text-gray-400">Total Users</span>
                </div>
                <div className="text-2xl font-bold text-white">{distributionResults.total_users}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
