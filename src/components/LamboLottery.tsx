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

  // Pontosan mint a PaymentForm.tsx-ben
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
    }
  }, [isApproved, step, refetchAllowance]);
  
  useEffect(() => {
    if (!isPurchased || !purchaseTxHash || step !== PurchaseStep.PurchaseConfirming) return;
    const verifyAndRegister = async () => {
      setStep(PurchaseStep.Saving);
      try {
        const response = await fetch(`/api/lottery/verify-purchase?txHash=${purchaseTxHash}&fid=${userFid}&round_id=${currentRound!.id}&playerAddress=${address}&ticket_numbers=${selectedNumbers.join(',')}`, {
          method: 'GET',
        });
        if (!response.ok) {
          const errorResult = await response.json();
          throw new Error(errorResult.error || 'Verification failed on the server.');
        }
        setSelectedNumbers([]);
        await fetchLotteryData();
        if (onPurchaseSuccess) onPurchaseSuccess();
        setStep(PurchaseStep.Idle);
      } catch (error: any) {
        setErrorMessage(`CRITICAL ERROR: Purchase successful, but registration failed. Contact support with TxHash: ${purchaseTxHash}.`);
        setStep(PurchaseStep.ReadyToPurchase);
      }
    };
    verifyAndRegister();
  }, [isPurchased, purchaseTxHash, step, userFid, currentRound, selectedNumbers, address, fetchLotteryData, onPurchaseSuccess]);

  useEffect(() => { if (isOpen) { fetchLotteryData(); } }, [isOpen, fetchLotteryData]);
  
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const drawTime = new Date();
      drawTime.setUTCHours(20, 0, 0, 0);
      if (now.getTime() > drawTime.getTime()) { drawTime.setDate(drawTime.getDate() + 1); }
      const difference = drawTime.getTime() - now.getTime();
      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else { setTimeRemaining("00:00:00"); }
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
      
      // Vásároljuk meg az első jegyet
      let hash;
      for (const number of selectedNumbers) {
        hash = await writeContractAsync({
            address: LOTTO_PAYMENT_ROUTER_ADDRESS,
            abi: LOTTO_PAYMENT_ROUTER_ABI,
            functionName: 'buyTicket',
            args: [BigInt(number)],
        });
      }

      if (hash) {
          setPurchaseTxHash(hash);
          setStep(PurchaseStep.PurchaseConfirming);
      } else {
          throw new Error("Purchase failed to return a transaction hash.");
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
  const formatChessTokens = (amount: number) => {
    if (amount === undefined || amount === null) return '$0';
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toLocaleString('en-US', { maximumFractionDigits: 0 })}K`;
    return `$${amount.toLocaleString('en-US')}`;
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
                <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2"><FiDollarSign /> Payment Method</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div><span className="text-sm text-blue-300">Wallet: {isConnected ? 'Connected' : 'Not Connected'}</span></div>
                    {isConnected && address && <span className="text-xs text-gray-400 font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span>}
                  </div>
                  <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                    <div className="text-sm text-yellow-300"><span className="font-bold">Price per ticket:</span> 100,000 CHESS</div>
                    {selectedNumbers.length > 0 && <div className="text-sm text-yellow-300 mt-1"><span className="font-bold">Total cost:</span> {(Number(totalCost)/1e18).toLocaleString()} CHESS</div>}
                  </div>
                  {isConnected && (<div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg"><div className="text-sm font-medium text-green-300">Token Approval Status</div><div className="text-xs text-gray-400">{step === PurchaseStep.ReadyToPurchase ? 'Sufficient allowance approved.' : 'Approval will be needed to purchase.'}</div></div>)}
                </div>
              </div>
              
              <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79] pulse-glow">
                <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2"><FiZap /> Select Numbers (1-100)</h3>
                <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-blue-300">Maximum 10 tickets per user per round.{userTickets.length > 0 && (<span className="block mt-1">You already have <span className="font-bold text-yellow-300">{userTickets.length}/10</span> tickets.</span>)}</p>
                </div>
                
                <div className="grid grid-cols-10 gap-2 mb-4">
                  {Array.from({ length: 100 }, (_, i) => i + 1).map((number) => (<button key={number} onClick={() => !isNumberTaken(number) && handleNumberSelect(number)} disabled={isNumberTaken(number)} className={`w-10 h-10 rounded text-sm font-bold transition-all duration-200 border-2 ${isNumberTaken(number) ? 'bg-red-600/50 text-red-300 cursor-not-allowed opacity-60' : selectedNumbers.includes(number) ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white scale-110' : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:scale-105'}`}>{number}</button>))}
                </div>
                
                {errorMessage && (
                  <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-300 text-sm text-center">{errorMessage}</div>
                )}
                
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-300">
                    <div>Total cost: <span className="text-yellow-400 font-bold">{(Number(totalCost)/1e18).toLocaleString()} CHESS</span></div>
                    {!isConnected && <div className="text-red-400 text-xs mt-1">⚠️ Please connect your wallet.</div>}
                  </div>
                  
                  {step < PurchaseStep.ReadyToPurchase ? (
                    <button onClick={handleApprove} disabled={isLoading || !isConnected || selectedNumbers.length === 0} className="px-6 py-3 rounded-xl font-bold text-lg transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                      {isApproveConfirming ? 'Confirming...' : isPending ? 'Check Wallet...' : '1. Approve Budget'}
                    </button>
                  ) : (
                    <button onClick={handlePurchase} disabled={isLoading || !isConnected || selectedNumbers.length === 0} className="px-6 py-3 rounded-xl font-bold text-lg transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed bg-gradient-to-r from-green-600 to-blue-600 text-white">
                      {isPurchased && step !== PurchaseStep.Saving ? 'Success!' : isPurchaseConfirming ? 'Confirming...' : isPending ? 'Check Wallet...' : `2. Buy ${selectedNumbers.length} Ticket(s)`}
                    </button>
                  )}
                </div>
              </div>

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
                  <div className="space-y-3">
                    {userWinnings.map((winning) => (
                      <div key={winning.id} className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-lg font-bold text-green-400">Round #{winning.draw_number}</div>
                          <div className="text-lg font-bold text-yellow-400">{formatChessTokens(winning.amount_won)}</div>
                        </div>
                        <div className="text-sm text-gray-300 mb-3">Winning Number: <span className="text-yellow-400 font-bold">{winning.winning_number}</span> | Your Ticket: <span className="text-cyan-400 font-bold">{winning.ticket_number}</span></div>
                        {!winning.claimed_at ? (
                          <button className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all duration-300 hover:scale-105">🎯 Claim Prize</button>
                        ) : (
                          <div className="text-center text-green-400 font-bold">✅ Claimed on {new Date(winning.claimed_at).toLocaleDateString()}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
              <div className="bg-[#23283a] rounded-xl p-4 border border-[#a64d79] pulse-glow">
                <h3 className="text-lg font-bold text-gray-300 mb-3">How it works:</h3>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Choose up to 10 numbers between 1-100.</li>
                  <li>• Each ticket costs 100,000 CHESS tokens.</li>
                  <li>• Daily draw at 8 PM UTC.</li>
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