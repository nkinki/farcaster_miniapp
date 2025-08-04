"use client"

import { useState } from "react";
import { useAccount } from "wagmi";
import { useWriteContract } from "wagmi";
import { parseUnits } from "viem";
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

export default function PaymentForm({ user, onSuccess, onCancel }: PaymentFormProps) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [castUrl, setCastUrl] = useState("https://warpcast.com/dwr/0x5c7987b7");
  const [shareText, setShareText] = useState("");
  const [rewardPerShare, setRewardPerShare] = useState("1000");
  const [totalBudget, setTotalBudget] = useState("10000");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreateCampaign = async () => {
    setError(null);
    if (!castUrl || !rewardPerShare || !totalBudget || !address) {
      setError("Please fill all fields and connect your wallet.");
      return;
    }

    setIsProcessing(true);
    
    try {
      const decimals = 18;
      const totalBudgetInWei = parseUnits(totalBudget, decimals);
      const rewardPerShareInWei = parseUnits(rewardPerShare, decimals);

      // --- 1. LÉPÉS: APPROVE ---
      setProcessingStep("1/2: Approving in wallet...");
      await writeContractAsync({
        address: CHESS_TOKEN_ADDRESS,
        abi: CHESS_TOKEN_ABI,
        functionName: 'approve',
        args: [PROMO_CONTRACT_ADDRESS, totalBudgetInWei],
      });

      // --- 2. LÉPÉS: CREATE CAMPAIGN ---
      setProcessingStep("2/2: Creating in wallet...");
      const createCampaignHash = await writeContractAsync({
        address: PROMO_CONTRACT_ADDRESS,
        abi: PROMO_CONTRACT_ABI,
        functionName: 'createCampaign',
        args: [
          castUrl,
          rewardPerShareInWei,
          totalBudgetInWei
        ],
      });

      // --- 3. LÉPÉS: ADATBÁZISBA MENTÉS ---
      setProcessingStep("Saving...");
      const response = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: user.fid,
          username: user.username,
          displayName: user.displayName,
          castUrl: castUrl,
          shareText: shareText,
          rewardPerShare: Number(rewardPerShare),
          totalBudget: Number(totalBudget),
          blockchainHash: createCampaignHash,
          status: 'active'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save the promotion to the database.');
      }
      
      alert('Campaign created successfully!');
      onSuccess();

    } catch (err: any) {
      console.error("Campaign creation failed:", err);
      setError(err.shortMessage || err.message || "An unknown error occurred.");
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white text-center">Create a New Promotion</h2>
      {/* Az űrlap JSX kódja változatlan */}
      <div>
        <label htmlFor="castUrl" className="block text-sm font-medium text-purple-300">Cast URL*</label>
        <input type="text" id="castUrl" value={castUrl} onChange={(e) => setCastUrl(e.target.value)} className="mt-1 block w-full bg-[#181c23] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" placeholder="https://warpcast.com/..."/>
      </div>
      <div>
        <label htmlFor="shareText" className="block text-sm font-medium text-purple-300">Share Text (Optional)</label>
        <input type="text" id="shareText" value={shareText} onChange={(e) => setShareText(e.target.value)} className="mt-1 block w-full bg-[#181c23] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" placeholder="Check out this amazing cast!"/>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="rewardPerShare" className="block text-sm font-medium text-purple-300">Reward / Share ($CHESS)*</label>
          <input type="number" id="rewardPerShare" value={rewardPerShare} onChange={(e) => setRewardPerShare(e.target.value)} className="mt-1 block w-full bg-[#181c23] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"/>
        </div>
        <div>
          <label htmlFor="totalBudget" className="block text-sm font-medium text-purple-300">Total Budget ($CHESS)*</label>
          <input type="number" id="totalBudget" value={totalBudget} onChange={(e) => setTotalBudget(e.target.value)} className="mt-1 block w-full bg-[#181c23] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"/>
        </div>
      </div>
      
      {error && <p className="text-red-400 text-sm text-center bg-red-900/50 p-3 rounded-md">{error}</p>}
      
      <div className="flex items-center gap-4 pt-4">
        <button onClick={onCancel} disabled={isProcessing} className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50">
          Cancel
        </button>
        <button onClick={handleCreateCampaign} disabled={isProcessing || !address} className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
          {isProcessing ? `Processing: ${processingStep}` : "Create & Fund Campaign"}
        </button>
      </div>
    </div>
  );
}