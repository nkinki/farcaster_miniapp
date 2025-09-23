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
        
        // Fetch tickets for current round only
        if (userFid && roundData.round) {
          const ticketsRes = await fetch(`/api/weather-lotto/user-tickets?fid=${userFid}&round_id=${roundData.round.id}`);
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
    if (currentRound) {
      const updateTimer = () => {
        const now = new Date().getTime();
        const endTime = new Date(currentRound.end_time).getTime();
        const timeLeft = Math.max(0, endTime - now);

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
    }
  }, [currentRound]);

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
    try {
      const response = await fetch('/api/weather-lotto/draw-winner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Manual draw successful:', result);
        // Refresh data
        fetchWeatherLottoData();
      } else {
        console.error('❌ Manual draw failed:', result.error);
        setErrorMessage(result.error || 'Manual draw failed');
      }
    } catch (error) {
      console.error('❌ Manual draw error:', error);
      setErrorMessage('Manual draw failed');
    }
  };

  const handlePurchase = async () => {
    if (!selectedSide || !address || !isConnected) return;

    try {
      setErrorMessage(null);
      console.log('🔍 Starting purchase:', { allowance: allowance?.toString(), totalCost: totalCost.toString() });

      // Check allowance
      if (!allowance || allowance < totalCost) {
        console.log('⚠️ Insufficient allowance, requesting approve...');
        setStep(PurchaseStep.Approving);
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
          <div className="relative z-10 flex flex-col items-center mb-6">
            <div className="w-full flex justify-center items-center mb-2">
              <div className="flex items-center justify-center gap-2">
                <FiSun size={38} className="text-yellow-300" />
                <h1 className="text-3xl font-bold text-white uppercase tracking-[0.02em]">SUNNY/RAINY</h1>
              </div>
            </div>
            <p className="text-purple-200 text-sm font-medium mt-1 text-center">Weather Lottery</p>
            
            {/* Manual Draw Button */}
            <button 
              onClick={handleManualDraw}
              className="mt-3 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white text-sm font-bold rounded-lg transition-all duration-300 hover:scale-105 shadow-lg"
            >
              🎲 Manual Draw
            </button>
            
            <button onClick={onClose} className="absolute top-0 right-0 p-2 rounded-full bg-[#23283a] border border-[#a64d79] hover:bg-[#2a2f42] text-white transition-all duration-300 hover:scale-110"><FiX size={24} /></button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center"><div className="text-cyan-400 text-2xl font-bold animate-pulse">Loading weather lotto...</div></div>
          ) : (
            <div className="relative z-10 flex-1 overflow-y-auto space-y-6">

              <div className="bg-white rounded-xl p-4 border border-[#a64d79] shadow-lg pulse-glow">
                <h3 className="text-xl font-bold text-gray-800 mb-4 text-center"><FiZap className="inline mr-2" /> Choose Your Side</h3>
              
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setSelectedSide('sunny')}
                    className={`p-4 rounded-xl border-2 transition-all ${
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
                    className={`p-4 rounded-xl border-2 transition-all ${
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

              {/* Round Info - Always visible */}
              {currentRound && (
                <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79] pulse-glow">
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

                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">Cost:</span>
                      <span className="font-semibold">{formatNumber(totalCost)} CHESS</span>
                    </div>
                    
                    {/* Real-time win calculation - ultra compact */}
                    <div className="pt-1 border-t border-gray-200">
                      <div className="text-center">
                        <div className="text-xs text-gray-600 mb-1">
                          Win with 1 ticket: {currentRound ? formatNumber(
                            ((currentRound.total_tickets * 100000 * 0.7) / Math.max((selectedSide === 'sunny' ? currentRound.sunny_tickets : currentRound.rainy_tickets) + 1, 1))
                          ) : '0'} CHESS
                        </div>
                        <div className="text-xs text-gray-500">
                          ROI: {currentRound ? (
                            ((((currentRound.total_tickets * 100000 * 0.7) / Math.max((selectedSide === 'sunny' ? currentRound.sunny_tickets : currentRound.rainy_tickets) + 1, 1)) / 
                            100000 - 1) * 100).toFixed(1)
                          ) : '0'}%
                        </div>
                      </div>
                    </div>
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

            {userTickets.length > 0 && (
                <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79] pulse-glow">
                  <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center justify-center gap-2"><FiUsers /> Your Tickets ({userTickets.length})</h3>
                  <div className="space-y-2">
                    {userTickets.slice(0, 5).map((ticket) => {
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Rules Section */}
              <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79] pulse-glow">
                <h3 className="text-lg font-bold text-cyan-400 mb-3 flex items-center justify-center gap-2">📋 Rules</h3>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400 font-bold">1️⃣</span>
                    <span>You can buy tickets for <span className="text-orange-400 font-semibold">both Sunny and Rainy</span> sides</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400 font-bold">2️⃣</span>
                    <span>Each purchase is <span className="text-green-400 font-semibold">1 ticket only</span></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400 font-bold">3️⃣</span>
                    <span>House provides <span className="text-purple-400 font-semibold">100k CHESS</span> base for each side</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400 font-bold">4️⃣</span>
                    <span>Winners get <span className="text-green-400 font-semibold">70%</span> of total pool, <span className="text-purple-400 font-semibold">30%</span> goes to treasury</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400 font-bold">5️⃣</span>
                    <span>Daily draw at <span className="text-cyan-400 font-semibold">19:05 UTC</span></span>
                  </div>
                </div>
              </div>

              <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79] pulse-glow">
                <h3 className="text-lg font-bold text-purple-400 mb-3 flex items-center justify-center gap-2">📊 Statistics</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Rounds:</span>
                      <span className="font-semibold text-cyan-400">{stats?.total_rounds || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Current Round:</span>
                      <span className="font-semibold text-cyan-400">{currentRound?.total_tickets || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">☀️ / 🌧️:</span>
                      <span className="font-semibold text-orange-400">{currentRound?.sunny_tickets || 0} / {currentRound?.rainy_tickets || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Volume:</span>
                      <span className="font-semibold text-green-400">{formatNumber(stats?.total_volume || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Payouts:</span>
                      <span className="font-semibold text-green-400">{formatNumber(stats?.total_payouts || 0)}</span>
                    </div>
                    
                    {/* Last Round Results */}
                    {currentRound && currentRound.status === 'completed' && (
                      <>
                        <div className="border-t border-gray-600 pt-3 mt-3">
                          <div className="text-sm font-semibold text-cyan-400 mb-2 text-center">
                            🏆 Last Round Results
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-300">Winner:</span>
                              <div className="flex items-center gap-1">
                                {currentRound.winning_side === 'sunny' ? (
                                  <FiSun className="w-3 h-3 text-orange-500" />
                                ) : (
                                  <FiCloudRain className="w-3 h-3 text-blue-500" />
                                )}
                                <span className="font-semibold text-yellow-400 capitalize">
                                  {currentRound.winning_side}
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-300">Tickets:</span>
                              <span className="font-semibold text-cyan-400">{currentRound.total_tickets}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-300">☀️ Won:</span>
                              <span className="font-semibold text-orange-400">
                                {currentRound.winning_side === 'sunny' ? formatNumber(currentRound.winners_pool) : '0'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-300">🌧️ Won:</span>
                              <span className="font-semibold text-blue-400">
                                {currentRound.winning_side === 'rainy' ? formatNumber(currentRound.winners_pool) : '0'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-300">Treasury:</span>
                              <span className="font-semibold text-purple-400">{formatNumber(currentRound.treasury_amount)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-300">Total Pool:</span>
                              <span className="font-semibold text-yellow-400">{formatNumber(currentRound.current_total_pool)}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* Last 5 Rounds */}
                    {recentRounds.length > 0 && (
                      <>
                        <div className="border-t border-gray-600 pt-3 mt-3">
                          <div className="text-sm font-semibold text-cyan-400 mb-2 text-center">
                            📊 Last 5 Rounds
                          </div>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {recentRounds.slice(0, 5).map((round) => (
                              <div key={round.id} className="bg-gray-800 rounded p-3 text-xs">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-semibold text-yellow-400">Round #{round.round_number}</span>
                                  <div className="flex items-center gap-1">
                                    {round.winning_side === 'sunny' ? (
                                      <FiSun className="w-3 h-3 text-orange-500" />
                                    ) : round.winning_side === 'rainy' ? (
                                      <FiCloudRain className="w-3 h-3 text-blue-500" />
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                    <span className="text-gray-300 capitalize">{round.winning_side || 'Pending'}</span>
                                  </div>
                                </div>
                                
                                {/* Tickets */}
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  <div className="text-center">
                                    <div className="text-orange-400 font-semibold">☀️ {round.sunny_tickets}</div>
                                    <div className="text-gray-400 text-xs">tickets</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-blue-400 font-semibold">🌧️ {round.rainy_tickets}</div>
                                    <div className="text-gray-400 text-xs">tickets</div>
                                  </div>
                                </div>
                                
                                {/* Winnings & Treasury */}
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="text-center">
                                    <div className="text-green-400 font-semibold">
                                      {round.winning_side ? formatNumber(round.winners_pool) : '0'}
                                    </div>
                                    <div className="text-gray-400 text-xs">Winner Prize</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-purple-400 font-semibold">{formatNumber(round.treasury_amount)}</div>
                                    <div className="text-gray-400 text-xs">Treasury</div>
                                  </div>
                                </div>
                                
                                {/* Total Pool */}
                                <div className="text-center mt-2 pt-2 border-t border-gray-700">
                                  <div className="text-yellow-400 font-semibold">{formatNumber(round.total_pool)}</div>
                                  <div className="text-gray-400 text-xs">Total Pool</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
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
        .pulse-glow { animation: pulseGlow 3.5s ease-in-out infinite; border: 2px solid #a259ff; }
      `}</style>
    </>
  );
}

