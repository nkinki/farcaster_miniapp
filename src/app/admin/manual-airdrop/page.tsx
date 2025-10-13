'use client';

import { useState, useEffect } from 'react';
import { FiUsers, FiAward, FiPlus, FiTrash2, FiSave, FiRefreshCw, FiCheckCircle } from 'react-icons/fi';

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

export default function ManualAirdropPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

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
      console.error('Failed to fetch seasons:', error);
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

    setIsLoading(true);
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
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotal = () => {
    return recipients.reduce((sum, recipient) => sum + parseFloat(recipient.reward_amount || '0'), 0);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <FiAward className="text-purple-400" />
            Manual Airdrop Distribution
          </h1>
          <p className="text-gray-400">Manually determine and distribute rewards to users</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg mb-6 border ${
            message.includes('✅') 
              ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30 text-green-200'
              : 'bg-gradient-to-r from-red-500/10 to-pink-500/10 border-red-500/30 text-red-200'
          }`}>
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}

        {/* Season Selection */}
        <div className="bg-gradient-to-r from-slate-800/50 to-indigo-900/20 backdrop-blur-sm rounded-xl p-6 mb-6 border border-indigo-500/20">
          <h3 className="text-lg font-bold text-white mb-4">Select Season</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {seasons.map((season) => (
              <div
                key={season.id}
                onClick={() => setSelectedSeason(season.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedSeason === season.id
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-gray-600 bg-slate-700/30 hover:border-purple-400'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-white">{season.name}</h4>
                  <span className={`px-2 py-1 rounded text-xs ${
                    season.status === 'completed' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {season.status}
                  </span>
                </div>
                <p className="text-sm text-gray-300">
                  Rewards: {formatNumber(parseInt(season.total_rewards))} CHESS
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Calculate Distribution */}
        {selectedSeason && (
          <div className="bg-gradient-to-r from-slate-800/50 to-indigo-900/20 backdrop-blur-sm rounded-xl p-6 mb-6 border border-indigo-500/20">
            <h3 className="text-lg font-bold text-white mb-4">Calculate Distribution</h3>
            <p className="text-gray-300 mb-4">
              Calculate airdrop distribution based on user points for the selected season.
            </p>
            <button
              onClick={calculateDistribution}
              disabled={isCalculating}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isCalculating ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiAward className="w-4 h-4" />}
              {isCalculating ? 'Calculating...' : 'Calculate Distribution Based on Points'}
            </button>
          </div>
        )}

        {/* Recipients Management */}
        {recipients.length > 0 && (
          <div className="bg-gradient-to-r from-slate-800/50 to-indigo-900/20 backdrop-blur-sm rounded-xl p-6 mb-6 border border-indigo-500/20">
            <h3 className="text-lg font-bold text-white mb-4">Distribution Preview</h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-white font-semibold">
                  Recipients ({recipients.length})
                </h4>
                <div className="text-lg font-bold text-purple-400">
                  Total: {formatNumber(calculateTotal())} CHESS
                </div>
              </div>
              
              {recipients.map((recipient, index) => (
                <div key={index} className="p-4 bg-slate-700/30 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-sm text-gray-400">FID:</span>
                      <span className="ml-2 text-white font-semibold">{recipient.user_fid}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-400">Points:</span>
                      <span className="ml-2 text-blue-400 font-semibold">{recipient.points}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-400">Percentage:</span>
                      <span className="ml-2 text-yellow-400 font-semibold">{recipient.percentage}%</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-400">Reward:</span>
                      <span className="ml-2 text-green-400 font-semibold">{recipient.reward_amount_formatted}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Distribute Button */}
            <div className="flex justify-center mt-6">
              <button
                onClick={distributeAirdrop}
                disabled={isLoading}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 flex items-center gap-3 text-lg font-semibold"
              >
                {isLoading ? (
                  <FiRefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <FiCheckCircle className="w-5 h-5" />
                )}
                {isLoading ? 'Distributing...' : `Distribute ${formatNumber(calculateTotal())} CHESS to ${recipients.length} Recipients`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
