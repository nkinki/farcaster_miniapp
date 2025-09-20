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

  // --- Állapotok ---
  const [currentRound, setCurrentRound] = useState<WeatherLottoRound | null>(null);
  const [userTickets, setUserTickets] = useState<WeatherLottoTicket[]>([]);
  const [stats, setStats] = useState<WeatherLottoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSide, setSelectedSide] = useState<'sunny' | 'rainy' | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  
  const [step, setStep] = useState<PurchaseStep>(PurchaseStep.Idle);
  const [approveTxHash, setApproveTxHash] = useState<Hash | undefined>();
  const [purchaseTxHash, setPurchaseTxHash] = useState<Hash | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { isLoading: isApproveConfirming, isSuccess: isApproved } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isLoading: isPurchaseConfirming, isSuccess: isPurchased } = useWaitForTransactionReceipt({ hash: purchaseTxHash });

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
      const [roundRes, ticketsRes, statsRes] = await Promise.all([
        fetch('/api/weather-lotto/current-round'),
        userFid ? fetch(`/api/weather-lotto/user-tickets?fid=${userFid}`) : Promise.resolve(null),
        fetch('/api/weather-lotto/stats')
      ]);

      if (roundRes.ok) {
        const roundData = await roundRes.json();
        setCurrentRound(roundData.round);
      }
      if (ticketsRes?.ok) {
        const ticketsData = await ticketsRes.json();
        setUserTickets(ticketsData.tickets || []);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
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
      setStep(PurchaseStep.ReadyToPurchase);
    }
  }, [isApproved, step]);

  useEffect(() => {
    if (isPurchased && step === PurchaseStep.PurchaseConfirming) {
      setStep(PurchaseStep.Saving);
      handleSaveTicket();
    }
  }, [isPurchased, step]);

  const handleSaveTicket = async () => {
    try {
      if (!selectedSide || !address) return;

      const response = await fetch('/api/weather-lotto/buy-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerFid: userFid,
          playerAddress: address,
          side: selectedSide,
          quantity: quantity
        })
      });

      if (response.ok) {
        await fetchWeatherLottoData();
        onPurchaseSuccess?.();
        setStep(PurchaseStep.Idle);
        setSelectedSide(null);
        setQuantity(1);
        setErrorMessage(null);
      } else {
        const error = await response.json();
        setErrorMessage(error.error || 'Failed to save ticket');
        setStep(PurchaseStep.Idle);
      }
    } catch (error) {
      console.error('Error saving ticket:', error);
      setErrorMessage('Failed to save ticket');
      setStep(PurchaseStep.Idle);
    }
  };

  const handlePurchase = async () => {
    if (!selectedSide || !address || !isConnected) return;

    try {
      setErrorMessage(null);

      // Check allowance
      if (!allowance || allowance < totalCost) {
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
    if (typeof num === 'string') {
      return new Intl.NumberFormat('hu-HU').format(Number(num) / 1e18);
    }
    if (typeof num === 'bigint') {
      return new Intl.NumberFormat('hu-HU').format(Number(num) / 1e18);
    }
    return new Intl.NumberFormat('hu-HU').format(num);
  };

  const formatTime = (time: string) => {
    return new Date(time).toLocaleString('hu-HU');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl">
                <FiSun className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">SUNNY/RAINY</h2>
                <p className="text-sm text-gray-600">☀️ vs 🌧️</p>
              </div>
            </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading weather lotto data...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Current Round Info */}
            {currentRound && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Round #{currentRound.round_number}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiClock className="w-4 h-4" />
                    <span>{timeRemaining}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg p-3 border border-yellow-300">
                    <div className="text-2xl font-bold text-orange-600">{currentRound.sunny_tickets + 1}</div>
                    <div className="text-sm text-orange-700 font-semibold">Sunny Tickets</div>
                    <div className="text-xs text-orange-600">Base: 100k + {currentRound.sunny_tickets} players</div>
                    <div className="text-xs text-green-600 font-semibold">
                      Win: {formatNumber(currentRound.winners_pool / (currentRound.sunny_tickets + 1))} CHESS
                    </div>
                  </div>
                  <div className="text-center bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg p-3 border border-blue-300">
                    <div className="text-2xl font-bold text-blue-600">{currentRound.rainy_tickets + 1}</div>
                    <div className="text-sm text-blue-700 font-semibold">Rainy Tickets</div>
                    <div className="text-xs text-blue-600">Base: 100k + {currentRound.rainy_tickets} players</div>
                    <div className="text-xs text-green-600 font-semibold">
                      Win: {formatNumber(currentRound.winners_pool / (currentRound.rainy_tickets + 1))} CHESS
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Pool:</span>
                    <span className="font-semibold">{formatNumber(currentRound.current_total_pool)} CHESS</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Winners Pool (70%):</span>
                    <span className="font-semibold text-green-600">{formatNumber(currentRound.winners_pool)} CHESS</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Treasury (30%):</span>
                    <span className="font-semibold text-purple-600">{formatNumber(currentRound.treasury_amount)} CHESS</span>
                  </div>
                </div>
              </div>
            )}

            {/* Purchase Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Choose Your Side</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSelectedSide('sunny')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedSide === 'sunny'
                      ? 'border-orange-400 bg-gradient-to-br from-yellow-100 to-orange-100 shadow-lg'
                      : 'border-gray-200 hover:border-orange-300 hover:bg-gradient-to-br hover:from-yellow-50 hover:to-orange-50'
                  }`}
                >
                  <div className="text-center">
                    <FiSun className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                    <div className="font-semibold text-orange-700">Sunny ☀️</div>
                    <div className="text-sm text-orange-600">Current: {currentRound?.sunny_tickets || 0} tickets</div>
                    <div className="mt-2 pt-2 border-t border-orange-200">
                      <div className="text-xs text-green-600 font-semibold">
                        Win: {formatNumber((currentRound?.winners_pool || 0) / ((currentRound?.sunny_tickets || 0) + 1))} CHESS
                      </div>
                      <div className="text-xs text-orange-600">
                        ROI: {(((currentRound?.winners_pool || 0) / ((currentRound?.sunny_tickets || 0) + 1)) / Number(TICKET_PRICE) - 1) * 100}%
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedSide('rainy')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedSide === 'rainy'
                      ? 'border-blue-400 bg-gradient-to-br from-blue-100 to-indigo-100 shadow-lg'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50'
                  }`}
                >
                  <div className="text-center">
                    <FiCloudRain className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <div className="font-semibold text-blue-700">Rainy 🌧️</div>
                    <div className="text-sm text-blue-600">Current: {currentRound?.rainy_tickets || 0} tickets</div>
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <div className="text-xs text-green-600 font-semibold">
                        Win: {formatNumber((currentRound?.winners_pool || 0) / ((currentRound?.rainy_tickets || 0) + 1))} CHESS
                      </div>
                      <div className="text-xs text-blue-600">
                        ROI: {(((currentRound?.winners_pool || 0) / ((currentRound?.rainy_tickets || 0) + 1)) / Number(TICKET_PRICE) - 1) * 100}%
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              {selectedSide && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Tickets: {quantity}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1</span>
                      <span>10</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Total Cost:</span>
                      <span className="font-semibold">{formatNumber(totalCost)} CHESS</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Price per Ticket:</span>
                      <span className="font-semibold">{formatNumber(TICKET_PRICE)} CHESS</span>
                    </div>
                    
                    {/* Real-time win calculation */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-center">
                        <div className="text-sm text-gray-600 mb-1">If you win with {quantity} ticket{quantity > 1 ? 's' : ''}:</div>
                        <div className="text-lg font-bold text-green-600">
                          {formatNumber(
                            (currentRound?.winners_pool || 0) / 
                            ((selectedSide === 'sunny' ? currentRound?.sunny_tickets || 0 : currentRound?.rainy_tickets || 0) + quantity) * quantity
                          )} CHESS
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          ROI: {(
                            ((currentRound?.winners_pool || 0) / 
                            ((selectedSide === 'sunny' ? currentRound?.sunny_tickets || 0 : currentRound?.rainy_tickets || 0) + quantity) * quantity) / 
                            Number(totalCost) - 1
                          ) * 100}%
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
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-yellow-600 text-sm">Please connect your wallet to purchase tickets</p>
                    </div>
                  ) : (
                    <button
                      onClick={handlePurchase}
                      disabled={step !== PurchaseStep.Idle && step !== PurchaseStep.ReadyToPurchase}
                      className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                        step !== PurchaseStep.Idle && step !== PurchaseStep.ReadyToPurchase
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : selectedSide === 'sunny'
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg'
                      }`}
                    >
                      {step === PurchaseStep.Approving && 'Approving...'}
                      {step === PurchaseStep.ApproveConfirming && 'Confirming Approval...'}
                      {step === PurchaseStep.ReadyToPurchase && 'Purchase Tickets'}
                      {step === PurchaseStep.Purchasing && 'Purchasing...'}
                      {step === PurchaseStep.PurchaseConfirming && 'Confirming Purchase...'}
                      {step === PurchaseStep.Saving && 'Saving...'}
                      {step === PurchaseStep.Idle && 'Purchase Tickets'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* User Tickets */}
            {userTickets.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Your Tickets</h3>
                <div className="space-y-2">
                  {userTickets.slice(0, 5).map((ticket) => (
                    <div key={ticket.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {ticket.side === 'sunny' ? (
                            <FiSun className="w-4 h-4 text-yellow-500" />
                          ) : (
                            <FiCloudRain className="w-4 h-4 text-blue-500" />
                          )}
                          <span className="font-medium capitalize">{ticket.side}</span>
                          <span className="text-sm text-gray-600">x{ticket.quantity}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatNumber(ticket.total_cost)} CHESS
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            {stats && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Statistics</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Rounds:</span>
                    <span className="font-semibold ml-2">{stats.total_rounds}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Tickets:</span>
                    <span className="font-semibold ml-2">{stats.total_tickets_sold}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Volume:</span>
                    <span className="font-semibold ml-2">{formatNumber(stats.total_volume)} CHESS</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Payouts:</span>
                    <span className="font-semibold ml-2">{formatNumber(stats.total_payouts)} CHESS</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
