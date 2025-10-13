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
          {/* Season Info - Ultra Compact */}
          <div className="text-center mt-2 mb-3">
            <div className="text-base font-bold text-white mb-1">{seasonData.name}</div>
            <div className="flex justify-center gap-3 text-xs">
              <span className="text-gray-400">{formatDate(seasonData.start_date)}</span>
              <span className="text-gray-500">-</span>
              <span className="text-gray-400">{formatDate(seasonData.end_date)}</span>
            </div>
            <div className="flex items-center justify-center gap-1 mt-1">
              <FiAward className="text-[#5D6AFF] w-3 h-3" />
              <span className="text-[#5D6AFF] font-semibold text-sm">
                {formatNumber(parseInt(seasonData.total_rewards))} CHESS
              </span>
            </div>
          </div>

          {/* Airdrop Button */}
          <div className="flex justify-center">
            <button
              onClick={() => window.open('/airdrop', '_blank')}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#5D6AFF]/20 border border-[#5D6AFF]/50 hover:bg-[#5D6AFF]/30 transition-colors"
              title="View Airdrop Distribution"
            >
              <FiGift className="w-3 h-3 text-[#5D6AFF]" />
              <span className="text-xs text-[#5D6AFF] font-medium">Airdrop</span>
            </button>
          </div>
        </div>
      )}

      </div>
    </>
  );
}
