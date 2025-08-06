"use client"

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, type Hash } from "viem";
// JAVÍTÁS: Az új ABI-kat importáljuk
import { treasuryDepositAddress, treasuryDepositABI } from "@/abis/treasuryDeposit";
import { CHESS_TOKEN_ADDRESS, CHESS_TOKEN_ABI } from "@/abis/chessToken"; // Győződj meg róla, hogy a chessToken.ts létezik az abis mappában

interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
}

interface PaymentFormProps {
  user: FarcasterUser;
  onSuccess: () => void;
  onCancel: () => void;
}

// ÚJ: Létrehoztunk egyértelmű lépéseket a folyamathoz
enum CreationStep {
  Idle,
  Approving,
  ApproveConfirming,
  ReadyToCreate,
  Creating,
  CreateConfirming,
  Saving,
}

const budgetOptions = [10000, 100000, 500000, 1000000, 5000000];
const rewardOptions = [1000, 2000, 5000, 10000, 20000];

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${num / 1000000}M`;
  if (num >= 1000) return `${num / 1000}K`;
  return num.toString();
};

export default function PaymentForm({ user, onSuccess, onCancel }: PaymentFormProps) {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const [castUrl, setCastUrl] = useState("https://warpcast.com/dwr/0x5c7987b7");
  const [shareText, setShareText] = useState("");
  const [rewardPerShare, setRewardPerShare] = useState(rewardOptions[0].toString());
  const [totalBudget, setTotalBudget] = useState(budgetOptions[0].toString());
  
  const [step, setStep] = useState<CreationStep>(CreationStep.Idle);
  const [error, setError] = useState<string | null>(null);
  
  const [approveTxHash, setApproveTxHash] = useState<Hash | undefined>();
  const [createTxHash, setCreateTxHash] = useState<Hash | undefined>();

  const { isSuccess: isApproved, isLoading: isApproveConfirming } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isSuccess: isCreated, isLoading: isCreateConfirming } = useWaitForTransactionReceipt({ hash: createTxHash });

  useEffect(() => {
    if (isApproved) {
      setStep(CreationStep.ReadyToCreate);
    }
  }, [isApproved]);

  useEffect(() => {
    const saveToDb = async () => {
      if (isCreated && step === CreationStep.CreateConfirming) {
        setStep(CreationStep.Saving);
        try {
          // Most már a backendnek nem kell smart contractot hívnia
          const response = await fetch('/api/promotions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fid: user.fid, username: user.username, displayName: user.displayName,
              castUrl: castUrl, shareText: shareText,
              rewardPerShare: Number(rewardPerShare), totalBudget: Number(totalBudget),
              blockchainHash: createTxHash, // A befizetési tranzakció hash-ét mentjük
              status: 'active',
            }),
          });
          if (!response.ok) throw new Error('Failed to save promotion to the database.');
          
          onSuccess();
        } catch (err: any) {
          setError("On-chain deposit was successful, but saving failed. Please contact support.");
          setStep(CreationStep.ReadyToCreate);
        }
      }
    };
    saveToDb();
  }, [isCreated, step, user, castUrl, shareText, rewardPerShare, totalBudget, createTxHash, onSuccess]);

  const handleApprove = async () => {
    setError(null);
    if (!totalBudget || !address) {
      setError("Please select a budget and connect your wallet.");
      return;
    }
    
    setStep(CreationStep.Approving);
    try {
      const totalBudgetInWei = parseUnits(totalBudget, 18);
      const hash = await writeContractAsync({
        address: CHESS_TOKEN_ADDRESS,
        abi: CHESS_TOKEN_ABI,
        functionName: 'approve',
        args: [treasuryDepositAddress, totalBudgetInWei],
      });
      setApproveTxHash(hash);
      setStep(CreationStep.ApproveConfirming);
    } catch (err: any) {
      setError(err.shortMessage || "User rejected the approval transaction.");
      setStep(CreationStep.Idle);
    }
  };

  const handleCreateAndDeposit = async () => {
    setError(null);
    if (!castUrl || Number(rewardPerShare) > Number(totalBudget)) {
      setError("Please fill all fields correctly. Reward cannot be greater than budget.");
      return;
    }

    setStep(CreationStep.Creating);
    try {
        const totalBudgetInWei = parseUnits(totalBudget, 18);
        const hash = await writeContractAsync({
            address: treasuryDepositAddress,
            abi: treasuryDepositABI,
            functionName: 'depositFunds',
            args: [totalBudgetInWei],
        });
        setCreateTxHash(hash);
        setStep(CreationStep.CreateConfirming);
    } catch (err: any) {
        setError(err.shortMessage || "Deposit transaction failed.");
        setStep(CreationStep.ReadyToCreate);
    }
  };

  const isLoading = isPending || isApproveConfirming || isCreateConfirming;
  
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white text-center">Create a New Promotion</h2>
      <div>
        <label htmlFor="castUrl" className="block text-sm font-medium text-purple-300 mb-1">Cast URL*</label>
        <input type="text" id="castUrl" value={castUrl} onChange={(e) => setCastUrl(e.target.value)} className="w-full bg-[#181c23] border border-gray-600 rounded-md py-2 px-3 text-white" disabled={step >= CreationStep.ReadyToCreate} />
      </div>
      <div>
        <label htmlFor="shareText" className="block text-sm font-medium text-purple-300 mb-1">Share Text (Optional)</label>
        <input type="text" id="shareText" value={shareText} onChange={(e) => setShareText(e.target.value)} className="w-full bg-[#181c23] border border-gray-600 rounded-md py-2 px-3 text-white" disabled={step >= CreationStep.ReadyToCreate}/>
      </div>
      <div>
        <label className="block text-sm font-medium text-purple-300 mb-1">Reward / Share ($CHESS)*</label>
        <div className="grid grid-cols-5 gap-2">
          {rewardOptions.map((amount) => (
            <button key={amount} onClick={() => setRewardPerShare(amount.toString())} disabled={step >= CreationStep.ReadyToCreate} className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${rewardPerShare === amount.toString() ? "bg-green-600 text-white shadow-lg" : "bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:bg-gray-800"}`}>
              {formatNumber(amount)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-purple-300 mb-1">Total Budget ($CHESS)*</label>
        <div className="grid grid-cols-5 gap-2">
          {budgetOptions.map((amount) => (
            <button key={amount} onClick={() => setTotalBudget(amount.toString())} disabled={step >= CreationStep.ReadyToCreate} className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${totalBudget === amount.toString() ? "bg-blue-600 text-white shadow-lg" : "bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:bg-gray-800"}`}>
              {formatNumber(amount)}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm text-center bg-red-900/50 p-3 rounded-md">{error}</p>}
      
      <div className="flex items-center gap-4 pt-4">
        <button onClick={onCancel} disabled={isLoading} className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50">Cancel</button>
        
        {step < CreationStep.ReadyToCreate ? (
            <button onClick={handleApprove} disabled={isLoading || !address} className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50">
                {isApproveConfirming ? 'Confirming Approval...' : isPending ? 'Check Wallet...' : '1. Approve Budget'}
            </button>
        ) : (
            <button onClick={handleCreateAndDeposit} disabled={isLoading || !address} className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50">
                {isCreateConfirming ? 'Confirming Deposit...' : isPending ? 'Check Wallet...' : '2. Create & Deposit'}
            </button>
        )}
      </div>
    </div>
  );
}