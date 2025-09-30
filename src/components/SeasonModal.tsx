"use client"

import { useState, useEffect } from "react";
import { FiX, FiCalendar, FiDollarSign, FiUsers, FiTrendingUp, FiGift, FiClock, FiCheckCircle } from "react-icons/fi";
import { useAccount } from 'wagmi';
import { useReadContract } from 'wagmi';
import { CHESS_TOKEN_ADDRESS, CHESS_TOKEN_ABI } from '@/abis/chessToken';
import { formatUnits } from 'viem';

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
  const [isChecking, setIsChecking] = useState(false);
  const [isLoadingPoints, setIsLoadingPoints] = useState(false);
  const [checkResult, setCheckResult] = useState<{points: number, chessBalance: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { address, isConnected } = useAccount();
  
  // CHESS balance reading
  const { data: chessBalance } = useReadContract({
    address: CHESS_TOKEN_ADDRESS,
    abi: CHESS_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected
    }
  });

  // Fetch season data
  useEffect(() => {
    if (isOpen && userFid) {
      fetchSeasonData();
      fetchUserPoints();
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

  const handleDailyCheck = async () => {
    if (!userFid || !address) {
      setError('Please connect your wallet');
      return;
    }

    setIsChecking(true);
    setError(null);
    setCheckResult(null);

    try {
      const chessBalanceWei = chessBalance || BigInt(0);
      const chessBalanceFormatted = formatUnits(chessBalanceWei, 18);
      const chessPoints = Math.floor(Number(chessBalanceFormatted) / 1000000); // 1M CHESS = 1 point

      const response = await fetch('/api/season/daily-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_fid: userFid,
          chess_balance: chessBalanceWei.toString(),
          chess_points: chessPoints
        })
      });

      const result = await response.json();

      if (result.success) {
        setCheckResult({
          points: result.points_earned,
          chessBalance: chessBalanceFormatted
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
      <div className="bg-[#1a1f2e] rounded-2xl border border-[#a64d79] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <FiCalendar className="w-8 h-8 text-purple-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">Season 1</h2>
              <p className="text-sm text-gray-400">Under Development</p>
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
          {/* Daily Check Section */}
          <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-6 border border-purple-400/50">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FiCheckCircle className="w-6 h-6 text-green-400" />
              Daily Check-in
            </h3>
            
            {!isConnected ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">Connect your wallet to participate</p>
                <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors">
                  Connect Wallet
                </button>
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
                        <span>Checking CHESS balance...</span>
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
                        💰 {formatNumber(Number(checkResult.chessBalance))} CHESS detected
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-900/30 border border-red-400/50 rounded-lg p-4">
                    <div className="text-red-400 text-center">{error}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Points Summary */}
          {isLoadingPoints ? (
            <div className="bg-[#23283a] rounded-xl p-6 border border-[#a64d79]">
              <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                <FiTrendingUp className="w-6 h-6" />
                Your Points
              </h3>
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-cyan-400 font-semibold">Loading your points...</span>
                </div>
              </div>
            </div>
          ) : userPoints && (
            <div className="bg-[#23283a] rounded-xl p-6 border border-[#a64d79]">
              <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                <FiTrendingUp className="w-6 h-6" />
                Your Points
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-400">{userPoints.total_points}</div>
                  <div className="text-sm text-gray-400">Total Points</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">{userPoints.daily_checks}</div>
                  <div className="text-sm text-gray-400">Daily Checks</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
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
                  <span className="text-gray-400">CHESS Game:</span>
                  <span className="text-white">{userPoints.total_chess_points}</span>
                </div>
              </div>
            </div>
          )}

          {/* Season Info */}
          {seasonData && (
            <div className="bg-[#23283a] rounded-xl p-6 border border-[#a64d79]">
              <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                <FiGift className="w-6 h-6" />
                Season Info
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-green-400 font-semibold">{seasonData.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Rewards:</span>
                  <span className="text-yellow-400 font-semibold">
                    0 CHESS
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">End Date:</span>
                  <span className="text-white">
                    {new Date(seasonData.end_date).toLocaleDateString()}
                  </span>
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
        .animate-slideIn {
          animation: slideIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

