"use client"

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, type Hash } from "viem";

// JAVÍTÁS: Közvetlenül az ABI fájlokból importálunk a maximális tisztaság érdekében.
import { CHESS_TOKEN_ADDRESS, CHESS_TOKEN_ABI } from "@/abis/chessToken";
import { PROMO_CONTRACT_ADDRESS, PROMO_CONTRACT_ABI } from "@/abis/farcasterPromo"; // Feltételezzük, hogy a régi promo ABI itt van.

interface FundingFormProps {
  promotionId: string | number;
  totalBudget: number;
  rewardPerShare: number;
  castUrl: string;
  shareText: string;
  status: string;
  onSuccess: () => void;
  onCancel: () => void;
}

enum FundingStep {
  Idle,
  Approving,
  ApproveConfirming,
  ReadyToFund,
  Funding,
  FundConfirming,
}

export default function FundingForm({ promotionId, onSuccess, onCancel }: FundingFormProps) {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  
  const [amount, setAmount] = useState('10000'); // Alapértelmezett finanszírozási összeg
  const [step, setStep] = useState<FundingStep>(FundingStep.Idle);
  const [error, setError] = useState<string | null>(null);

  const [approveTxHash, setApproveTxHash] = useState<Hash | undefined>();
  const [fundTxHash, setFundTxHash] = useState<Hash | undefined>();

  const { isSuccess: isApproved, isLoading: isApproveConfirming } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isSuccess: isFunded, isLoading: isFundConfirming } = useWaitForTransactionReceipt({ hash: fundTxHash });

  useEffect(() => {
    if (isApproved) {
      setStep(FundingStep.ReadyToFund);
    }
  }, [isApproved]);

  useEffect(() => {
    if (isFunded) {
      alert('Campaign funded successfully!');
      onSuccess();
    }
  }, [isFunded, onSuccess]);

  const handleApprove = async () => {
    setError(null);
    if (!amount || Number(amount) <= 0 || !address) {
      setError("Please enter a valid amount and connect your wallet.");
      return;
    }
    
    setStep(FundingStep.Approving);
    try {
      const amountInWei = parseUnits(amount, 18);
      const hash = await writeContractAsync({
        address: CHESS_TOKEN_ADDRESS,
        abi: CHESS_TOKEN_ABI,
        functionName: 'approve',
        args: [PROMO_CONTRACT_ADDRESS, amountInWei],
      });
      setApproveTxHash(hash);
      setStep(FundingStep.ApproveConfirming);
    } catch (err: any) {
      setError(err.shortMessage || "User rejected the approval transaction.");
      setStep(FundingStep.Idle);
    }
  };

  const handleFund = async () => {
    setError(null);
    if (!amount || Number(amount) <= 0 || !address) {
      setError("Please enter a valid amount.");
      return;
    }
    
    setStep(FundingStep.Funding);
    try {
      const amountInWei = parseUnits(amount, 18);
      const hash = await writeContractAsync({
        address: PROMO_CONTRACT_ADDRESS,
        abi: PROMO_CONTRACT_ABI,
        functionName: 'fundCampaign',
        args: [BigInt(promotionId), amountInWei],
      });
      setFundTxHash(hash);
      setStep(FundingStep.FundConfirming);
    } catch (err: any) {
      setError(err.shortMessage || "Funding transaction failed.");
      setStep(FundingStep.ReadyToFund);
    }
  };

  const isLoading = isPending || isApproveConfirming || isFundConfirming;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#23283a] rounded-2xl p-6 border border-[#a64d79] w-full max-w-md space-y-4">
        <h2 className="text-2xl font-bold text-white text-center">Fund Existing Campaign</h2>
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-purple-300 mb-1">
            Amount to Add ($CHESS)
          </label>
          <input 
            type="number" 
            id="amount" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-[#181c23] border border-gray-600 rounded-md py-2 px-3 text-white"
            placeholder="e.g., 10000"
            disabled={step >= FundingStep.ReadyToFund}
          />
        </div>
        
        {error && <p className="text-red-400 text-sm text-center bg-red-900/50 p-3 rounded-md">{error}</p>}
        
        <div className="flex items-center gap-4 pt-4">
          <button onClick={onCancel} disabled={isLoading} className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50">
            Cancel
          </button>

          {step < FundingStep.ReadyToFund ? (
            <button onClick={handleApprove} disabled={isLoading || !address} className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50">
                {isApproveConfirming ? 'Confirming...' : isPending ? 'Check Wallet...' : '1. Approve Funds'}
            </button>
          ) : (
            <button onClick={handleFund} disabled={isLoading || !address} className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50">
                {isFundConfirming ? 'Confirming...' : isPending ? 'Check Wallet...' : '2. Add Funds'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}