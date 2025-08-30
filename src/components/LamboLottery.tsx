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
    return (amount / 1000000).toLocaleString('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    }) + 'M';
  };

  const isNumberTaken = (number: number) => {
    return takenNumbers.includes(number);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-purple-900 via-black to-purple-900 rounded-2xl shadow-2xl p-6 max-w-4xl w-full h-[90vh] flex flex-col border border-[#a64d79] relative overflow-hidden">
        
        {/* Header */}
        <div className="relative z-10 flex justify-between items-center mb-6">
                     <div className="flex items-center gap-4">
             <div className="text-4xl">💎</div>
                          <div>
               <h1 className="text-2xl font-bold text-white uppercase tracking-wider">
                 BUY A LAMBO
               </h1>
               <p className="text-purple-200 text-xs font-medium">One Winner Takes All!</p>
             </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-[#23283a] border border-[#a64d79] hover:bg-[#2a2f42] text-white transition-all duration-300 hover:scale-110"
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
            
            {/* Current Round Info */}
            {currentRound && (
              <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79]">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-400">
                      {formatChessTokens(currentRound.prize_pool)}
                    </div>
                    <div className="text-cyan-300 text-sm">Prize Pool</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-400">
                      {currentRound.total_tickets_sold}/100
                    </div>
                    <div className="text-cyan-300 text-sm">Tickets Sold</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-400">
                      Round #{currentRound.round_number}
                    </div>
                    <div className="text-cyan-300 text-sm">Current Round</div>
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
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(currentRound.total_tickets_sold / 100) * 100}%` }}
                  ></div>
                </div>
                <div className="text-center text-sm text-gray-300">
                  {100 - currentRound.total_tickets_sold} tickets remaining
                </div>
              </div>
            )}

            {/* Number Selection Grid */}
            <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79]">
                             <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
                 <FiZap /> Select Numbers (1-100)
               </h3>
                               <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-blue-300">
                    <span className="font-semibold">Important:</span> Maximum 10 numbers per user per round. Each ticket costs 100,000 CHESS. Choose wisely!
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
                         w-8 h-8 rounded text-xs font-bold transition-all duration-200
                         ${isTaken 
                           ? 'bg-red-600/50 text-red-300 cursor-not-allowed opacity-60' 
                           : isSelected
                             ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white scale-110 shadow-lg'
                             : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:scale-105'
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
                       {selectedNumbers.length}/10 selected
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
                   {selectedNumbers.length === 10 && (
                     <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                       <p className="text-sm text-yellow-300">
                         <span className="font-semibold">Maximum reached:</span> You have selected the maximum 10 numbers allowed per round.
                       </p>
                     </div>
                   )}
                 </div>
               )}

              {/* Purchase button */}
              <div className="flex items-center justify-between">
                                 <div className="text-sm text-gray-300">
                   <div>Price per ticket: <span className="text-yellow-400 font-bold">100,000 CHESS</span></div>
                   <div>Total cost: <span className="text-yellow-400 font-bold">{(selectedNumbers.length * 100000).toLocaleString()} CHESS</span></div>
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
                   {purchasing ? 'Purchasing...' : `Buy ${selectedNumbers.length} Ticket${selectedNumbers.length !== 1 ? 's' : ''} (${selectedNumbers.length}/10)`}
                 </button>
              </div>
            </div>

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

            {/* Stats */}
            {stats && (
              <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79]">
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
             <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79]">
                               <h3 className="text-lg font-bold text-gray-300 mb-3">How it works:</h3>
                                 <ul className="text-sm text-gray-400 space-y-1">
                   <li>• Choose 1-10 numbers between 1-100</li>
                   <li>• Maximum 10 numbers per user per round</li>
                   <li>• Each ticket costs 100,000 CHESS tokens</li>
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