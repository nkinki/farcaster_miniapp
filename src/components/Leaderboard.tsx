'use client';

import { useState, useEffect } from 'react';
import { FiUsers, FiAward, FiTrendingUp, FiClock, FiX } from 'react-icons/fi';

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

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Leaderboard({ isOpen, onClose }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/season/leaderboard');
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-orange-400';
    return 'text-white';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#23283a] rounded-xl shadow-lg p-6 max-w-4xl w-full h-[85vh] flex flex-col border border-purple-500/30">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <FiUsers className="text-purple-400 w-5 h-5" />
            <h2 className="text-xl font-bold text-white">User Leaderboard</h2>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 p-3 rounded-lg border border-blue-500/30">
            <div className="flex items-center gap-2 mb-1">
              <FiUsers className="text-blue-400 w-4 h-4" />
              <span className="text-xs font-semibold text-gray-300">Total Users</span>
            </div>
            <div className="text-lg font-bold text-blue-300">{leaderboard.length}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/10 p-3 rounded-lg border border-purple-500/30">
            <div className="flex items-center gap-2 mb-1">
              <FiAward className="text-purple-400 w-4 h-4" />
              <span className="text-xs font-semibold text-gray-300">Top Points</span>
            </div>
            <div className="text-lg font-bold text-purple-300">
              {leaderboard.length > 0 ? leaderboard[0].total_points.toLocaleString() : '0'}
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 p-3 rounded-lg border border-green-500/30">
            <div className="flex items-center gap-2 mb-1">
              <FiTrendingUp className="text-green-400 w-4 h-4" />
              <span className="text-xs font-semibold text-gray-300">Avg Points</span>
            </div>
            <div className="text-lg font-bold text-green-300">
              {leaderboard.length > 0 ? Math.round(leaderboard.reduce((sum, user) => sum + user.total_points, 0) / leaderboard.length).toLocaleString() : '0'}
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-500/20 to-red-500/10 p-3 rounded-lg border border-orange-500/30">
            <div className="flex items-center gap-2 mb-1">
              <FiClock className="text-orange-400 w-4 h-4" />
              <span className="text-xs font-semibold text-gray-300">Last Update</span>
            </div>
            <div className="text-sm font-bold text-orange-300">{new Date().toLocaleDateString()}</div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-purple-400 text-lg font-bold animate-pulse">Loading leaderboard...</div>
            </div>
          ) : (
            <div className="overflow-x-auto h-full rounded-lg border border-gray-600/30">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-700">
                  <tr className="border-b border-gray-600/50">
                    <th className="text-left py-3 px-3 text-gray-300 font-semibold">Rank</th>
                    <th className="text-left py-3 px-3 text-gray-300 font-semibold">FID</th>
                    <th className="text-right py-3 px-3 text-gray-300 font-semibold">Total Points</th>
                    <th className="text-right py-3 px-3 text-gray-300 font-semibold">Daily</th>
                    <th className="text-right py-3 px-3 text-gray-300 font-semibold">Likes</th>
                    <th className="text-right py-3 px-3 text-gray-300 font-semibold">Shares</th>
                    <th className="text-right py-3 px-3 text-gray-300 font-semibold">Tickets</th>
                    <th className="text-right py-3 px-3 text-gray-300 font-semibold">CHESS</th>
                    <th className="text-left py-3 px-3 text-gray-300 font-semibold">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((user, index) => (
                    <tr key={user.user_fid} className={`border-b border-gray-700/50 hover:bg-gradient-to-r hover:from-slate-700/30 hover:to-slate-600/30 transition-colors ${
                      index % 2 === 0 ? 'bg-slate-800/20' : 'bg-slate-800/10'
                    }`}>
                      <td className="py-3 px-3">
                        <span className={`font-bold text-lg ${getRankColor(index + 1)}`}>
                          {getRankIcon(index + 1)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-300 font-medium">{user.user_fid}</td>
                      <td className="py-3 px-3 text-right text-white font-bold">{user.total_points.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right text-green-400 font-medium">{user.daily_checks}</td>
                      <td className="py-3 px-3 text-right text-blue-400 font-medium">{user.like_recast_count}</td>
                      <td className="py-3 px-3 text-right text-purple-400 font-medium">{user.shares_count + user.comments_count}</td>
                      <td className="py-3 px-3 text-right text-yellow-400 font-medium">{user.lambo_tickets + user.weather_tickets}</td>
                      <td className="py-3 px-3 text-right text-cyan-400 font-medium">{user.chess_points}</td>
                      <td className="py-3 px-3 text-gray-400 text-xs">{formatDate(user.last_activity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-600/50">
          <div className="flex justify-between items-center text-xs text-gray-400">
            <span>Showing {leaderboard.length} active users</span>
            <span>Points calculated from daily checks, interactions, and activities</span>
          </div>
        </div>
      </div>
    </div>
  );
}
