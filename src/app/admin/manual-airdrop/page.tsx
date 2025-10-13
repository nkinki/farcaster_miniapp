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
  reward_amount: string;
  reason: string;
  points_used?: number;
}

export default function ManualAirdropPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  
  // New recipient form
  const [newRecipient, setNewRecipient] = useState<Recipient>({
    user_fid: 0,
    reward_amount: '',
    reason: '',
    points_used: 0
  });

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

  const addRecipient = () => {
    if (newRecipient.user_fid && newRecipient.reward_amount) {
      setRecipients([...recipients, { ...newRecipient }]);
      setNewRecipient({
        user_fid: 0,
        reward_amount: '',
        reason: '',
        points_used: 0
      });
    }
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const updateRecipient = (index: number, field: keyof Recipient, value: string | number) => {
    const updated = [...recipients];
    updated[index] = { ...updated[index], [field]: value };
    setRecipients(updated);
  };

  const distributeAirdrop = async () => {
    if (!selectedSeason || recipients.length === 0) {
      setMessage('❌ Please select a season and add recipients');
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
          recipients: recipients
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ Manual airdrop recorded successfully! ${data.successful_distributions} distributions recorded.`);
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

        {/* Recipients Management */}
        <div className="bg-gradient-to-r from-slate-800/50 to-indigo-900/20 backdrop-blur-sm rounded-xl p-6 mb-6 border border-indigo-500/20">
          <h3 className="text-lg font-bold text-white mb-4">Recipients</h3>
          
          {/* Add New Recipient */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">User FID</label>
              <input
                type="number"
                value={newRecipient.user_fid}
                onChange={(e) => setNewRecipient({...newRecipient, user_fid: parseInt(e.target.value) || 0})}
                placeholder="12345"
                className="w-full px-3 py-2 bg-slate-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Reward Amount (CHESS)</label>
              <input
                type="number"
                step="0.01"
                value={newRecipient.reward_amount}
                onChange={(e) => setNewRecipient({...newRecipient, reward_amount: e.target.value})}
                placeholder="1000.00"
                className="w-full px-3 py-2 bg-slate-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Reason</label>
              <input
                type="text"
                value={newRecipient.reason}
                onChange={(e) => setNewRecipient({...newRecipient, reason: e.target.value})}
                placeholder="Top contributor, etc."
                className="w-full px-3 py-2 bg-slate-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={addRecipient}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <FiPlus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {/* Recipients List */}
          {recipients.length > 0 ? (
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
                <div key={index} className="flex items-center gap-4 p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm text-gray-400">FID:</span>
                      <span className="ml-2 text-white font-semibold">{recipient.user_fid}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-400">Amount:</span>
                      <span className="ml-2 text-green-400 font-semibold">{recipient.reward_amount} CHESS</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-400">Reason:</span>
                      <span className="ml-2 text-white">{recipient.reason}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeRecipient(index)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <FiUsers className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No recipients added yet</p>
              <p className="text-sm">Add recipients using the form above</p>
            </div>
          )}
        </div>

        {/* Distribute Button */}
        {recipients.length > 0 && selectedSeason && (
          <div className="flex justify-center">
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
        )}
      </div>
    </div>
  );
}
