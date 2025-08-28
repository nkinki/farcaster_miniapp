"use client"

import { useState, useEffect, useCallback } from "react";
import { FiX, FiDollarSign, FiClock, FiUsers, FiTrendingUp, FiZap } from "react-icons/fi";

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

interface LotteryTicket {
  id: number;
  round_id: number;
  fid: number;
  ticket_number: number;
  purchase_price: number;
  purchased_at: string;
}

interface LotteryStats {
  total_rounds: number;
  total_tickets_sold: number;
  total_prize_distributed: number;
  treasury_balance: number;
}

interface LamboLotteryProps {
  isOpen: boolean;
  onClose: () => void;
  userFid: number;
  onPurchaseSuccess?: () => void;
}

export default function LamboLottery({ isOpen, onClose, userFid, onPurchaseSuccess }: LamboLotteryProps) {
  const [currentRound, setCurrentRound] = useState<LotteryRound | null>(null);
  const [userTickets, setUserTickets] = useState<LotteryTicket[]>([]);
  const [stats, setStats] = useState<LotteryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  const fetchLotteryData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch current round
      const roundResponse = await fetch('/api/lottery/current-round');
      if (roundResponse.ok) {
        const roundData = await roundResponse.json();
        setCurrentRound(roundData.round);
      }

      // Fetch user tickets
      if (userFid) {
        const ticketsResponse = await fetch(`/api/lottery/user-tickets?fid=${userFid}`);
        if (ticketsResponse.ok) {
          const ticketsData = await ticketsResponse.json();
          setUserTickets(ticketsData.tickets || []);
        }
      }

      // Fetch stats
      const statsResponse = await fetch('/api/lottery/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error('Failed to fetch lottery data:', error);
    } finally {
      setLoading(false);
    }
  }, [userFid]);

  useEffect(() => {
    if (isOpen) {
      fetchLotteryData();
    }
  }, [isOpen, fetchLotteryData]);

  // Update countdown timer
  useEffect(() => {
    if (!currentRound) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const drawTime = new Date(currentRound.draw_date).getTime();
      const difference = drawTime - now;

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining("Drawing in progress...");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentRound]);

  const handleNumberSelect = (number: number) => {
    if (selectedNumbers.includes(number)) {
      setSelectedNumbers(selectedNumbers.filter(n => n !== number));
    } else if (selectedNumbers.length < 10) { // Max 10 tickets per purchase
      setSelectedNumbers([...selectedNumbers, number]);
    }
  };

  const handlePurchaseTickets = async () => {
    if (selectedNumbers.length === 0 || !currentRound) return;

    try {
      setPurchasing(true);
      
      const response = await fetch('/api/lottery/purchase-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fid: userFid,
          round_id: currentRound.id,
          ticket_numbers: selectedNumbers,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Tickets purchased successfully:', result);
        
        // Reset selection and refresh data
        setSelectedNumbers([]);
        await fetchLotteryData();
        
        if (onPurchaseSuccess) {
          onPurchaseSuccess();
        }
      } else {
        const error = await response.json();
        console.error('Failed to purchase tickets:', error);
        alert(`Failed to purchase tickets: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error purchasing tickets:', error);
      alert('Failed to purchase tickets. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const formatChessTokens = (amount: number) => {
    return (amount / 1000000).toLocaleString('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    }) + 'M';
  };

  const isNumberTaken = (number: number) => {
    return currentRound?.total_tickets_sold ? 
      // This is a simplified check - in reality you'd need to fetch taken numbers
      false : false;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-pink-900 via-purple-900 to-cyan-900 rounded-2xl shadow-2xl p-6 max-w-4xl w-full h-[90vh] flex flex-col border-4 border-pink-500/50 relative overflow-hidden">
        
        {/* Neon glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 rounded-2xl blur-xl"></div>
        
        {/* Header */}
        <div className="relative z-10 flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl">🏎️</div>
            <div>
                             <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 uppercase tracking-wider">
                 BUY A LAMBO
               </h1>
               <p className="text-pink-300 text-sm font-medium">GTA Vice City Style Lottery • One Winner Takes All!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-red-600/80 hover:bg-red-500 text-white transition-all duration-300 hover:scale-110"
          >
            <FiX size={24} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-pink-400 text-2xl font-bold animate-pulse">Loading lottery...</div>
          </div>
        ) : (
          <div className="relative z-10 flex-1 overflow-y-auto space-y-6">
            
            {/* Current Round Info */}
            {currentRound && (
              <div className="bg-black/40 rounded-xl p-4 border border-pink-500/30">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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
                      Round #{currentRound.round_number}
                    </div>
                    <div className="text-purple-300 text-sm">Current Round</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">
                      {timeRemaining}
                    </div>
                    <div className="text-yellow-300 text-sm">Time Left</div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
                  <div 
                    className="bg-gradient-to-r from-pink-500 to-cyan-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(currentRound.total_tickets_sold / 100) * 100}%` }}
                  ></div>
                </div>
                <div className="text-center text-sm text-gray-300">
                  {100 - currentRound.total_tickets_sold} tickets remaining
                </div>
              </div>
            )}

            {/* Number Selection Grid */}
            <div className="bg-black/40 rounded-xl p-4 border border-purple-500/30">
              <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                <FiZap /> Select Your Lucky Numbers (1-100)
              </h3>
              <div className="grid grid-cols-10 gap-2 mb-4">
                {Array.from({ length: 100 }, (_, i) => i + 1).map((number) => {
                  const isSelected = selectedNumbers.includes(number);
                  const isTaken = isNumberTaken(number);
                  
                  return (
                    <button
                      key={number}
                      onClick={() => !isTaken && handleNumberSelect(number)}
                      disabled={isTaken}
                      className={`
                        w-8 h-8 rounded text-xs font-bold transition-all duration-200
                        ${isTaken 
                          ? 'bg-red-600/50 text-red-300 cursor-not-allowed' 
                          : isSelected
                            ? 'bg-gradient-to-r from-pink-500 to-cyan-500 text-white scale-110 shadow-lg'
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:scale-105'
                        }
                      `}
                    >
                      {number}
                    </button>
                  );
                })}
              </div>
              
              {/* Selected numbers display */}
              {selectedNumbers.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-300 mb-2">Selected numbers:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedNumbers.map((number) => (
                      <span
                        key={number}
                        className="px-3 py-1 bg-gradient-to-r from-pink-500 to-cyan-500 text-white rounded-full text-sm font-bold"
                      >
                        {number}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Purchase button */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-300">
                  <div>Price per ticket: <span className="text-yellow-400 font-bold">20,000 CHESS</span></div>
                  <div>Total cost: <span className="text-yellow-400 font-bold">{(selectedNumbers.length * 20000).toLocaleString()} CHESS</span></div>
                </div>
                <button
                  onClick={handlePurchaseTickets}
                  disabled={selectedNumbers.length === 0 || purchasing}
                  className={`
                    px-6 py-3 rounded-xl font-bold text-lg transition-all duration-300
                    ${selectedNumbers.length > 0 && !purchasing
                      ? 'bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 text-white shadow-lg hover:scale-105'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  {purchasing ? 'Purchasing...' : `Buy ${selectedNumbers.length} Ticket${selectedNumbers.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>

            {/* User's Tickets */}
            {userTickets.length > 0 && (
              <div className="bg-black/40 rounded-xl p-4 border border-cyan-500/30">
                <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                  <FiUsers /> Your Tickets ({userTickets.length})
                </h3>
                <div className="grid grid-cols-10 gap-2">
                  {userTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="w-8 h-8 rounded bg-gradient-to-r from-green-500 to-blue-500 text-white text-xs font-bold flex items-center justify-center"
                    >
                      {ticket.ticket_number}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            {stats && (
              <div className="bg-black/40 rounded-xl p-4 border border-yellow-500/30">
                <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                  <FiTrendingUp /> Lottery Statistics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{stats.total_rounds}</div>
                    <div className="text-gray-300 text-sm">Total Rounds</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{stats.total_tickets_sold}</div>
                    <div className="text-gray-300 text-sm">Tickets Sold</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{formatChessTokens(stats.total_prize_distributed)}</div>
                    <div className="text-gray-300 text-sm">Prizes Won</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{formatChessTokens(stats.treasury_balance)}</div>
                    <div className="text-gray-300 text-sm">Treasury</div>
                  </div>
                </div>
              </div>
            )}

            {/* Rules */}
            <div className="bg-black/40 rounded-xl p-4 border border-gray-500/30">
              <h3 className="text-lg font-bold text-gray-300 mb-3">How it works:</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Choose 1-10 numbers between 1-100</li>
                <li>• Each ticket costs 20,000 CHESS tokens</li>
                <li>• Daily draw at 8 PM UTC</li>
                <li>• Winner takes the entire prize pool (All In!)</li>
                <li>• 70% of ticket sales go to next day's prize pool</li>
                <li>• 30% goes to treasury</li>
                <li>• Starting prize pool: 1,000,000 CHESS tokens</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}