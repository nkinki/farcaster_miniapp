"use client"

import { useState, useEffect } from "react";
import { FiX, FiCalendar, FiDollarSign, FiUsers, FiTrendingUp, FiGift, FiClock, FiCheckCircle, FiCreditCard, FiBarChart3 } from "react-icons/fi";
import { useAccount } from "wagmi";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { CHESS_TOKEN_ADDRESS, CHESS_TOKEN_ABI } from "@/abis/chessToken";

interface SeasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  userFid?: number;
}

interface SeasonData {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  total_rewards: string;
  status: string;
}

interface UserPoints {
  total_points: number;
  daily_checks: number;
  total_likes: number;
  total_recasts: number;
  total_quotes: number;
  total_shares: number;
  total_comments: number;
  total_lambo_tickets: number;
  total_weather_tickets: number;
  total_chess_points: number;
  last_activity: string;
}

export default function SeasonModal({ isOpen, onClose, userFid }: SeasonModalProps) {
  const [seasonData, setSeasonData] = useState<SeasonData | null>(null);
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isLoadingPoints, setIsLoadingPoints] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [checkResult, setCheckResult] = useState<{points: number} | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Wallet connection for CHESS balance
  const { address, isConnected } = useAccount();
  
  // CHESS token balance
  const { data: chessBalance, isLoading: balanceLoading } = useReadContract({
    address: CHESS_TOKEN_ADDRESS,
    abi: CHESS_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 10000, // Refresh every 10 seconds
    }
  });

  // Fetch season data
  useEffect(() => {
    if (isOpen && userFid) {
      fetchSeasonData();
      fetchUserPoints();
      fetchLeaderboard();
    }
  }, [isOpen, userFid]);

  const fetchSeasonData = async () => {
    try {
      const response = await fetch('/api/season/current');
      if (response.ok) {
        const data = await response.json();
        setSeasonData(data.season);
      }
    } catch (error) {
      console.error('Error fetching season data:', error);
    }
  };

  const fetchUserPoints = async () => {
    if (!userFid) return;
    
    setIsLoadingPoints(true);
    try {
      // Add a small delay for animation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await fetch(`/api/season/user-points?fid=${userFid}`);
      if (response.ok) {
        const data = await response.json();
        setUserPoints(data.points);
      }
    } catch (error) {
      console.error('Error fetching user points:', error);
    } finally {
      setIsLoadingPoints(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/season/leaderboard');
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const handleResetPoints = async () => {
    if (!userFid) {
      setError('User FID not available');
      return;
    }

    if (!confirm('⚠️ Are you sure you want to reset ALL your points? This cannot be undone!')) {
      return;
    }

    setIsResetting(true);
    setError(null);

    try {
      const response = await fetch('/api/season/reset-user-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_fid: userFid })
      });

      const result = await response.json();

      if (result.success) {
        setUserPoints(null);
        setLeaderboard([]);
        setCheckResult(null);
        alert('✅ All points reset successfully! You can start fresh now.');
      } else {
        setError(result.error || 'Reset failed');
      }
    } catch (err) {
      console.error('Reset error:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsResetting(false);
    }
  };

  const handleDailyCheck = async () => {
    if (!userFid) {
      setError('User FID not available');
      return;
    }

    setIsChecking(true);
    setError(null);
    setCheckResult(null);

    try {
      // Calculate CHESS points based on balance
      let chessPoints = 0;
      if (isConnected && address && chessBalance) {
        const balanceInCHESS = parseFloat(formatUnits(chessBalance, 18));
        // 1 point per 1,000,000 CHESS tokens (1M = 1 point)
        chessPoints = Math.floor(balanceInCHESS / 1000000);
      }

      const response = await fetch('/api/season/daily-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_fid: userFid,
          wallet_address: address,
          chess_balance: chessBalance?.toString() || '0',
          chess_points: chessPoints
        })
      });

      const result = await response.json();

      if (result.success) {
        setCheckResult({
          points: result.points_earned
        });
        await fetchUserPoints(); // Refresh points
      } else {
        setError(result.error || 'Daily check failed');
      }
    } catch (error) {
      console.error('Daily check error:', error);
      setError('Daily check failed');
    } finally {
      setIsChecking(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1f2e] rounded-2xl border border-[#a64d79] max-w-2xl w-full max-h-[90vh] overflow-y-auto pulse-glow">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <FiCalendar className="w-8 h-8 text-purple-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">Season 0</h2>
              <p className="text-sm text-gray-400">Active Season</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <FiX className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Wallet Status */}
          <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79] pulse-glow">
            <h3 className="text-lg font-bold text-cyan-400 mb-3 flex items-center gap-2">
              <FiCreditCard className="w-5 h-5" />
              Wallet Status
            </h3>
            
            {!isConnected ? (
              <div className="text-center py-4">
                <p className="text-gray-400 mb-2">Wallet not connected</p>
                <p className="text-xs text-gray-500">Connect your wallet to earn CHESS points</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-green-400 font-semibold">✅ Connected</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Address:</span>
                  <span className="text-white font-mono text-xs">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">CHESS Balance:</span>
                  <span className="text-yellow-400 font-semibold">
                    {balanceLoading ? (
                      <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : chessBalance ? (
                      `${parseFloat(formatUnits(chessBalance, 18)).toFixed(2)} CHESS`
                    ) : (
                      '0 CHESS'
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">CHESS Points:</span>
                  <span className="text-purple-400 font-semibold">
                    {chessBalance ? 
                      `${Math.floor(parseFloat(formatUnits(chessBalance, 18)) / 1000000)} pts` : 
                      '0 pts'
                    }
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Daily Check Section */}
          <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-4 border border-purple-400/50 pulse-glow">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <FiCheckCircle className="w-5 h-5 text-green-400" />
              Daily Check-in
            </h3>
            
            {!userFid ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">User not found</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <button
                    onClick={handleDailyCheck}
                    disabled={isChecking}
                    className={`px-8 py-4 text-lg font-bold rounded-xl transition-all duration-300 ${
                      isChecking
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {isChecking ? (
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Processing...</span>
                      </div>
                    ) : (
                      '✅ Daily Check'
                    )}
                  </button>
                </div>

                {checkResult && (
                  <div className="bg-green-900/30 border border-green-400/50 rounded-lg p-4 animate-slideIn">
                    <div className="text-center">
                      <div className="text-green-400 text-lg font-bold mb-2">
                        🎯 +{checkResult.points} points earned!
                      </div>
                      <div className="text-gray-300 text-sm">
                        🎯 Daily check completed successfully!
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-900/30 border border-red-400/50 rounded-lg p-4">
                    <div className="text-red-400 text-center">{error}</div>
                  </div>
                )}

                {/* Reset Points Button */}
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <button
                    onClick={handleResetPoints}
                    disabled={isResetting}
                    className={`w-full px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
                      isResetting
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {isResetting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Resetting...</span>
                      </div>
                    ) : (
                      '🗑️ Reset All Points'
                    )}
                  </button>
                  <p className="text-xs text-gray-400 text-center mt-1">
                    ⚠️ This will delete ALL your points permanently
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Points Summary */}
          {isLoadingPoints ? (
            <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79] pulse-glow">
              <h3 className="text-lg font-bold text-cyan-400 mb-3 flex items-center gap-2">
                <FiTrendingUp className="w-5 h-5" />
                Your Points
              </h3>
              <div className="flex items-center justify-center py-6">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-cyan-400 font-semibold text-sm">Loading your points...</span>
                </div>
              </div>
            </div>
          ) : userPoints && (
            <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79] pulse-glow">
              <h3 className="text-lg font-bold text-cyan-400 mb-3 flex items-center gap-2">
                <FiTrendingUp className="w-5 h-5" />
                Your Points
              </h3>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{userPoints.total_points}</div>
                  <div className="text-xs text-gray-400">Total Points</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{userPoints.daily_checks}</div>
                  <div className="text-xs text-gray-400">Daily Checks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{userPoints.total_chess_points}</div>
                  <div className="text-xs text-gray-400">CHESS Points</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Like/Recast:</span>
                  <span className="text-white">{userPoints.total_likes + userPoints.total_recasts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Quotes:</span>
                  <span className="text-white">{userPoints.total_quotes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Comments:</span>
                  <span className="text-white">{userPoints.total_comments}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Buy a Lambo:</span>
                  <span className="text-white">{userPoints.total_lambo_tickets}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Sunny/Rainy:</span>
                  <span className="text-white">{userPoints.total_weather_tickets}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">CHESS Holdings:</span>
                  <span className="text-purple-400 font-semibold">{userPoints.total_chess_points} pts (1M = 1pt)</span>
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79] pulse-glow">
              <h3 className="text-lg font-bold text-cyan-400 mb-3 flex items-center gap-2">
                <FiTrendingUp className="w-5 h-5" />
                All Players ({leaderboard.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {leaderboard.map((user, index) => (
                  <div key={user.user_fid} className={`flex justify-between items-center p-2 rounded-lg ${
                    user.user_fid === userFid ? 'bg-cyan-900/30 border border-cyan-400' : 'bg-gray-800/30'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 font-bold text-sm">#{index + 1}</span>
                      <span className="text-white text-sm">
                        {user.user_fid === userFid ? 'You' : `FID ${user.user_fid}`}
                      </span>
                    </div>
                    <span className="text-cyan-400 font-bold">{user.total_points} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Season Info */}
          {seasonData && (
            <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79] pulse-glow">
              <h3 className="text-lg font-bold text-purple-400 mb-3 flex items-center gap-2">
                <FiGift className="w-5 h-5" />
                Season Info
              </h3>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-green-400 font-semibold">{seasonData.status}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">End Date:</span>
                  <span className="text-white">
                    {new Date(seasonData.end_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  <button 
                    disabled
                    className="w-full px-3 py-2 bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed text-xs font-semibold"
                  >
                    Claim Rewards (Coming Soon)
                  </button>
                  <button 
                    onClick={() => window.open('/airdrop', '_blank')}
                    className="w-full px-3 py-2 bg-[#5D6AFF] hover:bg-[#5D6AFF]/80 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <FiBarChart3 className="w-4 h-4" />
                    View Stats
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          0% { 
            opacity: 0; 
            transform: translateY(-20px); 
          }
          100% { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        @keyframes pulseGlow {
          0% {
            box-shadow: 0 0 4px #a259ff, 0 0 8px #a259ff, 0 0 16px #a259ff;
            filter: brightness(1.05) saturate(1.1);
          }
          50% {
            box-shadow: 0 0 8px #a259ff, 0 0 16px #a259ff, 0 0 24px #a259ff;
            filter: brightness(1.1) saturate(1.2);
          }
          100% {
            box-shadow: 0 0 4px #a259ff, 0 0 8px #a259ff, 0 0 16px #a259ff;
            filter: brightness(1.05) saturate(1.1);
          }
        }
        .animate-slideIn {
          animation: slideIn 0.5s ease-out;
        }
        .pulse-glow {
          animation: pulseGlow 3.5s ease-in-out infinite;
          border: 2px solid #a259ff;
        }
      `}</style>
    </div>
  );
}

