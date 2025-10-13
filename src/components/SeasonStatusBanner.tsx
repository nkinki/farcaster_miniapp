'use client';

import { useState, useEffect } from 'react';
import { FiClock, FiAward, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

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
    if (seasonData.status === 'completed') return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
    if (isExpired) return 'from-red-500/20 to-pink-500/20 border-red-500/30';
    if (isExpiringSoon) return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30';
    return 'from-blue-500/20 to-purple-500/20 border-blue-500/30';
  };

  const getStatusIcon = () => {
    if (seasonData.status === 'completed') return <FiCheckCircle className="w-5 h-5 text-green-400" />;
    if (isExpired) return <FiAlertTriangle className="w-5 h-5 text-red-400" />;
    if (isExpiringSoon) return <FiClock className="w-5 h-5 text-yellow-400" />;
    return <FiClock className="w-5 h-5 text-blue-400" />;
  };

  const getStatusText = () => {
    if (seasonData.status === 'completed') return 'Season Completed';
    if (isExpired) return 'Season Ready to End';
    if (isExpiringSoon) return 'Season Ending Soon';
    return 'Season Active';
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
    <div className={`bg-gradient-to-r ${getStatusColor()} backdrop-blur-sm rounded-xl p-4 border mb-6`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-lg font-bold text-white">{seasonData.name}</h3>
            <p className="text-sm text-gray-300">{getStatusText()}</p>
          </div>
        </div>
        
        {seasonData.status === 'active' && timeLeft && (
          <div className="text-right">
            <div className={`text-2xl font-bold ${
              isExpired ? 'text-red-400' : isExpiringSoon ? 'text-yellow-400' : 'text-green-400'
            }`}>
              {timeLeft}
            </div>
            <div className="text-xs text-gray-400">
              {isExpired ? 'Ready to end' : isExpiringSoon ? 'Ending soon' : 'Time remaining'}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
        <div className="mt-3 p-2 rounded-lg bg-black/20">
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
  );
}
