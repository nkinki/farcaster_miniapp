"use client"

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, type Hash } from "viem";
import { PROMO_CONTRACT_ADDRESS, PROMO_CONTRACT_ABI, CHESS_TOKEN_ADDRESS, CHESS_TOKEN_ABI } from "@/lib/contracts";

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

enum CreationStep {
  Idle, Approving, Creating, Saving, Done,
}

// JAVÍTÁS: Konstansok a gombokhoz és egy helper a formázáshoz
const budgetOptions = [10000, 100000, 500000, 1000000, 5000000];
const rewardOptions = [1000, 2000, 5000, 10000, 20000];

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${num / 1000000}M`;
  if (num >= 1000) return `${num / 1000}K`;
  return num.toString();
};

export default function PaymentForm({ user, onSuccess, onCancel }: PaymentFormProps) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [castUrl, setCastUrl] = useState("https://warpcast.com/dwr/0x5c7987b7");
  const [shareText, setShareText] = useState("");
  
  // JAVÍTÁS: Az alapértelmezett értékek most a listák első elemei
  const [rewardPerShare, setRewardPerShare] = useState(rewardOptions[0].toString());
  const [totalBudget, setTotalBudget] = useState(budgetOptions[0].toString());
  
  const [step, setStep] = useState<CreationStep>(CreationStep.Idle);
  const [error, setError] = useState<string | null>(null);
  const [approveTxHash, setApproveTxHash] = useState<Hash | undefined>();
  const [createTxHash, setCreateTxHash] = useState<Hash | undefined>();

  const { isSuccess: isApproved } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isSuccess: isCreated } = useWaitForTransactionReceipt({ hash: createTxHash });

  const handleStartCreationProcess = async () => {
    setError(null);
    if (!castUrl || !rewardPerShare || !totalBudget || !address) {
      setError("Please fill all fields and connect your wallet.");
      return;
    }
    if (Number(rewardPerShare) > Number(totalBudget)) {
        setError("Reward per share cannot be greater than the total budget.");
        return;
    }
    setStep(CreationStep.Approving);
    try {
      const decimals = 18;
      const totalBudgetInWei = parseUnits(totalBudget, decimals);
      const hash = await writeContractAsync({
        address: CHESS_TOKEN_ADDRESS, abi: CHESS_TOKEN_ABI, functionName: 'approve',
        args: [PROMO_CONTRACT_ADDRESS, totalBudgetInWei],
      });
      setApproveTxHash(hash);
    } catch (err: any) {
      console.error("Approval failed at submission:", err);
      setError(err.shortMessage || "User rejected the approval transaction.");
      setStep(CreationStep.Idle);
    }
  };
  
  useEffect(() => {
    const createCampaignOnChain = async () => {
      if (isApproved && step === CreationStep.Approving) {
        setStep(CreationStep.Creating);
        try {
          const decimals = 18;
          const totalBudgetInWei = parseUnits(totalBudget, decimals);
          const rewardPerShareInWei = parseUnits(rewardPerShare, decimals);
          const hash = await writeContractAsync({
            address: PROMO_CONTRACT_ADDRESS, abi: PROMO_CONTRACT_ABI, functionName: 'createCampaign',
            args: [castUrl, rewardPerShareInWei, totalBudgetInWei],
          });
          setCreateTxHash(hash);
        } catch (err: any) {
          console.error("Campaign creation failed:", err);
          setError(err.shortMessage || "The creation transaction failed.");
          setStep(CreationStep.Idle);
        }
      }
    };
    createCampaignOnChain();
  }, [isApproved, step, address, castUrl, rewardPerShare, totalBudget, writeContractAsync]);
  
  useEffect(() => {
    const saveToDb = async () => {
      if (isCreated && step === CreationStep.Creating) {
        setStep(CreationStep.Saving);
        try {
          const response = await fetch('/api/promotions', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fid: user.fid, username: user.username, displayName: user.displayName,
              castUrl: castUrl, shareText: shareText,
              rewardPerShare: Number(rewardPerShare), totalBudget: Number(totalBudget),
              blockchainHash: createTxHash, status: 'active'
            }),
          });
          if (!response.ok) throw new Error('Failed to save to DB.');
          setStep(CreationStep.Done);
          onSuccess();
        } catch (err: any) {
          console.error("Saving to DB failed:", err);
          setError("On-chain success, but DB save failed.");
          setStep(CreationStep.Idle);
        }
      }
    };
    saveToDb();
  }, [isCreated, step, castUrl, createTxHash, onSuccess, rewardPerShare, shareText, totalBudget, user]);

  const getButtonText = () => { /* ... (változatlan) ... */ };
  
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white text-center">Create a New Promotion</h2>
      {/* Cast URL és Share Text inputok változatlanok */}
      <div>
        <label htmlFor="castUrl" className="block text-sm font-medium text-purple-300 mb-1">Cast URL*</label>
        <input type="text" id="castUrl" value={castUrl} onChange={(e) => setCastUrl(e.target.value)} className="w-full bg-[#181c23] border border-gray-600 rounded-md py-2 px-3 text-white" />
      </div>
      <div>
        <label htmlFor="shareText" className="block text-sm font-medium text-purple-300 mb-1">Share Text (Optional)</label>
        <input type="text" id="shareText" value={shareText} onChange={(e) => setShareText(e.target.value)} className="w-full bg-[#181c23] border border-gray-600 rounded-md py-2 px-3 text-white" />
      </div>

      {/* JAVÍTÁS: Reward per Share gombok */}
      <div>
        <label className="block text-sm font-medium text-purple-300 mb-1">Reward / Share ($CHESS)*</label>
        <div className="grid grid-cols-5 gap-2">
          {rewardOptions.map((amount) => (
            <button
              key={amount}
              onClick={() => setRewardPerShare(amount.toString())}
              className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                rewardPerShare === amount.toString()
                  ? "bg-green-600 text-white shadow-lg"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {formatNumber(amount)}
            </button>
          ))}
        </div>
      </div>

      {/* JAVÍTÁS: Total Budget gombok */}
      <div>
        <label className="block text-sm font-medium text-purple-300 mb-1">Total Budget ($CHESS)*</label>
        <div className="grid grid-cols-5 gap-2">
          {budgetOptions.map((amount) => (
            <button
              key={amount}
              onClick={() => setTotalBudget(amount.toString())}
              className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                totalBudget === amount.toString()
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {formatNumber(amount)}
            </button>
          ))}
        </div>
      </div>
      
      {error && <p className="text-red-400 text-sm text-center bg-red-900/50 p-3 rounded-md">{error}</p>}
      
      {/* A Cancel és Create gombok változatlanok */}
      <div className="flex items-center gap-4 pt-4">
        <button onClick={onCancel} disabled={step !== CreationStep.Idle} className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50">
          Cancel
        </button>
        <button onClick={handleStartCreationProcess} disabled={step !== CreationStep.Idle || !address} className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
          {getButtonText()}
        </button>
      </div>
    </div>
  );
}