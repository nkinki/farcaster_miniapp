"use client"

import { useState, useEffect } from 'react';
import { FiRefreshCw, FiPlay, FiRotateCcw, FiPlus } from 'react-icons/fi';

interface LotteryRound {
  id: number;
  round_number: number;
  start_date: string;
  end_date: string;
  draw_date: string;
  prize_pool: number;
  status: string;
  winner_fid?: number;
  winner_number?: number;
  total_tickets_sold: number;
}

interface LotteryStats {
  total_rounds: number;
  total_tickets_sold: number;
  total_prize_distributed: number;
  treasury_balance: number;
}

export default function LotteryAdminPage() {
  const [currentRound, setCurrentRound] = useState<LotteryRound | null>(null);
  const [stats, setStats] = useState<LotteryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch current round
      const roundResponse = await fetch('/api/lottery/current-round');
      if (roundResponse.ok) {
        const roundData = await roundResponse.json();
        setCurrentRound(roundData.round);
      }

      // Fetch stats
      const statsResponse = await fetch('/api/lottery/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage('Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const simulateAction = async (action: string) => {
    try {
      setLoading(true);
      setMessage('');
      
      const response = await fetch('/api/lottery/test-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(data.message);
        await fetchData(); // Refresh data
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error simulating action:', error);
      setMessage('Error simulating action');
    } finally {
      setLoading(false);
    }
  };

  const formatChessTokens = (amount: number) => {
    return (amount / 1000000).toLocaleString('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    }) + 'M';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">🎰 Lottery Admin Panel</h1>
          <p className="text-purple-300">Test and simulate lottery operations</p>
        </div>

        {/* Control Panel */}
        <div className="bg-[#23283a] rounded-xl p-6 border border-purple-500/30 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Control Panel</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => simulateAction('reset')}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <FiRotateCcw size={16} />
              Reset All
            </button>
            
            <button
              onClick={() => simulateAction('simulate_purchase')}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <FiPlus size={16} />
              Simulate Purchase
            </button>
            
            <button
              onClick={() => simulateAction('simulate_draw')}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <FiPlay size={16} />
              Simulate Draw
            </button>
            
            <button
              onClick={() => simulateAction('simulate_new_round')}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <FiPlus size={16} />
              New Round
            </button>
          </div>
          
          {message && (
            <div className="mt-4 p-3 bg-gray-800 rounded-lg">
              <p className="text-white">{message}</p>
            </div>
          )}
        </div>

        {/* Current Round Info */}
        {currentRound && (
          <div className="bg-[#23283a] rounded-xl p-6 border border-pink-500/30 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Current Round #{currentRound.round_number}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-400">
                  {formatChessTokens(currentRound.prize_pool)}
                </div>
                <div className="text-pink-300 text-sm">Prize Pool</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">
                  {currentRound.total_tickets_sold}/100
                </div>
                <div className="text-cyan-300 text-sm">Tickets Sold</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {currentRound.status}
                </div>
                <div className="text-purple-300 text-sm">Status</div>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Start Date:</span>
                <span className="text-white ml-2">{formatDate(currentRound.start_date)}</span>
              </div>
              <div>
                <span className="text-gray-400">End Date:</span>
                <span className="text-white ml-2">{formatDate(currentRound.end_date)}</span>
              </div>
              <div>
                <span className="text-gray-400">Draw Date:</span>
                <span className="text-white ml-2">{formatDate(currentRound.draw_date)}</span>
              </div>
              <div>
                <span className="text-gray-400">Round ID:</span>
                <span className="text-white ml-2">{currentRound.id}</span>
              </div>
            </div>
            
            {currentRound.winner_fid && (
              <div className="mt-4 p-3 bg-green-900/30 border border-green-500/30 rounded-lg">
                <div className="text-green-400 font-bold">Winner Found!</div>
                <div className="text-white">FID: {currentRound.winner_fid}</div>
                <div className="text-white">Winning Number: {currentRound.winner_number}</div>
              </div>
            )}
          </div>
        )}

        {/* Lottery Statistics */}
        {stats && (
          <div className="bg-[#23283a] rounded-xl p-6 border border-yellow-500/30">
            <h2 className="text-xl font-bold text-white mb-4">Lottery Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-white">{stats.total_rounds}</div>
                <div className="text-gray-300 text-sm">Total Rounds</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-white">{stats.total_tickets_sold}</div>
                <div className="text-gray-300 text-sm">Total Tickets Sold</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-white">{formatChessTokens(stats.total_prize_distributed)}</div>
                <div className="text-gray-300 text-sm">Total Prizes Distributed</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-white">{formatChessTokens(stats.treasury_balance)}</div>
                <div className="text-gray-300 text-sm">Treasury Balance</div>
              </div>
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <div className="mt-6 text-center">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 mx-auto"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} size={16} />
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}
