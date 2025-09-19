"use client"

import { useState, useEffect, useCallback } from "react";
import { FiX, FiDollarSign, FiClock, FiUsers, FiTrendingUp, FiZap } from "react-icons/fi";
import { useAccount, useWaitForTransactionReceipt, useReadContract, useWriteContract } from 'wagmi';
import { type Hash } from 'viem';
import { LOTTO_PAYMENT_ROUTER_ADDRESS, LOTTO_PAYMENT_ROUTER_ABI, TICKET_PRICE } from '@/abis/LottoPaymentRouter';
import { CHESS_TOKEN_ADDRESS, CHESS_TOKEN_ABI } from '@/abis/chessToken';

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
  const { address, isConnected } = useAccount();

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
  
  const [step, setStep] = useState<PurchaseStep>(PurchaseStep.Idle);
  const [approveTxHash, setApproveTxHash] = useState<Hash | undefined>();
  const [purchaseTxHash, setPurchaseTxHash] = useState<Hash | undefined>();
  
  // Claim states
  const [claimingWinning, setClaimingWinning] = useState<number | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentInfoIndex, setCurrentInfoIndex] = useState(0);

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

  // Read contract limits
  const { data: minTicketNumber } = useReadContract({
    address: LOTTO_PAYMENT_ROUTER_ADDRESS,
    abi: LOTTO_PAYMENT_ROUTER_ABI,
    functionName: 'MIN_TICKET_NUMBER',
  });

  const { data: maxTicketNumber } = useReadContract({
    address: LOTTO_PAYMENT_ROUTER_ADDRESS,
    abi: LOTTO_PAYMENT_ROUTER_ABI,
    functionName: 'MAX_TICKET_NUMBER',
  });

  const fetchLotteryData = useCallback(async () => {
    try {
      setLoading(true);
      const [roundRes, ticketsRes, statsRes, lastDrawRes, recentRes, winningsRes] = await Promise.all([
        fetch('/api/lottery/current-round'),
        userFid ? fetch(`/api/lottery/user-tickets?fid=${userFid}`) : Promise.resolve(null),
        fetch('/api/lottery/stats'),
        fetch('/api/lottery/last-winning-number'),
        fetch('/api/lottery/recent-results'),
        userFid ? fetch(`/api/lottery/user-winnings?fid=${userFid}`) : Promise.resolve(null)
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
      if (recentRes.ok) setRecentRounds((await recentRes.json()).rounds || []);
      if (winningsRes?.ok) setUserWinnings((await winningsRes.json()).winnings || []);
    } catch (error) {
      console.error('Failed to fetch lottery data:', error);
    } finally {
      setLoading(false);
    }
  }, [userFid]);
  
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
      // Reset approve transaction hash to clear pending state
      setApproveTxHash(undefined);
    }
  }, [isApproved, step, refetchAllowance]);
  
  // Verification is handled per-ticket immediately after each purchase now

  useEffect(() => { if (isOpen) { fetchLotteryData(); } }, [isOpen, fetchLotteryData]);

  // Info message rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentInfoIndex(prev => (prev + 1) % 6);
    }, 4000); // Change every 4 seconds
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const drawTime = new Date();
      drawTime.setUTCHours(19, 5, 0, 0); // Changed to 19:05 UTC
      if (now.getTime() > drawTime.getTime()) { drawTime.setDate(drawTime.getDate() + 1); }
      
      const difference = drawTime.getTime() - now.getTime();
      
      // Check if we're in the drawing period (19:05 - 19:10)
      const drawStart = new Date();
      drawStart.setUTCHours(19, 5, 0, 0);
      const drawEnd = new Date();
      drawEnd.setUTCHours(19, 10, 0, 0);
      
      if (now.getTime() >= drawStart.getTime() && now.getTime() < drawEnd.getTime()) {
        // During drawing period (19:05 - 19:10)
        setTimeRemaining("Drawing in progress...");
      } else if (difference > 0) {
        // Before drawing time
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        // After drawing period, calculate next draw
        const nextDrawTime = new Date();
        nextDrawTime.setUTCHours(19, 5, 0, 0);
        nextDrawTime.setDate(nextDrawTime.getDate() + 1);
        
        const nextDifference = nextDrawTime.getTime() - now.getTime();
        const hours = Math.floor(nextDifference / (1000 * 60 * 60));
        const minutes = Math.floor((nextDifference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((nextDifference % (1000 * 60)) / 1000);
        setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async () => {
    setErrorMessage(null);
    setStep(PurchaseStep.Approving);
    try {
      const hash = await writeContractAsync({
        address: CHESS_TOKEN_ADDRESS,
        abi: CHESS_TOKEN_ABI,
        functionName: 'approve',
        args: [LOTTO_PAYMENT_ROUTER_ADDRESS, totalCost],
        gas: BigInt(100000), // Standard gas limit for approve
      });
      setApproveTxHash(hash);
      setStep(PurchaseStep.ApproveConfirming);
    } catch (err: any) {
      setErrorMessage(err.shortMessage || "Approval rejected.");
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
      
      const ticketTxPairs: Array<{ number: number; hash: Hash }> = [];
      for (const ticketNumber of selectedNumbers) {
        // Check if we need to map the number based on contract limits
        let contractTicketNumber = BigInt(ticketNumber);
        
        // If contract only supports 1-10, map 11-100 to 1-10
        if (minTicketNumber && maxTicketNumber) {
          const minNum = Number(minTicketNumber);
          const maxNum = Number(maxTicketNumber);
          
          if (minNum === 1 && maxNum === 10 && ticketNumber > 10) {
            // BIZTONSÁGOS MAPPING: Egyedi algoritmus
            if (ticketNumber >= 11 && ticketNumber <= 100) {
              contractTicketNumber = BigInt(((ticketNumber - 11) % 10) + 1);
              console.log(`Mapping ticket ${ticketNumber} to contract number ${contractTicketNumber}`);
            } else {
              throw new Error(`Invalid ticket number range: ${ticketNumber}. Must be 1-100.`);
            }
          }
        }
        
        const hash = await writeContractAsync({
            address: LOTTO_PAYMENT_ROUTER_ADDRESS,
            abi: LOTTO_PAYMENT_ROUTER_ABI,
            functionName: 'buyTicket',
            args: [contractTicketNumber],
            gas: BigInt(200000), // Standard gas limit for single ticket purchase
        });
        ticketTxPairs.push({ number: ticketNumber, hash });
      }

      if (ticketTxPairs.length === 0) {
        throw new Error("No tickets were selected to purchase.");
      }

      // Immediately verify each ticket individually so partial success is recorded
      setStep(PurchaseStep.Saving);
      const successes: number[] = [];
      const failures: Array<{ number: number; error: string }> = [];
      for (const { number, hash } of ticketTxPairs) {
        try {
          const response = await fetch('/api/lottery/verify-purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              txHash: hash,
              fid: userFid,
              round_id: currentRound!.id,
              ticket_numbers: [number],
              playerAddress: address,
            }),
          });
          if (!response.ok) {
            const errorResult = await response.json().catch(() => ({}));
            throw new Error(errorResult.error || 'Verification failed on the server.');
          }
          successes.push(number);
        } catch (e: any) {
          failures.push({ number, error: e?.message || 'Verify failed' });
        }
      }

      setSelectedNumbers([]);
      await fetchLotteryData();
      if (onPurchaseSuccess) onPurchaseSuccess();
      setStep(PurchaseStep.Idle);
      if (failures.length === 0) {
        alert(`✅ Successfully purchased ${successes.length} ticket(s)!`);
      } else if (successes.length > 0) {
        alert(`⚠️ Partial success: ${successes.length} purchased, ${failures.length} failed (${failures.map(f => f.number).join(', ')}).`);
      } else {
        throw new Error('All verifications failed. Please try again later.');
      }
    } catch (err: any) {
      setErrorMessage(err.shortMessage || "Purchase rejected or failed. A ticket might be taken.");
      setStep(PurchaseStep.ReadyToPurchase);
    }
  };

  const handleNumberSelect = (number: number) => {
    if (selectedNumbers.includes(number)) { setSelectedNumbers(selectedNumbers.filter(n => n !== number)); }
    else if (userTickets.length + selectedNumbers.length < 10) { setSelectedNumbers([...selectedNumbers, number]); }
  };

  const handleClaimWinning = async (winningId: number) => {
    if (!userFid) {
      setClaimError("User not found");
      return;
    }

    setClaimingWinning(winningId);
    setClaimError(null);

    try {
      const response = await fetch("/api/claim-rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          fid: userFid,
          winningId: winningId 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Claim failed");
      }

      // Success - refresh data
      await fetchLotteryData();
      alert(`Successfully claimed your prize! 🎉`);
      
    } catch (error: any) {
      console.error("Claim error:", error);
      setClaimError(error.message || "Failed to claim prize");
    } finally {
      setClaimingWinning(null);
    }
  };
  const formatChessTokens = (amount: number) => {
    if (amount === undefined || amount === null) return '$0';
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toLocaleString('en-US', { maximumFractionDigits: 0 })}K`;
    return `$${amount.toLocaleString('en-US')}`;
  };

  // Rotating info messages with real data
  const getInfoMessage = () => {
    const messages = [
      // Message 1: Basic rules + user tickets
      `Maximum 10 tickets per user per round. Numbers are grouped in tens (1-10, 11-20, etc.).${userTickets.length > 0 ? ` You already have ${userTickets.length}/10 tickets.` : ''}`,
      
      // Message 2: Current round stats
      `Current round: ${currentRound?.total_tickets_sold || 0} tickets sold • Jackpot: ${formatChessTokens(currentRound?.prize_pool || 0)} CHESS • Your chance: ${userTickets.length > 0 ? Math.round((userTickets.length / Math.max(currentRound?.total_tickets_sold || 1, 1)) * 100) : 0}% to win!`,
      
      // Message 3: Recent results motivation
      `Last winner: Round #${recentRounds[0]?.draw_number || 'N/A'} • Winning number: ${recentRounds[0]?.winning_number || 'N/A'} • Prize: ${formatChessTokens(recentRounds[0]?.jackpot || 0)} CHESS`,
      
      // Message 4: Buy a Lambo motivation
      `🚗 Buy a Lambo with your winnings! • Each ticket = 1% chance to win the entire pot! • ROI potential: Win 1000x your investment!`,
      
      // Message 5: Statistics motivation
      `📊 Biggest prize: ${formatChessTokens(recentRounds.reduce((max, round) => Math.max(max, round.jackpot), 0))} CHESS • Average prize: ${formatChessTokens(stats ? Math.round(stats.total_prize_distributed / Math.max(stats.total_rounds, 1)) : 0)} CHESS`,
      
      // Message 6: Time pressure
      `⏰ Time left: ${timeRemaining} • Don't miss your chance! • More tickets = higher win probability!`
    ];
    
    return messages[currentInfoIndex] || messages[0];
  };
  const isNumberTaken = (number: number) => takenNumbers.includes(number);

  const isLoading = isPending || isApproveConfirming || isPurchaseConfirming || step === PurchaseStep.Saving;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-purple-900 via-black to-purple-900 rounded-2xl shadow-2xl p-6 max-w-4xl w-full h-[90vh] flex flex-col border border-[#a64d79] relative overflow-hidden shadow-[0_0_30px_rgba(166,77,121,0.4)] pulse-glow">
          <div className="relative z-10 flex flex-col items-start mb-6">
            <div className="w-full flex justify-between items-start mb-2">
                <div className="flex items-center gap-4">
                  <div className="w-full">
                    <div className="flex items-center justify-center gap-2 mr-[8%]">
                      <FiDollarSign size={38} className="text-yellow-300" />
                      <h1 className="text-3xl font-bold text-white uppercase tracking-[0.02em]">BUY A LAMBO</h1>
                    </div>
                    <p className="text-purple-200 text-sm font-medium mt-1 text-center">One Winner Takes All!</p>
                    {currentRound && (
                      <div className="mt-4 w-full max-w-full py-3 px-6 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-2 border-yellow-400/50 rounded-xl animate-pulse shadow-[0_0_25px_rgba(255,255,0,0.4)] pulse-glow mx-auto" style={{ animationDuration: '4s' }}>
                        <div className="w-full grid grid-cols-3 items-center justify-items-center gap-4">
                          <div className="text-center min-w-0"><div className="text-xs font-bold text-yellow-300 mb-1">TIME LEFT</div><div className="text-base font-bold text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">{timeRemaining}</div></div>
                          <div className="text-center border-l-2 border-r-2 border-yellow-400/30 px-4 min-w-0 w-full"><div className="text-xs font-bold text-yellow-300 mb-1">JACKPOT</div><div className="text-lg font-bold text-cyan-300 animate-pulse drop-shadow-[0_0_10px_rgba(34,211,238,0.9)]" style={{ animationDuration: '4s' }}>{formatChessTokens(currentRound.prize_pool)}</div></div>
                          <div className="text-center min-w-0"><div className="text-xs font-bold text-yellow-300 mb-1">LAST DRAW</div><div className="text-base font-bold text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">{lastWinningNumber || 'N/A'}</div></div>
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
              <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79] pulse-glow">
                <h3 className="text-xl font-bold text-cyan-400 mb-4 text-center"><FiZap className="inline mr-2" /> Select Numbers (1-100)</h3>
                
                {/* 10x10 Grid - Teljes oldal szélességhez alkalmazkodik */}
                <div className="mb-4">
                  <div className="border-2 border-purple-500/30 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.4)] bg-gradient-to-br from-purple-900/10 to-transparent pulse-glow p-2 w-full">
                    <div className="grid grid-cols-10 place-items-center w-full h-96">
                      {Array.from({ length: 100 }, (_, i) => i + 1).map((number) => (
                        <button 
                          key={number} 
                          onClick={() => !isNumberTaken(number) && handleNumberSelect(number)} 
                          disabled={isNumberTaken(number)} 
                          className={`w-full h-full rounded text-base font-bold transition-all duration-200 border-2 flex items-center justify-center ${
                            isNumberTaken(number) 
                              ? 'bg-gray-300/40 text-gray-400 cursor-not-allowed border-gray-400/50' 
                              : selectedNumbers.includes(number) 
                              ? 'bg-cyan-500 text-white border-cyan-400 shadow-lg shadow-cyan-500/50' 
                              : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:scale-105 border-purple-500'
                          }`}
                        >
                          {number}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {errorMessage && (
                  <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-300 text-sm text-center">{errorMessage}</div>
                )}
                
                <div className="flex flex-col items-center gap-4 mb-4">
                  {!isConnected && (
                    <div className="text-red-400 text-sm text-center p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                      ⚠️ Please connect your wallet to purchase tickets
                    </div>
                  )}
                  
                  {step < PurchaseStep.ReadyToPurchase ? (
                    <button onClick={handleApprove} disabled={isLoading || !isConnected || selectedNumbers.length === 0} className="px-8 py-4 rounded-xl font-bold text-xl transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:scale-105 shadow-lg pulse-glow">
                      {isApproveConfirming ? 'Confirming...' : isPending ? 'Check Wallet...' : 'Approve & Buy Tickets'}
                    </button>
                  ) : (
                    <button onClick={handlePurchase} disabled={isLoading || !isConnected || selectedNumbers.length === 0} className="px-8 py-4 rounded-xl font-bold text-xl transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed bg-gradient-to-r from-green-600 to-blue-600 text-white hover:scale-105 shadow-lg pulse-glow">
                      {isPurchased && step !== PurchaseStep.Saving ? 'Success!' : isPurchaseConfirming ? 'Confirming...' : isPending ? 'Check Wallet...' : `Buy ${selectedNumbers.length} Ticket(s)`}
                    </button>
                  )}
                  
                  {selectedNumbers.length > 0 && (
                    <div className="text-center">
                      <div className="text-lg text-yellow-400 font-bold">Total: {(Number(totalCost)/1e18).toLocaleString()} CHESS</div>
                      <div className="text-sm text-gray-400">for {selectedNumbers.length} ticket(s)</div>
                    </div>
                  )}
                </div>
                
                {/* Wallet Status */}
                <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm text-blue-300">Wallet: {isConnected ? 'Connected' : 'Not Connected'}</span>
                    </div>
                    {isConnected && address && <span className="text-xs text-gray-400 font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span>}
                  </div>
                  <div className="mt-2 text-sm text-yellow-300">
                    <span className="font-bold">Price per ticket:</span> 100,000 CHESS
                  </div>
                </div>
                
                <div className="mb-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                  <p className="text-sm text-green-300 transition-all duration-500 ease-in-out">{getInfoMessage()}</p>
                </div>
              </div>

              {userTickets.length > 0 && (
                <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79] pulse-glow">
                  <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center justify-center gap-2"><FiUsers /> Your Tickets ({userTickets.length})</h3>
                  <div className="flex justify-center">
                    <div className="grid grid-cols-10 gap-2">
                      {userTickets.map((ticket) => (
                        <div key={ticket.id} className="w-8 h-8 rounded bg-gradient-to-r from-green-500 to-blue-500 text-white text-xs font-bold flex items-center justify-center">{ticket.ticket_number}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {recentRounds.length > 0 && (
                <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79] pulse-glow">
                  <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center justify-center gap-2">🏆 Recent Results</h3>
                  <div className="space-y-3">
                    {recentRounds.map((round) => (
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
                    ))}
                  </div>
                </div>
              )}
              {userWinnings.length > 0 && (
                <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79] pulse-glow">
                  <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">🎉 Your Winnings ({userWinnings.length})</h3>
                  
                  {claimError && (
                    <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-300 text-sm text-center">{claimError}</div>
                  )}
                  <div className="space-y-3">
                    {userWinnings.map((winning) => (
                      <div key={winning.id} className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-lg font-bold text-green-400">Round #{winning.draw_number}</div>
                          <div className="text-lg font-bold text-yellow-400">{formatChessTokens(winning.amount_won)}</div>
                        </div>
                        <div className="text-sm text-gray-300 mb-3">Winning Number: <span className="text-yellow-400 font-bold">{winning.winning_number}</span> | Your Ticket: <span className="text-cyan-400 font-bold">{winning.ticket_number}</span></div>
                        {!winning.claimed_at ? (
                          <button 
                            onClick={() => handleClaimWinning(winning.id)}
                            disabled={claimingWinning === winning.id}
                            className={`w-full px-4 py-2 font-bold rounded-lg transition-all duration-300 hover:scale-105 ${
                              claimingWinning === winning.id 
                                ? 'bg-green-500 text-white animate-pulse shadow-lg shadow-green-500/50 border-2 border-green-400' 
                                : 'bg-green-600 hover:bg-green-700 text-white pulse-glow'
                            } disabled:cursor-not-allowed`}
                          >
                            {claimingWinning === winning.id ? '⏳ Claiming...' : '🎯 Claim Prize'}
                          </button>
                        ) : (
                          <div className="text-center text-green-400 font-bold">✅ Claimed on {new Date(winning.claimed_at).toLocaleDateString()}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79] pulse-glow">
                <h3 className="text-lg font-bold text-gray-300 mb-3">How it works:</h3>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Choose up to 10 numbers between 1-100. Numbers are grouped in tens for the lottery draw.</li>
                  <li>• Each ticket costs 100,000 CHESS tokens.</li>
                  <li>• Daily draw at 9 PM Budapest time (7 PM UTC).</li>
                  <li>• One winner takes the entire prize pool!</li>
                </ul>
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