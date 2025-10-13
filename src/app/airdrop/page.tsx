'use client';

import { useState, useEffect } from 'react';
import { FiAward, FiRefreshCw, FiUsers, FiCalendar, FiClock, FiGift } from 'react-icons/fi';

interface Season {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  total_rewards: string;
  status: string;
}

interface Recipient {
  user_fid: number;
  points: number;
  percentage: number;
  reward_amount: string;
  reward_amount_formatted: string;
}

export default function AirdropPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    try {
      const response = await fetch('/api/season/current');
      if (response.ok) {
        const data = await response.json();
        setSeasons(data.seasons || []);
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
    }
  };

  const calculateDistribution = async () => {
    if (!selectedSeason) {
      setMessage('❌ Please select a season first');
      return;
    }

    setIsCalculating(true);
    setMessage(null);

    try {
      const response = await fetch('/api/season/manual-airdrop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: selectedSeason,
          distributeNow: false
        })
      });

      const data = await response.json();

      if (data.success) {
        setRecipients(data.distribution || []);
        setMessage(`✅ Distribution calculated for ${data.total_users} users based on points`);
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCalculating(false);
    }
  };

  const distributeAirdrop = async () => {
    if (!selectedSeason) {
      setMessage('❌ Please select a season first');
      return;
    }

    setIsDistributing(true);
    setMessage(null);

    try {
      const response = await fetch('/api/season/manual-airdrop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: selectedSeason,
          distributeNow: true
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ Airdrop distributed successfully! ${data.successful_distributions} distributions completed.`);
        setRecipients([]);
        fetchSeasons(); // Refresh seasons
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDistributing(false);
    }
  };

  const calculateTotal = () => {
    return recipients.reduce((sum, recipient) => sum + parseFloat(recipient.reward_amount || '0'), 0);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
            <FiAward className="text-purple-400" />
            AppRank Airdrop Distribution
          </h1>
          <p className="text-gray-300 text-lg">Manage and distribute season rewards proportionally</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg mb-6 border max-w-2xl mx-auto ${
            message.includes('✅') 
              ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30 text-green-200'
              : 'bg-gradient-to-r from-red-500/10 to-pink-500/10 border-red-500/30 text-red-200'
          }`}>
            <p className="text-sm font-medium text-center">{message}</p>
          </div>
        )}

        {/* Season Selection */}
        <div className="bg-gradient-to-r from-slate-800/50 to-indigo-900/20 backdrop-blur-sm rounded-xl p-6 mb-6 border border-indigo-500/20">
          <h3 className="text-xl font-bold text-white mb-6 text-center">Select Season</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {seasons.map((season) => (
              <div
                key={season.id}
                onClick={() => setSelectedSeason(season.id)}
                className={`p-6 rounded-lg border cursor-pointer transition-all ${
                  selectedSeason === season.id
                    ? 'border-purple-500 bg-purple-500/20 scale-105'
                    : 'border-gray-600 bg-slate-700/30 hover:border-purple-400 hover:scale-102'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-white">{season.name}</h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    season.status === 'completed' 
                      ? 'bg-green-500/20 text-green-400' 
                      : season.status === 'active'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {season.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <FiGift className="text-purple-400 w-4 h-4" />
                    <span className="text-gray-300">Rewards:</span>
                    <span className="text-white font-semibold">{formatNumber(parseInt(season.total_rewards))} CHESS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiCalendar className="text-blue-400 w-4 h-4" />
                    <span className="text-gray-300">Start:</span>
                    <span className="text-white">{formatDate(season.start_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiClock className="text-orange-400 w-4 h-4" />
                    <span className="text-gray-300">End:</span>
                    <span className="text-white">{formatDate(season.end_date)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calculate Distribution */}
        {selectedSeason && (
          <div className="bg-gradient-to-r from-slate-800/50 to-indigo-900/20 backdrop-blur-sm rounded-xl p-6 mb-6 border border-indigo-500/20">
            <h3 className="text-xl font-bold text-white mb-4 text-center">Calculate Distribution</h3>
            <p className="text-gray-300 mb-6 text-center">
              Calculate airdrop distribution based on user points for the selected season.
            </p>
            <div className="flex justify-center">
              <button
                onClick={calculateDistribution}
                disabled={isCalculating}
                className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-3 text-lg font-semibold"
              >
                {isCalculating ? <FiRefreshCw className="w-5 h-5 animate-spin" /> : <FiAward className="w-5 h-5" />}
                {isCalculating ? 'Calculating...' : 'Calculate Distribution Based on Points'}
              </button>
            </div>
          </div>
        )}

        {/* Distribution Preview */}
        {recipients.length > 0 && (
          <div className="bg-gradient-to-r from-slate-800/50 to-indigo-900/20 backdrop-blur-sm rounded-xl p-6 mb-6 border border-indigo-500/20">
            <h3 className="text-xl font-bold text-white mb-6 text-center">Distribution Preview</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-6 p-4 bg-slate-700/30 rounded-lg">
                <h4 className="text-white font-semibold text-lg">
                  Recipients ({recipients.length})
                </h4>
                <div className="text-2xl font-bold text-purple-400">
                  Total: {formatNumber(calculateTotal())} CHESS
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recipients.slice(0, 12).map((recipient, index) => (
                  <div key={index} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">FID:</span>
                        <span className="text-white font-semibold">{recipient.user_fid}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Points:</span>
                        <span className="text-blue-400 font-semibold">{recipient.points}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Percentage:</span>
                        <span className="text-yellow-400 font-semibold">{recipient.percentage}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Reward:</span>
                        <span className="text-green-400 font-semibold">{recipient.reward_amount_formatted}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {recipients.length > 12 && (
                <div className="text-center text-gray-400 text-sm py-4">
                  ... and {recipients.length - 12} more recipients
                </div>
              )}
            </div>

            {/* Distribute Button */}
            <div className="flex justify-center mt-8">
              <button
                onClick={distributeAirdrop}
                disabled={isDistributing}
                className="px-12 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 flex items-center gap-3 text-xl font-bold"
              >
                {isDistributing ? (
                  <FiRefreshCw className="w-6 h-6 animate-spin" />
                ) : (
                  <FiAward className="w-6 h-6" />
                )}
                {isDistributing ? 'Distributing...' : `Distribute ${formatNumber(calculateTotal())} CHESS to ${recipients.length} Recipients`}
              </button>
            </div>
          </div>
        )}

        {/* Back to Home */}
        <div className="text-center mt-8">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            ← Back to Homepage
          </a>
        </div>
      </div>
    </div>
  );
}
