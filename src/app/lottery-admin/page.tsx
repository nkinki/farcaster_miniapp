"use client"
import { useState, useEffect } from 'react';
import { FiRefreshCw, FiPlay, FiRotateCcw, FiPlus } from 'react-icons/fi';
import LotteryTicketPurchase from '@/components/LotteryTicketPurchase';

interface LotteryRound {
  id: number;
  draw_number: number;
  jackpot: number;
  total_tickets: number;
  status: string;
  start_time: string;
  end_time: string;
}

interface LotteryStats {
  total_tickets: number;
  active_tickets: number;
  total_jackpot: number;
  last_draw_number: number;
  next_draw_time: string;
}

export default function LotteryAdminPage() {
  const [currentRound, setCurrentRound] = useState<LotteryRound | null>(null);
  const [stats, setStats] = useState<LotteryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchData = async () => {
    try {
      const [roundResponse, statsResponse] = await Promise.all([
        fetch('/api/lottery/current-round'),
        fetch('/api/lottery/stats')
      ]);

      if (roundResponse.ok) {
        const roundData = await roundResponse.json();
        setCurrentRound(roundData.round);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const simulateAction = async (action: string) => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/lottery/test-simulation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ ${data.message}`);
        fetchData(); // Refresh data
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      setMessage('❌ An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString: string | undefined | null) => {
    if (!timeString) return 'N/A';
    try {
      return new Date(timeString).toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-yellow-400 mb-2">🎰 BUY A LAMBO LOTTERY</h1>
          <p className="text-gray-400">Admin Panel - Test & Manage Lottery System</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Admin Controls */}
          <div className="space-y-6">
            {/* Admin Actions */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-yellow-400">Admin Controls</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => simulateAction('reset')}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  <FiRotateCcw />
                  Reset All
                </button>
                <button
                  onClick={() => simulateAction('simulate_purchase')}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  <FiPlay />
                  Simulate Purchase
                </button>
                <button
                  onClick={() => simulateAction('simulate_draw')}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  <FiPlay />
                  Simulate Draw
                </button>
                <button
                  onClick={() => simulateAction('simulate_new_round')}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  <FiPlus />
                  New Round
                </button>
              </div>
            </div>

            {/* Current Round Info */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-yellow-400">Current Round</h2>
              {currentRound ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Round Number:</span>
                    <span className="font-bold">#{currentRound.draw_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Jackpot:</span>
                    <span className="font-bold text-yellow-400">{formatNumber(currentRound.jackpot)} $CHESS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tickets Sold:</span>
                    <span className="font-bold">{formatNumber(currentRound.total_tickets)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className={`font-bold px-2 py-1 rounded text-sm ${
                      currentRound.status === 'active' ? 'bg-green-600' : 'bg-gray-600'
                    }`}>
                      {currentRound.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Start Time:</span>
                    <span className="font-bold">{formatTime(currentRound.start_time)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">End Time:</span>
                    <span className="font-bold">{formatTime(currentRound.end_time)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">No active round found</p>
              )}
            </div>

            {/* Lottery Statistics */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-yellow-400">Lottery Statistics</h2>
              {stats ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Tickets:</span>
                    <span className="font-bold">{formatNumber(stats.total_tickets)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Active Tickets:</span>
                    <span className="font-bold">{formatNumber(stats.active_tickets)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Jackpot:</span>
                    <span className="font-bold text-yellow-400">{formatNumber(stats.total_jackpot)} $CHESS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Draw:</span>
                    <span className="font-bold">#{stats.last_draw_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Next Draw:</span>
                    <span className="font-bold">{formatTime(stats.next_draw_time)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">No statistics available</p>
              )}
            </div>
          </div>

          {/* Right Column - Ticket Purchase */}
          <div className="space-y-6">
            <LotteryTicketPurchase 
              currentRound={currentRound}
              onPurchaseSuccess={fetchData}
            />
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`text-center p-4 rounded-lg ${
            message.startsWith('✅') ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Refresh Button */}
        <div className="text-center">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 mx-auto py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}
