"use client"

import { useState, useEffect, useCallback } from "react";
import { FiX, FiDollarSign, FiClock, FiUsers, FiTrendingUp, FiZap, FiGift } from "react-icons/fi";
import { useAccount, useWaitForTransactionReceipt, useReadContract, useWriteContract } from 'wagmi';
import { type Hash } from 'viem';
import { LOTTO_PAYMENT_ROUTER_ADDRESS, LOTTO_PAYMENT_ROUTER_ABI, TICKET_PRICE } from '@/abis/LottoPaymentRouter';
import { CHESS_TOKEN_ADDRESS, CHESS_TOKEN_ABI } from '@/abis/chessToken';
import { sdk } from '@farcaster/miniapp-sdk';

// --- Interface definíciók ---
interface LotteryRound { id: number; round_number: number; start_date: string; end_date: string; draw_date: string; prize_pool: number; status: string; winner_fid?: number; winner_number?: number; total_tickets_sold: number; }
interface LotteryTicket { id: number; round_id: number; fid: number; ticket_number: number; purchase_price: number; purchased_at: string; }
interface LotteryStats { total_rounds: number; total_tickets_sold: number; total_prize_distributed: number; treasury_balance: number; }
interface RecentRound { id: number; draw_number: number; winning_number: number; jackpot: number; total_tickets: number; status: string; start_time: string; end_time: string; created_at: string; }
interface UserWinning { id: number; player_fid: number; draw_id: number; ticket_id: number; amount_won: number; claimed_at: string | null; created_at: string; draw_number: number; winning_number: number; ticket_number: number; }
interface LamboLotteryProps { isOpen: boolean; onClose: () => void; userFid: number; onPurchaseSuccess?: () => void; }

// Állapotgép a vásárlási folyamathoz, pont mint a PaymentForm-ban
enum PurchaseStep {
  Idle,
  Approving,
  ApproveConfirming,
  ReadyToPurchase,
  Purchasing,
  PurchaseConfirming,
  Saving,
}

