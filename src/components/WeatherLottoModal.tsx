"use client"

import { useState, useEffect, useCallback } from "react";
import { FiX, FiSun, FiCloudRain, FiTrendingUp, FiUsers, FiClock, FiZap } from "react-icons/fi";
import { useAccount, useWaitForTransactionReceipt, useReadContract, useWriteContract } from 'wagmi';
import { type Hash } from 'viem';
import { WEATHER_LOTTO_ADDRESS, WEATHER_LOTTO_ABI, TICKET_PRICE } from '@/abis/WeatherLotto';
import { CHESS_TOKEN_ADDRESS, CHESS_TOKEN_ABI } from '@/abis/chessToken';

// --- Interface definíciók ---
interface WeatherLottoRound {
  id: number;
  round_number: number;
  start_time: string;
  end_time: string;
  status: string;
  winning_side?: string;
  sunny_tickets: number;
  rainy_tickets: number;
  total_tickets: number;
  current_total_pool: number;
  winners_pool: number;
  treasury_amount: number;
  time_remaining: number;
  sunny_odds: number;
  rainy_odds: number;
}

interface WeatherLottoTicket {
  id: number;
  round_id: number;
  player_fid: number;
  player_address: string;
  side: string;
  quantity: number;
  total_cost: string;
  payout_amount: string;
  is_claimed: boolean;
  created_at: string;
  // Additional fields from JOIN with rounds
  round_number: number;
  round_status: string;
  winning_side?: string;
  end_time: string;
  claim_status?: string;
}

interface WeatherLottoStats {
  total_rounds: number;
  total_tickets_sold: number;
  total_volume: bigint;
  total_treasury: bigint;
  total_payouts: bigint;
  current_sunny_tickets: number;
  current_rainy_tickets: number;
  current_total_pool: bigint;
  pending_claims: number;
  pending_amount: bigint;
}

interface RecentRound {
  id: number;
  round_number: number;
  start_time: string;
  end_time: string;
  status: string;
  winning_side?: string;
  sunny_tickets: number;
  rainy_tickets: number;
  total_tickets: number;
  total_pool: string;
  winners_pool: string;
  treasury_amount: string;
}

interface WeatherLottoModalProps {
  isOpen: boolean;
  onClose: () => void;
  userFid: number;
  onPurchaseSuccess?: () => void;
}

// Állapotgép a vásárlási folyamathoz
enum PurchaseStep {
  Idle,
  Approving,
  ApproveConfirming,
  ReadyToPurchase,
  Purchasing,
  PurchaseConfirming,
  Saving,
}

