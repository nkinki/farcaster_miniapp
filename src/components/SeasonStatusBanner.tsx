'use client';

import { useState, useEffect } from 'react';
import { FiClock, FiAward, FiAlertTriangle, FiCheckCircle, FiChevronDown, FiChevronUp, FiGift } from 'react-icons/fi';

interface SeasonData {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  total_rewards: string;
  status: string;
}

interface SeasonStatusBannerProps {
  seasonData?: SeasonData;
}

export default function SeasonStatusBanner({ seasonData }: SeasonStatusBannerProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showAirdropModal, setShowAirdropModal] = useState(false);

  useEffect(() => {
    if (!seasonData || seasonData.status !== 'active') return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const endTime = new Date(seasonData.end_date).getTime();
      const timeDiff = endTime - now;

      if (timeDiff > 0) {
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h ${minutes}m`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        } else if (minutes > 0) {
          setTimeLeft(`${minutes}m ${seconds}s`);
        } else {
          setTimeLeft(`${seconds}s`);
        }

        // Check if expiring soon (within 24 hours)
        const hoursLeft = timeDiff / (1000 * 60 * 60);
        setIsExpiringSoon(hoursLeft <= 24);
        setIsExpired(false);
      } else {
        setTimeLeft('EXPIRED');
        setIsExpired(true);
        setIsExpiringSoon(false);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [seasonData]);

  // Auto-open airdrop modal when banner is expanded
  useEffect(() => {
    if (!isCollapsed && seasonData) {
      setShowAirdropModal(true);
    }
  }, [isCollapsed, seasonData]);

  if (!seasonData) return null;

  const getStatusColor = () => {
    if (seasonData.status === 'completed') return 'bg-[#23283a] border-green-500 text-green-300';
    if (isExpired) return 'bg-[#23283a] border-red-500 text-red-300';
    if (isExpiringSoon) return 'bg-[#23283a] border-yellow-400 text-yellow-300';
    return 'bg-[#23283a] border-[#5D6AFF] text-[#5D6AFF]';
  };

  const getStatusIcon = () => {
    if (seasonData.status === 'completed') return <FiCheckCircle className="w-4 h-4" />;
    if (isExpired) return <FiAlertTriangle className="w-4 h-4" />;
    if (isExpiringSoon) return <FiClock className="w-4 h-4" />;
    return <FiClock className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (seasonData.status === 'completed') return 'Completed';
    if (isExpired) return 'Ready to End';
    if (isExpiringSoon) return 'Ending Soon';
    return 'Active';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <>
      <style jsx>{`
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
        .pulse-glow {
          animation: pulseGlow 3.5s ease-in-out infinite;
          border: 2px solid #a259ff;
        }
      `}</style>
      <div className={`${getStatusColor()} backdrop-blur-sm rounded-lg border mb-4 shadow-lg hover:shadow-purple-500/25 transition-all duration-300 pulse-glow`}>
      {/* Compact Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-black/10 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-sm font-bold text-white">{seasonData.name}</h3>
            <p className="text-xs text-gray-400">{getStatusText()}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {seasonData.status === 'active' && timeLeft && (
            <div className="text-right">
              <div className="text-lg font-bold text-white">
                {timeLeft}
              </div>
            </div>
          )}
          <div className="text-gray-400">
            {isCollapsed ? <FiChevronDown className="w-4 h-4" /> : <FiChevronUp className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      {!isCollapsed && (
        <div className="px-3 pb-3 border-t border-white/10">
          {/* Season Info - Compact */}
          <div className="text-center mt-3 mb-4">
            <div className="text-lg font-bold text-white mb-2">{seasonData.name}</div>
            <div className="flex justify-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <FiClock className="text-[#5D6AFF] w-3 h-3" />
                <span className="text-gray-400">Start:</span>
                <span className="text-white">{formatDate(seasonData.start_date)}</span>
              </div>
              <div className="flex items-center gap-1">
                <FiClock className="text-[#5D6AFF] w-3 h-3" />
                <span className="text-gray-400">End:</span>
                <span className="text-white">{formatDate(seasonData.end_date)}</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <FiAward className="text-[#5D6AFF] w-4 h-4" />
              <span className="text-gray-400">Rewards:</span>
              <span className="text-[#5D6AFF] font-semibold">
                {formatNumber(parseInt(seasonData.total_rewards))} CHESS
              </span>
            </div>
          </div>

          {/* Airdrop Button */}
          <div className="flex justify-center">
            <button
              onClick={() => setShowAirdropModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5D6AFF]/20 border border-[#5D6AFF]/50 hover:bg-[#5D6AFF]/30 transition-colors"
              title="View Airdrop Distribution"
            >
              <FiGift className="w-4 h-4 text-[#5D6AFF]" />
              <span className="text-sm text-[#5D6AFF] font-medium">View Airdrop Distribution</span>
            </button>
          </div>

          {seasonData.status === 'active' && (
            <div className="mt-3 p-2 rounded bg-black/30">
              <p className="text-xs text-gray-400 text-center">
                {isExpired 
                  ? 'This season has reached its end date. Administrators will manually review and distribute rewards based on your participation.'
                  : isExpiringSoon
                    ? 'This season is ending soon! Make sure to complete your activities to earn points.'
                    : 'Keep participating to earn points and qualify for the manual reward distribution!'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Airdrop Modal */}
      {showAirdropModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#23283a] rounded-xl shadow-2xl border border-[#5D6AFF]/30 max-w-2xl w-full mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <FiGift className="w-6 h-6 text-[#5D6AFF]" />
                <h2 className="text-xl font-bold text-white">Airdrop Information</h2>
              </div>
              <button
                onClick={() => setShowAirdropModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-[#5D6AFF] to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiAward className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Season Airdrop</h3>
                <p className="text-gray-400">Rewards are distributed based on your participation points</p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg">
                  <span className="text-gray-400">Total Rewards:</span>
                  <span className="text-[#5D6AFF] font-bold">
                    {formatNumber(parseInt(seasonData?.total_rewards || '0'))} CHESS
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg">
                  <span className="text-gray-400">Distribution Method:</span>
                  <span className="text-white">Points-based</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-green-400">Manual Distribution</span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-400 mb-4">
                  Administrators will manually distribute rewards based on your participation points when the season ends.
                </p>
                <button
                  onClick={() => {
                    setShowAirdropModal(false);
                    window.open('/airdrop', '_blank');
                  }}
                  className="px-6 py-3 bg-[#5D6AFF] hover:bg-[#5D6AFF]/80 text-white font-medium rounded-lg transition-colors"
                >
                  View Full Airdrop Page
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
