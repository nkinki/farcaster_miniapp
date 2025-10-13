'use client';

import { useState, useEffect } from 'react';
import { FiClock, FiAward, FiAlertTriangle, FiCheckCircle, FiChevronDown, FiChevronUp } from 'react-icons/fi';

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
    if (seasonData.status === 'completed') return 'bg-green-500/20 border-green-500/50 text-green-300';
    if (isExpired) return 'bg-red-500/20 border-red-500/50 text-red-300';
    if (isExpiringSoon) return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300';
    return 'bg-blue-500/20 border-blue-500/50 text-blue-300';
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <div className={`${getStatusColor()} backdrop-blur-sm rounded-lg border mb-4`}>
      {/* Compact Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-black/10 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-sm font-bold text-white">{seasonData.name}</h3>
            <p className="text-xs opacity-80">{getStatusText()}</p>
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
          <div className="text-white">
            {isCollapsed ? <FiChevronDown className="w-4 h-4" /> : <FiChevronUp className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      {!isCollapsed && (
        <div className="px-3 pb-3 border-t border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mt-3">
            <div className="flex items-center gap-2">
              <FiAward className="text-purple-400 w-4 h-4" />
              <span className="text-gray-300">Rewards:</span>
              <span className="text-white font-semibold">
                {formatNumber(parseInt(seasonData.total_rewards))} CHESS
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <FiClock className="text-blue-400 w-4 h-4" />
              <span className="text-gray-300">Start:</span>
              <span className="text-white">{formatDate(seasonData.start_date)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <FiClock className="text-orange-400 w-4 h-4" />
              <span className="text-gray-300">End:</span>
              <span className="text-white">{formatDate(seasonData.end_date)}</span>
            </div>
          </div>

          {seasonData.status === 'active' && (
            <div className="mt-3 p-2 rounded bg-black/20">
              <p className="text-xs text-gray-300 text-center">
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
    </div>
  );
}