export default function LamboLottery({ isOpen, onClose, userFid, onPurchaseSuccess }: LamboLotteryProps) {
  const { address, isConnected, chainId } = useAccount();

  // Pontosan mint a PaymentForm.tsx-ben, csak a useWriteContract-ot használjuk
  const { writeContractAsync, isPending } = useWriteContract();

  // --- Állapotok ---
  const [currentRound, setCurrentRound] = useState<LotteryRound | null>(null);
  const [userTickets, setUserTickets] = useState<LotteryTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [takenNumbers, setTakenNumbers] = useState<number[]>([]);
  const [lastWinningNumber, setLastWinningNumber] = useState<number | null>(null);
  const [recentRounds, setRecentRounds] = useState<RecentRound[]>([]);
  const [userWinnings, setUserWinnings] = useState<UserWinning[]>([]);
  const [stats, setStats] = useState<LotteryStats | null>(null);
  const [dailyCode, setDailyCode] = useState("");
  const [redeemStatus, setRedeemStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [showRecentResults, setShowRecentResults] = useState(false);
  const [showUserWinnings, setShowUserWinnings] = useState(false);
  const [loadingRecentResults, setLoadingRecentResults] = useState(false);
  const [loadingUserWinnings, setLoadingUserWinnings] = useState(false);

  const [step, setStep] = useState<PurchaseStep>(PurchaseStep.Idle);
  const [approveTxHash, setApproveTxHash] = useState<Hash | undefined>();
  const [purchaseTxHash, setPurchaseTxHash] = useState<Hash | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { isLoading: isApproveConfirming, isSuccess: isApproved } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isLoading: isPurchaseConfirming, isSuccess: isPurchased } = useWaitForTransactionReceipt({ hash: purchaseTxHash });

  const totalCost = TICKET_PRICE * BigInt(selectedNumbers.length);

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CHESS_TOKEN_ADDRESS,
    abi: CHESS_TOKEN_ABI,
    functionName: 'allowance',
    args: address ? [address, LOTTO_PAYMENT_ROUTER_ADDRESS] : undefined,
    query: { enabled: !!address }
  });

  const fetchEssentialData = useCallback(async () => {
    try {
      setLoading(true);
      const [roundRes, ticketsRes, statsRes, lastDrawRes] = await Promise.all([
        fetch('/api/lottery/current-round'),
        userFid ? fetch(`/api/lottery/user-tickets?fid=${userFid}`) : Promise.resolve(null),
        fetch('/api/lottery/stats'),
        fetch('/api/lottery/last-winning-number')
      ]);

      if (roundRes.ok) {
        const roundData = await roundRes.json();
        setCurrentRound(roundData.round);
        if (roundData.round?.id) {
          const takenRes = await fetch(`/api/lottery/taken-numbers?round_id=${roundData.round.id}`);
          if (takenRes.ok) setTakenNumbers((await takenRes.json()).takenNumbers || []);
        }
      }
      if (ticketsRes?.ok) setUserTickets((await ticketsRes.json()).tickets || []);
      if (statsRes.ok) setStats((await statsRes.json()).stats);
      if (lastDrawRes.ok) setLastWinningNumber((await lastDrawRes.json()).winning_number);
    } catch (error) {
      console.error('Failed to fetch essential lottery data:', error);
    } finally {
      setLoading(false);
    }
  }, [userFid]);

  const fetchRecentResults = async () => {
    if (showRecentResults) {
      setShowRecentResults(false);
      return;
    }
    // If we already have data, just show it immediately
    if (recentRounds.length > 0) {
      setShowRecentResults(true);
      return;
    }
    setLoadingRecentResults(true);
    try {
      const res = await fetch('/api/lottery/recent-results');
      if (res.ok) setRecentRounds((await res.json()).rounds || []);
      setShowRecentResults(true);
    } catch (error) {
      console.error('Failed to fetch recent results:', error);
    } finally {
      setLoadingRecentResults(false);
    }
  };

  const fetchUserWinnings = async () => {
    if (showUserWinnings) {
      setShowUserWinnings(false);
      return;
    }
    if (!userFid) return;
    // If we already have data, just show it immediately
    if (userWinnings.length > 0) {
      setShowUserWinnings(true);
      return;
    }
    setLoadingUserWinnings(true);
    try {
      const res = await fetch(`/api/lottery/user-winnings?fid=${userFid}`);
      if (res.ok) setUserWinnings((await res.json()).winnings || []);
      setShowUserWinnings(true);
    } catch (error) {
      console.error('Failed to fetch user winnings:', error);
    } finally {
      setLoadingUserWinnings(false);
    }
  };

  useEffect(() => {
    if (selectedNumbers.length > 0 && isConnected) {
      if (allowance !== undefined && allowance >= totalCost) { setStep(PurchaseStep.ReadyToPurchase); }
      else { setStep(PurchaseStep.Idle); }
    } else if (selectedNumbers.length === 0) { setStep(PurchaseStep.Idle); }
  }, [selectedNumbers, allowance, totalCost, isConnected]);

  useEffect(() => {
    if (isApproved && step === PurchaseStep.ApproveConfirming) {
      setStep(PurchaseStep.ReadyToPurchase);
      refetchAllowance();
    }
  }, [isApproved, step, refetchAllowance]);

  useEffect(() => {
    if (!isPurchased || !purchaseTxHash || step !== PurchaseStep.PurchaseConfirming) return;
    const verifyAndRegister = async () => {
      setStep(PurchaseStep.Saving);
      try {
        const response = await fetch('/api/lottery/verify-purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            txHash: purchaseTxHash,
            fid: userFid,
            round_id: currentRound!.id,
            ticket_numbers: selectedNumbers,
            playerAddress: address,
          }),
        });
        if (!response.ok) {
          const errorResult = await response.json();
          throw new Error(errorResult.error || 'Verification failed on the server.');
        }
        setSelectedNumbers([]);
        await fetchEssentialData();
        if (onPurchaseSuccess) onPurchaseSuccess();
        setStep(PurchaseStep.Idle);
      } catch (error: any) {
        setErrorMessage(`CRITICAL ERROR: Purchase successful, but registration failed. Contact support with TxHash: ${purchaseTxHash}.`);
        setStep(PurchaseStep.ReadyToPurchase);
      }
    };
    verifyAndRegister();
  }, [isPurchased, purchaseTxHash, step, userFid, currentRound, selectedNumbers, address, fetchEssentialData, onPurchaseSuccess]);

  useEffect(() => { if (isOpen) { fetchEssentialData(); } }, [isOpen, fetchEssentialData]);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const drawTime = new Date();
      drawTime.setUTCHours(19, 20, 0, 0); // 19:20 UTC

      // Check if we're in the draw period (19:20-19:30)
      const drawStart = new Date();
      drawStart.setUTCHours(19, 20, 0, 0);
      const drawEnd = new Date();
      drawEnd.setUTCHours(19, 30, 0, 0);

      if (now >= drawStart && now <= drawEnd) {
        setTimeRemaining("DRAW IN PROGRESS");
        return;
      }

      // If past draw time today, set for tomorrow
      if (now.getTime() > drawTime.getTime()) {
        drawTime.setDate(drawTime.getDate() + 1);
      }

      const difference = drawTime.getTime() - now.getTime();
      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeRemaining("00:00:00");
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async () => {
    setErrorMessage(null);
    setStep(PurchaseStep.Approving);

    // Check if user is on the correct network (Base)
    if (chainId && chainId !== 8453) {
      setErrorMessage("Please switch to Base network to purchase tickets.");
      setStep(PurchaseStep.Idle);
      return;
    }

    // Debug info
    console.log('🔍 Approve debug:', {
      address,
      isConnected,
      chainId,
      totalCost: totalCost.toString(),
      CHESS_TOKEN_ADDRESS,
      LOTTO_PAYMENT_ROUTER_ADDRESS
    });

    try {
      const hash = await writeContractAsync({
        address: CHESS_TOKEN_ADDRESS,
        abi: CHESS_TOKEN_ABI,
        functionName: 'approve',
        args: [LOTTO_PAYMENT_ROUTER_ADDRESS, totalCost],
      });
      setApproveTxHash(hash);
      setStep(PurchaseStep.ApproveConfirming);
    } catch (err: any) {
      console.error('❌ Approve error:', err);
      setErrorMessage(err.shortMessage || err.message || "Approval rejected.");
      setStep(PurchaseStep.Idle);
    }
  };

  const handlePurchase = async () => {
    setErrorMessage(null);
    setStep(PurchaseStep.Purchasing);
    try {
      const takenRes = await fetch(`/api/lottery/taken-numbers?round_id=${currentRound!.id}`);
      if (!takenRes.ok) throw new Error("Could not verify ticket availability.");
      const takenData = await takenRes.json();
      const currentTakenNumbers: number[] = takenData.takenNumbers || [];
      const newlyTaken = selectedNumbers.filter(num => currentTakenNumbers.includes(num));
      if (newlyTaken.length > 0) {
        setErrorMessage(`Ticket(s) no longer available: ${newlyTaken.join(', ')}. Please select other numbers.`);
        setTakenNumbers(currentTakenNumbers);
        setSelectedNumbers(selectedNumbers.filter(num => !currentTakenNumbers.includes(num)));
        setStep(PurchaseStep.Idle);
        return;
      }

      let finalHash: Hash | undefined;
      for (const ticketNumber of selectedNumbers) {
        // Map the selected number (1-100) to the contract range (1-10)
        const mappedNumber = Math.ceil(ticketNumber / 10);
        const hash = await writeContractAsync({
          address: LOTTO_PAYMENT_ROUTER_ADDRESS,
          abi: LOTTO_PAYMENT_ROUTER_ABI,
          functionName: 'buyTicket',
          args: [BigInt(mappedNumber)],
        });
        finalHash = hash;
      }

      if (finalHash) {
        setPurchaseTxHash(finalHash);
        setStep(PurchaseStep.PurchaseConfirming);
      } else {
        // This case should not happen if selectedNumbers.length > 0
        throw new Error("No tickets were selected to purchase.");
      }
    } catch (err: any) {
      setErrorMessage(err.shortMessage || "Purchase rejected or failed. A ticket might be taken.");
      setStep(PurchaseStep.ReadyToPurchase);
    }
  };

  const handleClaimPrize = async (winningId: number) => {
    try {
      setErrorMessage(null);

      const response = await fetch('/api/lottery/claim-prize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winningId: winningId,
          playerFid: userFid
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Prize claimed successfully:', result);
        // Refresh data
        fetchEssentialData();
        fetchUserWinnings();
      } else {
        console.error('❌ Claim failed:', result.error);
        setErrorMessage(result.error || 'Claim failed');
      }
    } catch (error: any) {
      console.error('❌ Claim error:', error);
      setErrorMessage('Claim failed');
    }
  };

  const handleNumberSelect = (number: number) => {
    if (selectedNumbers.includes(number)) { setSelectedNumbers(selectedNumbers.filter(n => n !== number)); }
    else if (userTickets.length + selectedNumbers.length < 10) { setSelectedNumbers([...selectedNumbers, number]); }
  };
  const formatChessTokens = (amount: number) => {
    if (amount === undefined || amount === null) return '$0';
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toLocaleString('en-US', { maximumFractionDigits: 0 })}K`;
    return `$${amount.toLocaleString('en-US')}`;
  };

  const handleRedeemCode = async () => {
    if (!dailyCode || !userFid) return;
    setIsRedeeming(true);
    setRedeemStatus(null);
    try {
      // Get notification details from SDK context to sync subscription if needed
      const context = await (sdk as any).context;
      const notificationDetails = context?.client?.notificationDetails;

      const response = await fetch('/api/lottery/redeem-daily-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: dailyCode,
          fid: userFid,
          address: address,
          notificationDetails: notificationDetails
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setRedeemStatus({ message: data.message, isError: false });
        setDailyCode("");
        fetchEssentialData();
      } else {
        setRedeemStatus({ message: data.error, isError: true });
        if (data.needsSubscription) {
          try { await sdk.actions.addMiniApp(); } catch (e) { }
        }
      }
    } catch (error) {
      setRedeemStatus({ message: "Failed to redeem code. Please try again.", isError: true });
    } finally {
      setIsRedeeming(false);
    }
  };

  const isNumberTaken = (number: number) => takenNumbers.includes(number);

  const isLoading = isPending || isApproveConfirming || isPurchaseConfirming || step === PurchaseStep.Saving;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
        <div className="bg-[#050810] rounded-2xl shadow-2xl p-6 max-w-4xl w-full h-[90vh] flex flex-col border-2 border-[#ff00ff]/50 relative overflow-hidden shadow-[0_0_40px_rgba(255,0,255,0.3)]">
          {/* Retro Grid Background */}
          <div className="vice-grid"></div>
          {/* Scanline Effect */}
          <div className="scanline"></div>

          <div className="relative z-10 flex flex-col items-start mb-6">
            <div className="w-full flex justify-between items-start mb-2">
              <div className="flex items-center gap-4">
                <div className="w-full">
                  <div className="flex items-center justify-center mr-[8%] whitespace-nowrap">
                    <div className="flex items-center gap-2 animate-neonFlicker">
                      <FiDollarSign size={32} className="text-[#00f2ff]" />
                      <h1 className="text-3xl font-black text-white uppercase tracking-widest italic" style={{ textShadow: '3px 3px #ff00ff' }}>
                        BUY A LAMBO
                      </h1>
                    </div>
                  </div>
                  {currentRound && (
                    <div className="mt-4 w-full max-w-full py-4 px-6 bg-black/60 border-2 border-[#ff00ff]/50 rounded-xl shadow-[0_0_20px_rgba(255,0,255,0.2)] mx-auto relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#ff00ff]/5 via-transparent to-[#00f2ff]/5"></div>
                      <div className="w-full grid grid-cols-3 items-center justify-items-center gap-4 relative z-10">
                        <div className="text-center min-w-0 flex flex-col items-center">
                          <div className="text-[10px] font-black text-[#00f2ff] uppercase tracking-widest mb-1" style={{ textShadow: '0 0 5px #00f2ff' }}>TIME LEFT</div>
                          <div className="text-xl font-black text-white tracking-widest" style={{ fontFamily: 'monospace', textShadow: '0 0 10px #ff00ff' }}>{timeRemaining}</div>
                        </div>
                        <div className="text-center border-l-2 border-r-2 border-[#00f2ff]/20 px-6 min-w-0 w-full flex flex-col items-center">
                          <div className="text-[10px] font-black text-[#ff00ff] uppercase tracking-widest mb-1" style={{ textShadow: '0 0 5px #ff00ff' }}>JACKPOT</div>
                          <div className="text-xl font-black text-[#00f2ff] animate-pulse italic" style={{ textShadow: '0 0 15px #00f2ff' }}>{formatChessTokens(currentRound.prize_pool)}</div>
                        </div>
                        <div className="text-center min-w-0 flex flex-col items-center">
                          <div className="text-[10px] font-black text-[#00f2ff] uppercase tracking-widest mb-1" style={{ textShadow: '0 0 5px #00f2ff' }}>LAST DRAW</div>
                          <div className="text-xl font-black text-white" style={{ fontFamily: 'monospace', textShadow: '0 0 10px #ff00ff' }}>{lastWinningNumber || '??'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="absolute top-0 right-0 p-2 rounded-full bg-[#23283a] border border-[#a64d79] hover:bg-[#2a2f42] text-white transition-all duration-300 hover:scale-110"><FiX size={24} /></button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center"><div className="text-cyan-400 text-2xl font-bold animate-pulse">Loading lottery...</div></div>
          ) : (
            <div className="relative z-10 flex-1 overflow-y-auto space-y-6">
              {/* Buy CHESS Action Button (High visibility) */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => sdk.actions.openUrl("https://farcaster.xyz/miniapps/DXCz8KIyfsme/farchess")}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-2 border-purple-400/50 rounded-xl text-white text-base font-bold transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                >
                  <FiZap size={20} className="text-yellow-400" />
                  BUY $CHESS (FARCHESS)
                </button>
              </div>

              {/* Daily Code Section */}
              <div className="glass-morphism rounded-xl p-4 border border-[#ff00ff]/40 shadow-[0_0_20px_rgba(255,0,255,0.2)]">
                <h3 className="text-xl font-black text-[#ff00ff] mb-2 flex items-center justify-center gap-2 italic tracking-tighter uppercase" style={{ textShadow: '0 0 8px #ff00ff' }}>
                  <FiGift /> Daily Free Numbers
                </h3>
                <p className="text-[11px] text-white/90 text-center mb-4 uppercase font-black tracking-widest">
                  First 3 fast players get 1 free ticket
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={dailyCode}
                    onChange={(e) => setDailyCode(e.target.value.toUpperCase())}
                    placeholder="VICE CODE..."
                    className="flex-1 bg-black/60 border border-[#00f2ff]/30 rounded-lg px-4 py-2 text-[#00f2ff] font-mono focus:outline-none focus:border-[#ff00ff] transition-colors placeholder:text-[#00f2ff]/30"
                  />
                  <button
                    onClick={handleRedeemCode}
                    disabled={isRedeeming || !dailyCode}
                    className="bg-gradient-to-r from-[#ff00ff] to-[#ff8c00] hover:brightness-110 disabled:grayscale text-white font-black italic px-4 py-2 rounded-lg transition-all duration-300 uppercase tracking-tighter"
                  >
                    {isRedeeming ? '...' : 'REDEEM'}
                  </button>
                </div>
                {redeemStatus && (
                  <div className={`mt-3 p-2 rounded text-center text-[10px] font-black uppercase tracking-widest ${redeemStatus.isError ? 'bg-red-900/40 text-red-300' : 'bg-green-900/40 text-green-300'}`}>
                    {redeemStatus.message}
                  </div>
                )}
              </div>

              <div className="glass-morphism rounded-xl p-4 border border-[#00f2ff]/30">
                <h3 className="text-xl font-black text-[#00f2ff] mb-4 flex items-center justify-center gap-2 italic uppercase tracking-tighter"><FiZap className="animate-neonFlicker" /> Select Numbers (1-100)</h3>
                <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-blue-300">Maximum 10 tickets per user per round. Draw at 19:05 UTC daily via GitHub Action.{userTickets.length > 0 && (<span className="block mt-1">You already have <span className="font-bold text-yellow-300">{userTickets.length}/10</span> tickets.</span>)}</p>
                </div>

                <div className="grid grid-cols-10 gap-1 mb-4">
                  {Array.from({ length: 100 }, (_, i) => i + 1).map((number) => (
                    <button
                      key={number}
                      onClick={() => !isNumberTaken(number) && handleNumberSelect(number)}
                      disabled={isNumberTaken(number)}
                      className={`w-9 h-9 rounded text-[10px] font-black transition-all duration-200 border-2 ${isNumberTaken(number)
                        ? 'bg-red-500/80 border-red-400/50 text-white cursor-not-allowed opacity-80'
                        : selectedNumbers.includes(number)
                          ? 'bg-gradient-to-br from-[#00f2ff] to-[#ff00ff] border-white text-[#050810] shadow-[0_0_15px_#00f2ff] scale-105 z-10'
                          : 'bg-black/40 border-[#00f2ff]/20 hover:border-[#ff00ff]/60 text-[#00f2ff]/70 hover:text-white'
                        }`}
                    >
                      {number}
                    </button>
                  ))}
                </div>

                {errorMessage && (
                  <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-300 text-sm text-center">{errorMessage}</div>
                )}

                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-300">
                    <div>Total cost: <span className="text-yellow-400 font-bold">{(Number(totalCost) / 1e18).toLocaleString()} CHESS</span></div>
                    {!isConnected && <div className="text-red-400 text-xs mt-1">⚠️ Please connect your wallet.</div>}
                  </div>

                  {step < PurchaseStep.ReadyToPurchase ? (
                    <button
                      onClick={handleApprove}
                      disabled={isLoading || !isConnected || selectedNumbers.length === 0}
                      className="px-6 py-3 rounded-xl font-black italic text-lg transition-all duration-300 disabled:grayscale bg-gradient-to-br from-[#00f2ff] to-[#0088ff] text-white shadow-[0_0_15px_rgba(0,242,255,0.4)] uppercase tracking-tighter"
                    >
                      {isApproveConfirming ? 'Confirming...' : isPending ? 'Check Wallet...' : '1. Approve Budget'}
                    </button>
                  ) : (
                    <button
                      onClick={handlePurchase}
                      disabled={isLoading || !isConnected || selectedNumbers.length === 0}
                      className="px-6 py-3 rounded-xl font-black italic text-lg transition-all duration-300 disabled:grayscale bg-gradient-to-br from-[#ff00ff] to-[#ff8c00] text-white shadow-[0_0_15px_rgba(255,0,255,0.4)] uppercase tracking-tighter"
                    >
                      {isPurchased && step !== PurchaseStep.Saving ? 'Success!' : isPurchaseConfirming ? 'Confirming...' : isPending ? 'Check Wallet...' : `2. Buy ${selectedNumbers.length} Ticket(s)`}
                    </button>
                  )}
                </div>
              </div>

              {userTickets.length > 0 && (
                <div className="glass-morphism rounded-xl p-4 border border-[#00f2ff]/30">
                  <h3 className="text-xl font-black text-[#ff00ff] mb-4 flex items-center justify-center gap-2 italic uppercase tracking-tighter"><FiUsers /> Your Tickets ({userTickets.length})</h3>
                  <div className="flex justify-center">
                    <div className="grid grid-cols-10 gap-2">
                      {userTickets.map((ticket) => (
                        <div key={ticket.id} className="w-8 h-8 rounded bg-gradient-to-br from-[#00f2ff] to-[#ff00ff] text-[#050810] text-xs font-black flex items-center justify-center shadow-[0_0_10px_rgba(0,242,255,0.4)]">{ticket.ticket_number}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="glass-morphism rounded-xl p-4 border border-[#ff00ff]/30">
                <h3 className="text-xl font-black text-[#00f2ff] mb-4 flex items-center gap-2 italic uppercase tracking-tighter"><FiDollarSign /> Payment Method</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-black/40 border border-[#00f2ff]/20 rounded-lg">
                    <div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-[#00ff00] shadow-[0_0_8px_#00ff00]' : 'bg-[#ff0000] shadow-[0_0_8px_#ff0000]'}`}></div><span className="text-[10px] font-black uppercase text-[#00f2ff] tracking-widest">Wallet: {isConnected ? 'Connected' : 'Not Connected'}</span></div>
                    {isConnected && address && <span className="text-[10px] text-white font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span>}
                  </div>
                  <div className="p-3 bg-black/40 border border-[#ff00ff]/20 rounded-lg">
                    <div className="text-[10px] font-black text-[#ff00ff] uppercase tracking-widest"><span className="text-gray-400">Price:</span> 100,000 CHESS</div>
                    {selectedNumbers.length > 0 && <div className="text-[10px] font-black text-[#00f2ff] mt-1 uppercase tracking-widest"><span className="text-gray-400">Total:</span> {(Number(totalCost) / 1e18).toLocaleString()} CHESS</div>}
                  </div>
                </div>
              </div>

              {/* Recent Results Section */}
              <div className="glass-morphism rounded-xl border border-[#ff00ff]/30 overflow-hidden">
                <button
                  onClick={fetchRecentResults}
                  className="w-full p-4 flex items-center justify-between hover:bg-black/40 transition-colors"
                >
                  <h3 className="text-lg font-black text-[#ff00ff] flex items-center gap-2 italic uppercase tracking-tighter">
                    🏆 Recent Results
                  </h3>
                  <div className="flex items-center gap-2">
                    {loadingRecentResults && <div className="w-4 h-4 border-2 border-[#ff00ff] border-t-transparent rounded-full animate-spin"></div>}
                    <span className="text-gray-500 text-[10px] font-black uppercase">{showRecentResults ? 'Hide' : 'Show'}</span>
                  </div>
                </button>

                {showRecentResults && (
                  <div className="p-4 pt-0 space-y-3 animate-fadeIn">
                    {recentRounds.length > 0 ? (
                      recentRounds.map((round) => (
                        <div key={round.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-600">
                          <div className="flex items-center gap-3">
                            <div className="text-lg font-bold text-cyan-400">#{round.draw_number}</div>
                            <div className="text-sm text-gray-300">Winning: <span className="text-yellow-400 font-bold">{round.winning_number}</span></div>
                            <div className="text-sm text-gray-300">Tickets: <span className="text-green-400">{round.total_tickets}</span></div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-400">{formatChessTokens(round.jackpot)}</div>
                            <div className="text-xs text-gray-400">Prize Pool</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500 text-sm italic">No recent results found.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Your Winnings Section */}
              <div className="glass-morphism rounded-xl border border-[#00f2ff]/30 overflow-hidden">
                <button
                  onClick={fetchUserWinnings}
                  className="w-full p-4 flex items-center justify-between hover:bg-black/40 transition-colors"
                >
                  <h3 className="text-xl font-black text-[#00f2ff] flex items-center gap-2 italic uppercase tracking-tighter">
                    🎉 Your Winnings ({userWinnings.length})
                  </h3>
                  <div className="flex items-center gap-2">
                    {loadingUserWinnings && <div className="w-4 h-4 border-2 border-[#00f2ff] border-t-transparent rounded-full animate-spin"></div>}
                    <span className="text-gray-500 text-[10px] font-black uppercase">{showUserWinnings ? 'Hide' : 'Show'}</span>
                  </div>
                </button>

                {showUserWinnings && (
                  <div className="p-4 pt-0 space-y-3 animate-fadeIn">
                    {userWinnings.length > 0 ? (
                      userWinnings.map((winning) => (
                        <div key={winning.id} className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-lg font-bold text-green-400">Round #{winning.draw_number}</div>
                            <div className="text-lg font-bold text-yellow-400">{formatChessTokens(winning.amount_won)}</div>
                          </div>
                          <div className="text-sm text-gray-300 mb-3">Winning Number: <span className="text-yellow-400 font-bold">{winning.winning_number}</span> | Your Ticket: <span className="text-cyan-400 font-bold">{winning.ticket_number}</span></div>
                          {!winning.claimed_at ? (
                            <button
                              onClick={() => handleClaimPrize(winning.id)}
                              className="w-full px-4 py-2 bg-gradient-to-r from-[#ff00ff] to-[#ff8c00] hover:brightness-110 text-white font-black italic rounded-lg transition-all duration-300 hover:scale-105 shadow-[0_0_15px_rgba(255,0,255,0.4)] uppercase tracking-widest"
                            >
                              🎯 Claim Prize
                            </button>
                          ) : (
                            <div className="text-center text-green-400 font-bold">✅ Claimed on {new Date(winning.claimed_at).toLocaleDateString()}</div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500 text-sm italic">You haven't won anything yet. Good luck!</div>
                    )}
                  </div>
                )}
              </div>

              <div className="glass-morphism rounded-xl p-4 border border-white/20 mb-8 bg-black/40">
                <h3 className="text-[11px] font-black text-white mb-3 uppercase tracking-widest">How it works:</h3>
                <ul className="text-[11px] text-gray-300 space-y-1 font-bold uppercase tracking-widest">
                  <li>• Choose up to 10 numbers between 1-100</li>
                  <li>• Each ticket costs 100,000 CHESS tokens</li>
                  <li>• Daily draw at 19:05 UTC (7:05 PM UTC)</li>
                  <li>• One winner takes the entire prize pool</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}