export default function WeatherLottoModal({ isOpen, onClose, userFid, onPurchaseSuccess }: WeatherLottoModalProps) {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const { data: receipt, isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: undefined,
  });

  // --- Állapotok ---
  const [currentRound, setCurrentRound] = useState<WeatherLottoRound | null>(null);
  const [userTickets, setUserTickets] = useState<WeatherLottoTicket[]>([]);
  const [stats, setStats] = useState<WeatherLottoStats | null>(null);
  const [recentRounds, setRecentRounds] = useState<RecentRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSide, setSelectedSide] = useState<'sunny' | 'rainy' | null>(null);
  const [quantity] = useState(1); // Fixed to 1 ticket only
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  
  const [step, setStep] = useState<PurchaseStep>(PurchaseStep.Idle);
  const [approveTxHash, setApproveTxHash] = useState<Hash | undefined>();
  const [purchaseTxHash, setPurchaseTxHash] = useState<Hash | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isManualDrawing, setIsManualDrawing] = useState(false);
  const [drawResult, setDrawResult] = useState<{winner: string, round: number} | null>(null);
  const [claimingTicket, setClaimingTicket] = useState<number | null>(null);

  const { isLoading: isApproveConfirming, isSuccess: isApproved } = useWaitForTransactionReceipt({ 
    hash: approveTxHash
  });
  const { isLoading: isPurchaseConfirming, isSuccess: isPurchased } = useWaitForTransactionReceipt({ 
    hash: purchaseTxHash
  });

  const totalCost = TICKET_PRICE * BigInt(quantity);

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CHESS_TOKEN_ADDRESS,
    abi: CHESS_TOKEN_ABI,
    functionName: 'allowance',
    args: address ? [address, WEATHER_LOTTO_ADDRESS] : undefined,
    query: { enabled: !!address }
  });

  const fetchWeatherLottoData = useCallback(async () => {
    try {
      setLoading(true);
      const [roundRes, statsRes] = await Promise.all([
        fetch('/api/weather-lotto/current-round'),
        fetch('/api/weather-lotto/stats')
      ]);

      if (roundRes.ok) {
        const roundData = await roundRes.json();
        setCurrentRound(roundData.round);
        
        // Fetch tickets for all rounds
        if (userFid) {
          const ticketsRes = await fetch(`/api/weather-lotto/user-tickets?fid=${userFid}`);
          if (ticketsRes.ok) {
            const ticketsData = await ticketsRes.json();
            setUserTickets(ticketsData.tickets || []);
          }
        }
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
        setRecentRounds(statsData.recent_rounds || []);
      }
    } catch (error) {
      console.error('Failed to fetch weather lotto data:', error);
    } finally {
      setLoading(false);
    }
  }, [userFid]);

  useEffect(() => {
    if (isOpen) {
      fetchWeatherLottoData();
    }
  }, [isOpen, fetchWeatherLottoData]);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const today = new Date(now);
      today.setUTCHours(20, 5, 0, 0); // 20:05 UTC today
      
      // If 20:05 has passed today, set to tomorrow
      if (now.getTime() > today.getTime()) {
        today.setUTCDate(today.getUTCDate() + 1);
      }
      
      const timeLeft = Math.max(0, today.getTime() - now.getTime());

      if (timeLeft > 0) {
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeRemaining("00:00:00");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedSide && isConnected) {
      setStep(PurchaseStep.Idle);
      refetchAllowance();
    }
  }, [selectedSide, isConnected, refetchAllowance]);

  useEffect(() => {
    if (isApproved && step === PurchaseStep.ApproveConfirming) {
      console.log('✅ Approve confirmed, refreshing allowance...');
      refetchAllowance();
      setStep(PurchaseStep.ReadyToPurchase);
    }
  }, [isApproved, step, refetchAllowance]);

  useEffect(() => {
    console.log('🔍 Purchase effect:', { isPurchased, step, purchaseTxHash });
    if (isPurchased && step === PurchaseStep.PurchaseConfirming) {
      console.log('✅ Transaction confirmed, saving to database...');
      setStep(PurchaseStep.Saving);
      handleSaveToDatabase();
    }
  }, [isPurchased, step, purchaseTxHash]);

  const handleSaveTicket = async () => {
    try {
      if (!selectedSide || !address) return;

      setStep(PurchaseStep.Purchasing);

      // Onchain transaction
      const functionName = selectedSide === 'sunny' ? 'buySunnyTickets' : 'buyRainyTickets';
      
      const hash = await writeContractAsync({
        address: WEATHER_LOTTO_ADDRESS,
        abi: WEATHER_LOTTO_ABI,
        functionName: functionName,
        args: [BigInt(quantity)]
      });

      setStep(PurchaseStep.PurchaseConfirming);
      setPurchaseTxHash(hash);
    } catch (error) {
      console.error('Error purchasing ticket:', error);
      setErrorMessage('Failed to purchase ticket: ' + (error as Error).message);
      setStep(PurchaseStep.Idle);
    }
  };

  const handleSaveToDatabase = async () => {
    try {
      if (!selectedSide || !address || !purchaseTxHash) return;

      const response = await fetch('/api/weather-lotto/buy-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerFid: userFid,
          playerAddress: address,
          side: selectedSide,
          quantity: quantity,
          transactionHash: purchaseTxHash
        })
      });

      if (response.ok) {
        console.log('✅ Purchase successful, refreshing modal...');
        await fetchWeatherLottoData();
        onPurchaseSuccess?.();
        setStep(PurchaseStep.Idle);
        setSelectedSide(null);
        setErrorMessage(null);
        setPurchaseTxHash(undefined);
        setApproveTxHash(undefined);
        // Reset all states for next purchase
        setTimeout(() => {
          setErrorMessage('✅ Purchase successful! You can now buy tickets for the other side.');
        }, 500);
      } else {
        const error = await response.json();
        setErrorMessage(error.error || 'Failed to save ticket to database');
        setStep(PurchaseStep.Idle);
      }
    } catch (error) {
      console.error('Error saving ticket to database:', error);
      setErrorMessage('Failed to save ticket to database');
      setStep(PurchaseStep.Idle);
    }
  };


  const handleManualDraw = async () => {
    // Prevent double-clicking during manual draw
    if (isManualDrawing) {
      console.log('⚠️ Manual draw already in progress, ignoring click');
      return;
    }

    try {
      setIsManualDrawing(true);
      setErrorMessage(null);
      
      const response = await fetch('/api/weather-lotto/draw-winner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Manual draw successful:', result);
        // Show draw result
        setDrawResult({
          winner: result.round?.winning_side || 'unknown',
          round: result.round?.round_number || 0
        });
        // Hide result after 8 seconds
        setTimeout(() => setDrawResult(null), 8000);
        // Refresh data
        await fetchWeatherLottoData();
      } else {
        console.error('❌ Manual draw failed:', result.error);
        setErrorMessage(result.error || 'Manual draw failed');
      }
    } catch (error) {
      console.error('❌ Manual draw error:', error);
      setErrorMessage('Manual draw failed');
    } finally {
      setIsManualDrawing(false);
    }
  };

  const handleClaimWinnings = async (ticketId: number) => {
    if (!address || !isConnected) {
      setErrorMessage('Please connect your wallet to claim winnings');
      return;
    }

    // Find the ticket to get its round_id
    const ticket = userTickets.find(t => t.id === ticketId);
    if (!ticket) {
      setErrorMessage('Ticket not found');
      return;
    }

    console.log('🔍 Frontend claim request:', { 
      ticketId, 
      userFid, 
      round_id: ticket.round_id,
      ticket: ticket 
    });

    try {
      setClaimingTicket(ticketId);
      setErrorMessage(null);

      const response = await fetch('/api/weather-lotto/claim-winnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_fid: userFid,
          round_id: ticket.round_id
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Claim successful:', result);
        await fetchWeatherLottoData();
        setErrorMessage('✅ Winnings claimed successfully!');
        setTimeout(() => setErrorMessage(null), 3000);
      } else {
        console.error('❌ Claim failed:', result.error);
        setErrorMessage(result.error || 'Claim failed');
      }
    } catch (error) {
      console.error('❌ Claim error:', error);
      setErrorMessage('Claim failed');
    } finally {
      setClaimingTicket(null);
    }
  };

  const handlePurchase = async () => {
    if (!selectedSide || !address || !isConnected) return;
    
    // Prevent double-clicking during transaction
    if (step !== PurchaseStep.Idle && step !== PurchaseStep.ReadyToPurchase) {
      console.log('⚠️ Purchase already in progress, ignoring click');
      return;
    }

    try {
      setErrorMessage(null);
      console.log('🔍 Starting purchase:', { allowance: allowance?.toString(), totalCost: totalCost.toString() });

      // Check allowance
      if (!allowance || allowance < totalCost) {
        console.log('⚠️ Insufficient allowance, requesting approve...');
        setStep(PurchaseStep.Approving);
        
        // Prevent multiple approve calls
        if (isPending) {
          console.log('⚠️ Transaction already pending, ignoring approve request');
          return;
        }
        
        const approveHash = await writeContractAsync({
          address: CHESS_TOKEN_ADDRESS,
          abi: CHESS_TOKEN_ABI,
          functionName: 'approve',
          args: [WEATHER_LOTTO_ADDRESS, totalCost]
        });
        setApproveTxHash(approveHash);
        setStep(PurchaseStep.ApproveConfirming);
        return;
      }

      console.log('✅ Sufficient allowance, proceeding with purchase...');

      // Purchase tickets
      setStep(PurchaseStep.Purchasing);
      
      // Prevent multiple purchase calls
      if (isPending) {
        console.log('⚠️ Transaction already pending, ignoring purchase request');
        return;
      }
      
      const purchaseHash = await writeContractAsync({
        address: WEATHER_LOTTO_ADDRESS,
        abi: WEATHER_LOTTO_ABI,
        functionName: selectedSide === 'sunny' ? 'buySunnyTickets' : 'buyRainyTickets',
        args: [BigInt(quantity)]
      });
      setPurchaseTxHash(purchaseHash);
      setStep(PurchaseStep.PurchaseConfirming);

    } catch (error: any) {
      console.error('Purchase error:', error);
      setErrorMessage(error.message || 'Transaction failed');
      setStep(PurchaseStep.Idle);
    }
  };

  const formatNumber = (num: number | bigint | string) => {
    let value: number;
    
    if (typeof num === 'string') {
      value = Number(num) / 1e18;
    } else if (typeof num === 'bigint') {
      value = Number(num) / 1e18;
    } else {
      value = num;
    }
    
    // Rövidített formátum: 100k, 1m, 10m stb.
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'm';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'k';
    } else {
      return value.toFixed(0);
    }
  };

  const formatTime = (time: string) => {
    return new Date(time).toLocaleString('hu-HU');
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-purple-900 via-black to-purple-900 rounded-2xl shadow-2xl p-6 max-w-2xl w-full max-h-[95vh] flex flex-col border border-[#a64d79] relative shadow-[0_0_30px_rgba(166,77,121,0.4)] pulse-glow">
          
          {/* Draw Result Overlay */}
          {drawResult && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl">
              <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 p-8 rounded-2xl shadow-2xl text-center animate-pulse">
                <div className="text-6xl mb-4">
                  {drawResult.winner === 'sunny' ? '☀️' : '🌧️'}
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {drawResult.winner === 'sunny' ? 'SUNNY WINS!' : 'RAINY WINS!'}
                </div>
                <div className="text-xl text-white/90">
                  Round #{drawResult.round}
                </div>
                <div className="text-sm text-white/70 mt-2">
                  🎉 Congratulations! 🎉
                </div>
              </div>
            </div>
          )}
          <div className="relative z-10 flex flex-col items-center mb-6">
            <div className="w-full flex justify-center items-center mb-2">
              <div className="flex items-center justify-center gap-2">
                <FiSun size={38} className="text-yellow-300" />
                <h1 className="text-3xl font-bold text-white uppercase tracking-[0.02em]">SUNNY/RAINY</h1>
              </div>
            </div>
            <p className="text-purple-200 text-sm font-medium mt-1 text-center">Weather Lottery</p>
            <p className="text-cyan-300 text-xs font-medium mt-1 text-center">The decision is in your hands - choose your side, draw your fate!</p>
            
            {/* Manual Draw Button */}
            <button 
              onClick={handleManualDraw}
              disabled={!currentRound || currentRound.total_tickets < 6 || isManualDrawing}
              className={`mt-3 px-4 py-2 text-white text-sm font-bold rounded-lg transition-all duration-300 hover:scale-105 shadow-lg ${
                !currentRound || currentRound.total_tickets < 6 || isManualDrawing
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-500 via-purple-500 via-blue-500 to-green-500 bg-[length:400%_400%] pulse-color shadow-[0_0_20px_rgba(255,0,255,0.6)] hover:shadow-[0_0_30px_rgba(0,255,255,0.8)]'
              }`}
            >
              {isManualDrawing ? '🎲 Drawing...' : `🎲 Manual Draw ${!currentRound || currentRound.total_tickets < 6 ? '(Min 6 tickets)' : ''}`}
            </button>
            
            <button onClick={onClose} className="absolute top-0 right-0 p-2 rounded-full bg-[#23283a] border border-[#a64d79] hover:bg-[#2a2f42] text-white transition-all duration-300 hover:scale-110"><FiX size={24} /></button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center"><div className="text-cyan-400 text-2xl font-bold animate-pulse">Loading weather lotto...</div></div>
          ) : (
            <div className="relative z-10 flex-1 overflow-y-auto space-y-6">

              <div className="bg-transparent rounded-xl p-4 border border-[#a64d79] shadow-lg">
                <div className="py-3 px-2 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-2 border-yellow-400/50 rounded-xl animate-pulse shadow-[0_0_25px_rgba(255,255,0,0.4)] pulse-glow" style={{ animationDuration: '4s' }}>
                  <h3 className="text-xl font-bold text-white mb-4 text-center drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"><FiZap className="inline mr-2" /> Choose Your Side</h3>
              
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedSide('sunny')}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      selectedSide === 'sunny'
                        ? 'border-orange-400 bg-gradient-to-br from-yellow-100 to-orange-100 shadow-lg'
                        : 'border-gray-600 hover:border-orange-300 hover:bg-gradient-to-br hover:from-yellow-50 hover:to-orange-50'
                    }`}
                  >
                      <div className="text-center">
                        <FiSun className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                        <div className="font-semibold text-orange-700 text-lg">Sunny ☀️</div>
                        <div className="text-sm text-orange-600">100k CHESS base</div>
                        <div className="mt-2 pt-2 border-t border-orange-200">
                          <div className="text-sm text-green-600 font-semibold">
                            Win: {currentRound ? (currentRound.sunny_tickets > 0 ? formatNumber((currentRound.total_tickets * 100000 * 0.7) / currentRound.sunny_tickets) : '100k') : '100k'} CHESS
                          </div>
                          <div className="text-sm text-orange-600">
                            ROI: {currentRound && currentRound.sunny_tickets > 0 ? ((((currentRound.total_tickets * 100000 * 0.7) / currentRound.sunny_tickets) / 100000 - 1) * 100).toFixed(1) : '0'}%
                          </div>
                        </div>
                      </div>
                  </button>

                  <button
                    onClick={() => setSelectedSide('rainy')}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      selectedSide === 'rainy'
                        ? 'border-blue-400 bg-gradient-to-br from-blue-100 to-indigo-100 shadow-lg'
                        : 'border-gray-600 hover:border-blue-300 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50'
                    }`}
                  >
                      <div className="text-center">
                        <FiCloudRain className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                        <div className="font-semibold text-blue-700 text-lg">Rainy 🌧️</div>
                        <div className="text-sm text-blue-600">100k CHESS base</div>
                        <div className="mt-2 pt-2 border-t border-blue-200">
                          <div className="text-sm text-green-600 font-semibold">
                            Win: {currentRound ? (currentRound.rainy_tickets > 0 ? formatNumber((currentRound.total_tickets * 100000 * 0.7) / currentRound.rainy_tickets) : '100k') : '100k'} CHESS
                          </div>
                          <div className="text-sm text-blue-600">
                            ROI: {currentRound && currentRound.rainy_tickets > 0 ? ((((currentRound.total_tickets * 100000 * 0.7) / currentRound.rainy_tickets) / 100000 - 1) * 100).toFixed(1) : '0'}%
                          </div>
                        </div>
                      </div>
                  </button>
                </div>
                </div>
              </div>

              {/* Round Info - Always visible */}
              {currentRound && (
                <div className="bg-transparent rounded-xl p-4 border border-[#a64d79] shadow-lg">
                  <div className="py-3 px-6 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-2 border-yellow-400/50 rounded-xl animate-pulse shadow-[0_0_25px_rgba(255,255,0,0.4)] pulse-glow" style={{ animationDuration: '4s' }}>
                    <div className="w-full grid grid-cols-3 items-center justify-items-center gap-4">
                      <div className="text-center min-w-0"><div className="text-xs font-bold text-yellow-300 mb-1">TIME LEFT</div><div className="text-base font-bold text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">{timeRemaining}</div></div>
                      <div className="text-center border-l-2 border-r-2 border-yellow-400/30 px-4 min-w-0 w-full"><div className="text-xs font-bold text-yellow-300 mb-1">POOL</div><div className="text-lg font-bold text-cyan-300 animate-pulse drop-shadow-[0_0_10px_rgba(34,211,238,0.9)]" style={{ animationDuration: '4s' }}>{formatNumber(currentRound.current_total_pool)} CHESS</div></div>
                      <div className="text-center min-w-0"><div className="text-xs font-bold text-yellow-300 mb-1">ROUND</div><div className="text-base font-bold text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">#{currentRound.round_number}</div></div>
                    </div>
                  </div>
                </div>
              )}

              {selectedSide && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-cyan-400 mb-2">
                      Tickets: 1 (Fixed)
                    </label>
                  </div>


                  {errorMessage && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-600 text-sm">{errorMessage}</p>
                    </div>
                  )}

                    {!isConnected ? (
                      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                        <p className="text-red-400 text-sm text-center">⚠️ Please connect your wallet to purchase tickets</p>
                      </div>
                    ) : (
                      <button
                        onClick={handlePurchase}
                        disabled={step !== PurchaseStep.Idle && step !== PurchaseStep.ReadyToPurchase}
                        className={`w-full py-4 px-6 rounded-xl font-bold text-xl transition-all duration-300 disabled:cursor-not-allowed hover:scale-105 shadow-lg pulse-glow ${
                          step === PurchaseStep.Approving || step === PurchaseStep.ApproveConfirming
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                            : step === PurchaseStep.Purchasing || step === PurchaseStep.PurchaseConfirming || step === PurchaseStep.Saving
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                            : step !== PurchaseStep.Idle && step !== PurchaseStep.ReadyToPurchase
                            ? 'bg-gray-600 text-gray-400'
                            : selectedSide === 'sunny'
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white'
                            : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white'
                        }`}
                      >
                        {step === PurchaseStep.Approving && '1️⃣ Approving CHESS...'}
                        {step === PurchaseStep.ApproveConfirming && '1️⃣ Confirming Approval...'}
                        {step === PurchaseStep.ReadyToPurchase && '2️⃣ Buy Ticket'}
                        {step === PurchaseStep.Purchasing && '2️⃣ Buying Ticket...'}
                        {step === PurchaseStep.PurchaseConfirming && '2️⃣ Confirming Purchase...'}
                        {step === PurchaseStep.Saving && '2️⃣ Saving...'}
                        {step === PurchaseStep.Idle && '1️⃣ Approve & 2️⃣ Buy Ticket'}
                      </button>
                    )}

                </div>
              )}

            {/* My Tickets Section - Show all tickets */}
            {userTickets.length > 0 && (
              <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79] pulse-glow">
                <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center justify-center gap-2"><FiUsers /> My Tickets ({userTickets.length})</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {userTickets.slice(0, 10).map((ticket) => (
                    <div key={ticket.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-600">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          {ticket.side === 'sunny' ? (
                            <FiSun className="w-4 h-4 text-orange-500" />
                          ) : (
                            <FiCloudRain className="w-4 h-4 text-blue-500" />
                          )}
                          <span className="font-medium capitalize text-sm text-gray-300">{ticket.side}</span>
                          <span className="text-xs text-gray-400">Round #{ticket.round_number}</span>
                        </div>
                        <div className="text-sm text-yellow-400">
                          {formatNumber(ticket.total_cost)} CHESS
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className={ticket.round_status === 'completed' ? 'text-green-400' : 'text-yellow-400'}>
                            {ticket.round_status === 'completed' ? 'Completed' : 'Active'}
                          </span>
                        </div>
                        {ticket.round_status === 'completed' && (
                          <div className="flex justify-between">
                            <span>Result:</span>
                            <span className={ticket.winning_side === ticket.side ? 'text-green-400' : 'text-red-400'}>
                              {ticket.winning_side === ticket.side ? 'Won' : 'Lost'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {userTickets.length > 0 && (() => {
              // Filter tickets that can be claimed (winning tickets from completed rounds)
              const claimableTickets = userTickets.filter(ticket => 
                ticket.round_status === 'completed' && 
                ticket.winning_side === ticket.side && 
                ticket.payout_amount && 
                parseInt(ticket.payout_amount) > 0
              );
              
              return claimableTickets.length > 0 && (
                <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79] pulse-glow">
                  <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center justify-center gap-2"><FiUsers /> Claimable Winnings ({claimableTickets.length})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {claimableTickets.map((ticket) => {
                      // Calculate potential win/loss for this ticket
                      const currentSideTickets = ticket.side === 'sunny' ? (currentRound?.sunny_tickets || 0) : (currentRound?.rainy_tickets || 0);
                      const otherSideTickets = ticket.side === 'sunny' ? (currentRound?.rainy_tickets || 0) : (currentRound?.sunny_tickets || 0);
                      
                      // If this side wins: 7k CHESS pool / total tickets on this side * ticket quantity
                      const potentialWin = currentSideTickets > 0 ? ((currentRound?.total_tickets || 0) * 100000 * 0.7 / currentSideTickets) * ticket.quantity : 0;
                      const potentialLoss = Number(ticket.total_cost) / 100000000000000000000000; // Convert from wei to CHESS
                      const netResult = potentialWin - potentialLoss;
                      
                      return (
                        <div key={ticket.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-600">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              {ticket.side === 'sunny' ? (
                                <FiSun className="w-5 h-5 text-orange-500" />
                              ) : (
                                <FiCloudRain className="w-5 h-5 text-blue-500" />
                              )}
                              <span className="font-medium capitalize text-sm text-gray-300">{ticket.side}</span>
                              <span className="text-xs text-gray-400">x{ticket.quantity}</span>
                            </div>
                            <div className="text-sm text-yellow-400">
                              {formatNumber(ticket.total_cost)} CHESS
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 border-t border-gray-600 pt-2">
                            <div className="flex justify-between">
                              <span>If {ticket.side} wins:</span>
                              <span className={netResult >= 0 ? 'text-green-400' : 'text-red-400'}>
                                {netResult >= 0 ? '+' : ''}{formatNumber(netResult)} CHESS
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>If {ticket.side === 'sunny' ? 'rainy' : 'sunny'} wins:</span>
                              <span className="text-red-400">
                                0 CHESS
                              </span>
                            </div>
                          </div>
                          
                          {/* Debug info */}
                          <div className="mt-2 p-2 bg-gray-900 rounded text-xs text-gray-400">
                            <div>Round: {ticket.round_status} | Winner: {ticket.winning_side} | Side: {ticket.side}</div>
                            <div>Payout: {formatNumber(ticket.payout_amount)} CHESS | Claim: {ticket.claim_status}</div>
                          </div>
                          
                          {/* Claim Button - Only show if not already claimed */}
                          {ticket.round_status === 'completed' && ticket.winning_side === ticket.side && !ticket.is_claimed && (
                            <div className="mt-3 pt-2 border-t border-gray-600">
                              <div className="flex justify-between items-center">
                                <div className="text-sm">
                                  <span className="text-green-400 font-semibold">
                                    Won: {ticket.payout_amount ? formatNumber(ticket.payout_amount) : 'Calculating...'} CHESS
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleClaimWinnings(ticket.id)}
                                  disabled={claimingTicket === ticket.id || ticket.claim_status === 'paid'}
                                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all duration-300 ${
                                    ticket.claim_status === 'paid'
                                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                      : claimingTicket === ticket.id
                                      ? 'bg-yellow-600 text-white cursor-not-allowed'
                                      : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white hover:scale-105'
                                  }`}
                                >
                                  {ticket.claim_status === 'paid' 
                                    ? '✅ Claimed' 
                                    : claimingTicket === ticket.id 
                                    ? '⏳ Claiming...' 
                                    : '💰 Claim Prize'
                                  }
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {/* Show "Already Claimed" if ticket is claimed */}
                          {ticket.round_status === 'completed' && ticket.winning_side === ticket.side && ticket.is_claimed && (
                            <div className="mt-3 pt-2 border-t border-gray-600">
                              <div className="flex justify-between items-center">
                                <div className="text-sm">
                                  <span className="text-green-400 font-semibold">
                                    Won: {ticket.payout_amount ? formatNumber(ticket.payout_amount) : 'Calculating...'} CHESS
                                  </span>
                                </div>
                                <div className="px-3 py-1 text-xs font-bold rounded-lg bg-gray-600 text-gray-400">
                                  ✅ Already Claimed
                                </div>
                              </div>
                            </div>
                          )}
                          
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

              {/* Rules Section */}
              <div className="bg-transparent rounded-xl p-4 border border-[#a64d79] shadow-lg">
                <h3 className="text-lg font-bold text-cyan-400 mb-3 flex items-center justify-center gap-2">📋 Rules</h3>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400 font-bold">1️⃣</span>
                    <span>You can buy tickets for <span className="text-orange-400 font-semibold">both Sunny and Rainy</span> sides</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400 font-bold">2️⃣</span>
                    <span><span className="text-green-400 font-semibold">Draw yourself, decide your fate!</span></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400 font-bold">3️⃣</span>
                    <span>House provides <span className="text-purple-400 font-semibold">100k CHESS</span> base for each side</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400 font-bold">4️⃣</span>
                    <span>Daily draw at <span className="text-cyan-400 font-semibold">20:05 UTC</span></span>
                  </div>
                </div>
              </div>

              <div className="bg-transparent rounded-xl p-4 border border-[#a64d79] shadow-lg">
                <h3 className="text-lg font-bold text-purple-400 mb-3 flex items-center justify-center gap-2">📊 Last 5 Rounds</h3>
                
                {/* Last 10 Rounds - Simple List */}
                {recentRounds.length > 0 ? (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {recentRounds.slice(0, 5).map((round) => (
                      <div key={round.id} className="bg-gray-800 rounded p-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-yellow-400">Round #{round.round_number}</span>
                          <div className="flex items-center gap-2">
                            {round.winning_side === 'sunny' ? (
                              <>
                                <FiSun className="w-4 h-4 text-orange-500" />
                                <span className="text-orange-400 font-semibold">☀️ Sunny</span>
                              </>
                            ) : round.winning_side === 'rainy' ? (
                              <>
                                <FiCloudRain className="w-4 h-4 text-blue-500" />
                                <span className="text-blue-400 font-semibold">🌧️ Rainy</span>
                              </>
                            ) : (
                              <span className="text-gray-400">Pending</span>
                            )}
                          </div>
                        </div>
                        {round.winning_side && (
                          <div className="text-xs text-gray-400 mt-1">
                            ☀️ {round.sunny_tickets} / 🌧️ {round.rainy_tickets} tickets
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-4">
                    No completed rounds yet
                  </div>
                )}
              </div>

          </div>
        )}
        </div>
      </div>
      <style jsx>{`
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 4px #a259ff, 0 0 8px #a259ff, 0 0 16px #a259ff; }
          50% { box-shadow: 0 0 8px #a259ff, 0 0 16px #a259ff, 0 0 24px #a259ff; }
          100% { box-shadow: 0 0 4px #a259ff, 0 0 8px #a259ff, 0 0 16px #a259ff; }
        }
        @keyframes pulseColor {
          0% { background-position: 0% 50%; }
          25% { background-position: 100% 50%; }
          50% { background-position: 100% 50%; }
          75% { background-position: 0% 50%; }
          100% { background-position: 0% 50%; }
        }
        .pulse-glow { animation: pulseGlow 3.5s ease-in-out infinite; border: 2px solid #a259ff; }
        .pulse-color { animation: pulseColor 3s ease-in-out infinite; }
      `}</style>
    </>
  );
}

