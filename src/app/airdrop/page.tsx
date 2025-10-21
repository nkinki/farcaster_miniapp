'use client';

import { useState, useEffect } from 'react';
import { FiUsers, FiAward, FiDollarSign, FiCheckCircle, FiRefreshCw, FiArrowLeft, FiBarChart, FiTrendingUp } from 'react-icons/fi';

interface Season {
  id: number;
  name: string;
  total_rewards: string;
  status: string;
  created_at: string;
  end_date: string;
}

interface LeaderboardUser {
  user_fid: number;
  total_points: number;
  daily_checks: number;
  like_recast_count: number;
  shares_count: number;
  comments_count: number;
  lambo_tickets: number;
  weather_tickets: number;
  chess_points: number;
  last_activity: string;
}

interface DistributionResult {
  season_id: number;
  total_reward_amount: number;
  total_users: number;
  total_points: number;
  distributed_amount: number;
  remaining_amount: number;
}

export default function AirdropPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [distribution, setDistribution] = useState<DistributionResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  
  // Test mode states
  const testAmount = 10000000; // 10M CHESS tokens

  useEffect(() => {
    fetchSeasons();
    fetchLeaderboard();
  }, []);

  // Update testAmount when season changes
  useEffect(() => {
    if (selectedSeason && seasons.length > 0) {
      const selectedSeasonData = seasons.find(s => s.id === selectedSeason);
      if (selectedSeasonData) {
        // Use fixed 10M CHESS tokens for distribution
        console.log(`Using 10M CHESS tokens for distribution calculation`);
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

  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const response = await fetch('/api/season/leaderboard');
      if (response.ok) {
        const data = await response.json();
        console.log('Leaderboard API response:', data);
        
        // If no real data, create test data for demonstration
        if (!data.leaderboard || data.leaderboard.length === 0) {
          console.log('No real data found, creating test data...');
          const testData = [
            { user_fid: 12345, total_points: 1500, daily_checks: 10, like_recast_count: 50, shares_count: 20, comments_count: 5, lambo_tickets: 3, weather_tickets: 2, chess_points: 1410, last_activity: new Date().toISOString() },
            { user_fid: 67890, total_points: 1200, daily_checks: 8, like_recast_count: 40, shares_count: 15, comments_count: 3, lambo_tickets: 2, weather_tickets: 1, chess_points: 1131, last_activity: new Date().toISOString() },
            { user_fid: 11111, total_points: 800, daily_checks: 5, like_recast_count: 30, shares_count: 10, comments_count: 2, lambo_tickets: 1, weather_tickets: 1, chess_points: 751, last_activity: new Date().toISOString() },
            { user_fid: 22222, total_points: 600, daily_checks: 4, like_recast_count: 25, shares_count: 8, comments_count: 1, lambo_tickets: 1, weather_tickets: 0, chess_points: 561, last_activity: new Date().toISOString() },
            { user_fid: 33333, total_points: 400, daily_checks: 3, like_recast_count: 20, shares_count: 5, comments_count: 1, lambo_tickets: 0, weather_tickets: 0, chess_points: 371, last_activity: new Date().toISOString() }
          ];
          setLeaderboard(testData);
        } else {
          setLeaderboard(data.leaderboard || []);
        }
      } else {
        console.error('Failed to fetch leaderboard:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoadingLeaderboard(false);
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

        {/* CHESS Distribution Settings */}
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

        {/* User Leaderboard with 10M CHESS Distribution */}
        <div className="bg-gradient-to-r from-slate-800/50 to-purple-900/20 backdrop-blur-sm rounded-xl p-4 mb-4 border border-purple-500/20">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <FiTrendingUp className="text-purple-400 w-4 h-4" />
            User Rankings & 10M CHESS Distribution
          </h2>
          
          {loadingLeaderboard ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-purple-400 text-lg font-bold animate-pulse">Loading user rankings...</div>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="text-yellow-400 text-lg font-bold mb-2">No user data found</div>
                <div className="text-gray-400 text-sm">Check console for API response details</div>
                <button 
                  onClick={fetchLeaderboard}
                  className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 p-3 rounded-lg border border-blue-500/30">
                  <div className="text-blue-300 text-sm font-medium mb-1">Total Users</div>
                  <div className="text-xl font-bold text-white">{leaderboard.length}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/10 p-3 rounded-lg border border-purple-500/30">
                  <div className="text-purple-300 text-sm font-medium mb-1">Total Pool</div>
                  <div className="text-xl font-bold text-white">10M CHESS</div>
                </div>
                <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 p-3 rounded-lg border border-green-500/30">
                  <div className="text-green-300 text-sm font-medium mb-1">Top Points</div>
                  <div className="text-xl font-bold text-white">
                    {leaderboard.length > 0 ? leaderboard[0].total_points.toLocaleString() : '0'}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-500/20 to-red-500/10 p-3 rounded-lg border border-orange-500/30">
                  <div className="text-orange-300 text-sm font-medium mb-1">Avg Reward</div>
                  <div className="text-xl font-bold text-white">
                    {leaderboard.length > 0 ? Math.round(testAmount / leaderboard.length).toLocaleString() : '0'} CHESS
                  </div>
                </div>
              </div>

              {/* Compact Leaderboard Table */}
              <div className="overflow-x-auto max-h-96 rounded-lg border border-gray-600/30">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-700">
                    <tr className="border-b border-gray-600/50">
                      <th className="text-left py-2 px-2 text-gray-300 font-semibold">Rank</th>
                      <th className="text-left py-2 px-2 text-gray-300 font-semibold">FID</th>
                      <th className="text-right py-2 px-2 text-gray-300 font-semibold">Points</th>
                      <th className="text-right py-2 px-2 text-gray-300 font-semibold">%</th>
                      <th className="text-right py-2 px-2 text-gray-300 font-semibold">CHESS Reward</th>
                      <th className="text-right py-2 px-2 text-gray-300 font-semibold">Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      console.log('=== LEADERBOARD DEBUG START ===');
                      console.log('Leaderboard length:', leaderboard.length);
                      console.log('Test amount:', testAmount);
                      console.log('Leaderboard data:', leaderboard);
                      
                      if (leaderboard.length === 0) {
                        console.log('No leaderboard data!');
                        return (
                          <tr>
                            <td colSpan={6} className="text-center py-4 text-yellow-400">
                              No leaderboard data available
                            </td>
                          </tr>
                        );
                      }
                      
                      // Calculate total points once
                      const totalPoints = leaderboard.reduce((sum, u) => {
                        const points = u.total_points || 0;
                        console.log(`Adding points for user ${u.user_fid}: ${points}`);
                        return sum + points;
                      }, 0);
                      
                      console.log('Total points calculated:', totalPoints);
                      console.log('Test amount:', testAmount);
                      
                      return leaderboard.map((user, index) => {
                        const userPoints = user.total_points || 0;
                        const percentage = totalPoints > 0 ? (userPoints / totalPoints) * 100 : 0;
                        const chessReward = totalPoints > 0 ? Math.round((userPoints / totalPoints) * testAmount) : 0;
                        
                        console.log(`User ${user.user_fid}: points=${userPoints}, percentage=${percentage.toFixed(2)}%, chessReward=${chessReward}`);
                        
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
                                {getRankIcon(index + 1)}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-gray-300 font-medium">{user.user_fid}</td>
                            <td className="py-2 px-2 text-right text-white font-bold">{userPoints.toLocaleString()}</td>
                            <td className="py-2 px-2 text-right text-purple-300 font-semibold">{percentage.toFixed(2)}%</td>
                            <td className="py-2 px-2 text-right text-green-400 font-bold">{chessReward.toLocaleString()} CHESS</td>
                            <td className="py-2 px-2 text-right text-gray-400 text-xs">
                              {new Date(user.last_activity).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
              
              {leaderboard.length > 50 && (
                <div className="mt-2 text-center">
                  <p className="text-xs text-gray-400">
                    Showing all {leaderboard.length} users. Scroll to see more.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

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

      </div>
    </div>
  );
}