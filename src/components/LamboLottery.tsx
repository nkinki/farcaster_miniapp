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
  const [takenNumbers, setTakenNumbers] = useState<number[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [drawResult, setDrawResult] = useState<any>(null);

  const fetchLotteryData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch current round
      const roundResponse = await fetch('/api/lottery/current-round');
      if (roundResponse.ok) {
        const roundData = await roundResponse.json();
        setCurrentRound(roundData.round);
        
        // Fetch taken numbers for current round
        if (roundData.round?.id) {
          const takenResponse = await fetch(`/api/lottery/taken-numbers?round_id=${roundData.round.id}`);
          if (takenResponse.ok) {
            const takenData = await takenResponse.json();
            setTakenNumbers(takenData.takenNumbers || []);
          }
        }
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
    } else if (selectedNumbers.length < (10 - userTickets.length)) { // Max remaining tickets allowed
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
        
        // Update taken numbers immediately
        if (currentRound?.id) {
          const takenResponse = await fetch(`/api/lottery/taken-numbers?round_id=${currentRound.id}`);
          if (takenResponse.ok) {
            const takenData = await takenResponse.json();
            setTakenNumbers(takenData.takenNumbers || []);
          }
        }
        
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
    if (!amount || amount === 0) return '$0';
    
    if (amount >= 1000000000) {
      // Billions: 1,000,000,000 → $1B
      return '$' + (amount / 1000000000).toLocaleString('en-US', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 2 
      }) + 'B';
    } else if (amount >= 1000000) {
      // Millions: 1,000,000 → $1M
      return '$' + (amount / 1000000).toLocaleString('en-US', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 2 
      }) + 'M';
    } else if (amount >= 1000) {
      // Thousands: 1,000 → $1K
      return '$' + (amount / 1000).toLocaleString('en-US', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
      }) + 'K';
    } else {
      // Small amounts: 999 → $999
      return '$' + amount.toLocaleString('en-US');
    }
  };

  const isNumberTaken = (number: number) => {
    return takenNumbers.includes(number);
  };

  const handleDrawWinner = async () => {
    if (!currentRound) return;

    try {
      setDrawing(true);
      
      const response = await fetch('/api/lottery/draw-winner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          round_id: currentRound.id,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Draw result:', result);
        setDrawResult(result);
        
        // Refresh data after draw
        await fetchLotteryData();
      } else {
        const error = await response.json();
        console.error('Failed to draw winner:', error);
        alert(`Failed to draw winner: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error drawing winner:', error);
      alert('Failed to draw winner. Please try again.');
    } finally {
      setDrawing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-purple-900 via-black to-purple-900 rounded-2xl shadow-2xl p-6 max-w-4xl w-full h-[90vh] flex flex-col border border-[#a64d79] relative overflow-hidden">
        
                 {/* Header */}
         <div className="relative z-10 flex flex-col items-start mb-6">
           <div className="w-full flex justify-between items-start mb-2">
             <div className="flex items-center gap-4">
               <div>
                 <div className="flex items-center gap-2">
                   <FiDollarSign size={48} className="text-yellow-300" />
                   <h1 className="text-4xl font-bold text-white uppercase tracking-[0.02em]">
                     BUY A LAMBO
                   </h1>
                 </div>
                 <p className="text-purple-200 text-sm font-medium mt-1 text-center">One Winner Takes All!</p>
                 
                 {/* Pulsing Jackpot Display with Countdown */}
                 {currentRound && (
                   <div className="mt-3 w-full p-3 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-2 border-yellow-400/50 rounded-lg animate-pulse" style={{ animationDuration: '4s' }}>
                     <div className="flex items-center justify-between">
                       <div className="text-center flex-1">
                         <div className="text-base font-bold text-yellow-300 mb-0.5">
                           🎰 JACKPOT 🎰
                         </div>
                         <div className="text-xl font-bold text-yellow-400 animate-pulse" style={{ animationDuration: '4s' }}>
                           {formatChessTokens(currentRound.prize_pool)}
                         </div>
                       </div>
                       <div className="text-center border-l-2 border-yellow-400/30 pl-4">
                         <div className="text-sm font-bold text-yellow-300 mb-0.5">
                           ⏰ TIME LEFT
                         </div>
                         <div className="text-lg font-bold text-yellow-400">
                           {timeRemaining}
                         </div>
                       </div>
                     </div>
                   </div>
                 )}
               </div>
             </div>
           </div>
           <button
             onClick={onClose}
             className="absolute top-0 right-0 p-2 rounded-full bg-[#23283a] border border-[#a64d79] hover:bg-[#2a2f42] text-white transition-all duration-300 hover:scale-110"
           >
             <FiX size={24} />
           </button>
         </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-cyan-400 text-2xl font-bold animate-pulse">Loading lottery...</div>
          </div>
        ) : (
          <div className="relative z-10 flex-1 overflow-y-auto space-y-6">
            
            {/* Number Selection Grid - FELÜL */}
            <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79]">
              <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                <FiZap /> Select Numbers (1-100)
              </h3>
              
                             <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                 <p className="text-sm text-blue-300">
                   Maximum 10 numbers per user per round. Each ticket costs $100,000. 
                   {userTickets.length > 0 && (
                     <span className="block mt-1">You already have <span className="font-bold text-yellow-300">{userTickets.length}/10</span> tickets in this round.</span>
                   )}
                   Choose wisely!
                 </p>
               </div>
              
              {takenNumbers.length > 0 && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-300">
                    <span className="font-semibold">{takenNumbers.length}</span> numbers are already taken and cannot be selected.
                  </p>
                </div>
              )}
              
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
                        w-10 h-10 rounded text-sm font-bold transition-all duration-200 border-2
                        ${isTaken 
                          ? 'bg-red-600/50 text-red-300 cursor-not-allowed opacity-60 border-red-500/50' 
                          : isSelected
                            ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white scale-110 shadow-lg border-[#a64d79]'
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:scale-105 border-[#a64d79]/30 hover:border-[#a64d79]/60'
                        }
                      `}
                      title={isTaken ? `Number ${number} is already taken` : `Select number ${number}`}
                    >
                      {number}
                    </button>
                  );
                })}
              </div>
              
              {/* Selected numbers display */}
              {selectedNumbers.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-300">Selected numbers:</p>
                    <p className="text-sm text-blue-300">
                      {selectedNumbers.length}/{10 - userTickets.length} selected
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedNumbers.map((number) => (
                      <span
                        key={number}
                        className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-full text-sm font-bold"
                      >
                        {number}
                      </span>
                    ))}
                  </div>
                  {selectedNumbers.length === (10 - userTickets.length) && (
                    <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                      <p className="text-sm text-yellow-300">
                        <span className="font-semibold">Maximum reached:</span> You have selected the maximum {10 - userTickets.length} numbers allowed for this round.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Purchase button */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-300">
                  <div>Price per ticket: <span className="text-yellow-400 font-bold">$100,000</span></div>
                  <div>Total cost: <span className="text-yellow-400 font-bold">${(selectedNumbers.length * 100000).toLocaleString()}</span></div>
                </div>
                <button
                  onClick={handlePurchaseTickets}
                  disabled={selectedNumbers.length === 0 || purchasing}
                  className={`
                    px-6 py-3 rounded-xl font-bold text-lg transition-all duration-300
                    ${selectedNumbers.length > 0 && !purchasing
                      ? 'bg-[#23283a] border border-[#a64d79] hover:bg-[#2a2f42] text-white shadow-lg hover:scale-105'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  {purchasing ? 'Purchasing...' : `Buy ${selectedNumbers.length} Ticket${selectedNumbers.length !== 1 ? 's' : ''} (${selectedNumbers.length}/${10 - userTickets.length})`}
                </button>
              </div>
            </div>

            {/* Current Round Info - ALATTA */}
            {currentRound && (
              <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79]">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-cyan-400">
                      {formatChessTokens(currentRound.prize_pool)}
                    </div>
                    <div className="text-cyan-300 text-xs opacity-80">Prize Pool</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-cyan-400">
                      {currentRound.total_tickets_sold}/100
                    </div>
                    <div className="text-cyan-300 text-xs opacity-80">Tickets Sold</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-cyan-400">
                      #{currentRound.round_number}
                    </div>
                    <div className="text-cyan-300 text-xs opacity-80">Round</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-400">
                      {timeRemaining}
                    </div>
                    <div className="text-yellow-300 text-xs opacity-80">Time Left</div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                  <div 
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(currentRound.total_tickets_sold / 100) * 100}%` }}
                  ></div>
                </div>
                <div className="text-center text-xs text-gray-400 opacity-70">
                  {100 - currentRound.total_tickets_sold} tickets remaining
                </div>
                
                {/* Draw Winner Button */}
                <div className="mt-4 text-center">
                  <button
                    onClick={handleDrawWinner}
                    disabled={drawing || currentRound.total_tickets_sold === 0}
                    className={`
                      px-6 py-3 rounded-xl font-bold text-lg transition-all duration-300
                      ${currentRound.total_tickets_sold > 0 && !drawing
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg hover:scale-105'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    {drawing ? 'Drawing...' : '🎲 DRAW WINNER 🎲'}
                  </button>
                </div>
              </div>
            )}

            {/* User's Tickets */}
            {userTickets.length > 0 && (
              <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79]">
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

            {/* Draw Result */}
            {drawResult && (
              <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79]">
                {drawResult.hasWinner ? (
                  // Winner found
                  <>
                    <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
                      🏆 WINNER ANNOUNCED! 🏆
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="text-center p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                        <div className="text-2xl font-bold text-green-400 mb-2">
                          🎯 Winning Number: {drawResult.winner.number}
                        </div>
                        <div className="text-green-300 text-sm">
                          Winner: {drawResult.winner.player_name} (FID: {drawResult.winner.fid})
                        </div>
                      </div>
                      
                      <div className="text-center p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                        <div className="text-2xl font-bold text-blue-400 mb-2">
                          🎉 Congratulations! 🎉
                        </div>
                        <div className="text-blue-300 text-sm">
                          Winner takes all!
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  // No winner
                  <>
                    <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                      🎲 DRAW COMPLETED - NO WINNER 🎲
                    </h3>
                    
                    <div className="text-center p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg mb-4">
                      <div className="text-2xl font-bold text-yellow-400 mb-2">
                        🎯 Winning Number: {drawResult.winning_number}
                      </div>
                      <div className="text-yellow-300 text-sm">
                        No tickets matched this number
                      </div>
                    </div>
                  </>
                )}
                
                {/* Common info for both cases - DISABLED */}
                {/*
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                    <div className="text-lg font-bold text-purple-400">
                      🆕 Next Round Jackpot: {formatChessTokens(drawResult.round.next_round_jackpot)}
                    </div>
                    <div className="text-purple-300 text-xs">70% of revenue</div>
                  </div>
                  
                  <div className="text-center p-3 bg-orange-900/20 border border-orange-500/30 rounded-lg">
                    <div className="text-lg font-bold text-orange-400">
                      🏛️ Treasury: {formatChessTokens(drawResult.round.treasury_amount)}
                    </div>
                    <div className="text-orange-300 text-xs">30% of revenue</div>
                  </div>
                </div>
                */}
                
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setDrawResult(null)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all duration-300"
                  >
                    Close Result
                  </button>
                </div>
              </div>
            )}

            {/* Rules */}
            <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79]">
              <h3 className="text-lg font-bold text-gray-300 mb-3">How it works:</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Choose 1-10 numbers between 1-100</li>
                <li>• Maximum 10 numbers per user per round</li>
                <li>• Each ticket costs $100,000</li>
                <li>• Daily draw at 8 PM UTC</li>
                <li>• Winner takes the entire prize pool (All In!)</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}