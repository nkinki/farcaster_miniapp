"use client"

import { useState } from "react";
import { useAccount } from "wagmi";
import { useWriteContract } from "wagmi";
import { parseUnits } from "viem";

// JAVÍTÁS: Innen importáljuk a központosított contract adatokat
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

  const [castUrl, setCastUrl] = useState("");
  const [shareText, setShareText] = useState("");
  const [rewardPerShare, setRewardPerShare] = useState("1000");
  const [totalBudget, setTotalBudget] = useState("10000");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreateCampaign = async () => {
    setError(null);
    if (!castUrl || !rewardPerShare || !totalBudget) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!address) {
      setError("Please connect your wallet first.");
      return;
    }

    setIsProcessing(true);
    
    try {
      // A $CHESS token valószínűleg 18 decimális, de ezt a contractból lehet lekérdezni, vagy hardcode-olni.
      const decimals = 18;
      const totalBudgetInWei = parseUnits(totalBudget, decimals);
      const rewardPerShareInWei = parseUnits(rewardPerShare, decimals);

      // --- 1. LÉPÉS: APPROVE ---
      setProcessingStep("Approving token...");
      console.log(`Approving ${totalBudget} $CHESS for spender: ${PROMO_CONTRACT_ADDRESS}`);
      
      const approveHash = await writeContractAsync({
        address: CHESS_TOKEN_ADDRESS,
        abi: CHESS_TOKEN_ABI,
        functionName: 'approve',
        args: [PROMO_CONTRACT_ADDRESS, totalBudgetInWei],
      });

      // Itt lehetne várni a tranzakció receiptjére a jobb UX érdekében, de a gyorsasághoz most nem tesszük.
      console.log("Approval transaction sent:", approveHash);
      
      // --- 2. LÉPÉS: CREATE CAMPAIGN ---
      setProcessingStep("Creating campaign...");
      console.log("Calling createCampaign function on contract...");

      const createCampaignHash = await writeContractAsync({
        address: PROMO_CONTRACT_ADDRESS,
        abi: PROMO_CONTRACT_ABI,
        functionName: 'createCampaign',
        args: [
          castUrl,
          shareText,
          rewardPerShareInWei,
          totalBudgetInWei,
          false // 'divisible' paraméter, a contractod alapján
        ],
      });

      console.log("Create campaign transaction sent:", createCampaignHash);

      // --- 3. LÉPÉS: ADATBÁZISBA MENTÉS ---
      setProcessingStep("Saving details...");
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
          status: 'active' // A kampány a contract logikája szerint azonnal aktív lesz
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save the promotion to the database.');
      }
      
      console.log('Campaign created and saved successfully!');
      alert('Campaign created successfully!');
      onSuccess();

    } catch (err: any) {
      console.error("Campaign creation failed:", err);
      setError(err.shortMessage || err.message || "An unknown error occurred. Check the console.");
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white text-center">Create a New Promotion</h2>
      
      <div>
        <label htmlFor="castUrl" className="block text-sm font-medium text-purple-300">Cast URL*</label>
        <input
          type="text"
          id="castUrl"
          value={castUrl}
          onChange={(e) => setCastUrl(e.target.value)}
          className="mt-1 block w-full bg-[#181c23] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"
          placeholder="https://warpcast.com/..."
        />
      </div>

      <div>
        <label htmlFor="shareText" className="block text-sm font-medium text-purple-300">Share Text (Optional)</label>
        <input
          type="text"
          id="shareText"
          value={shareText}
          onChange={(e) => setShareText(e.target.value)}
          className="mt-1 block w-full bg-[#181c23] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"
          placeholder="Check out this amazing cast!"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="rewardPerShare" className="block text-sm font-medium text-purple-300">Reward / Share ($CHESS)*</label>
          <input
            type="number"
            id="rewardPerShare"
            value={rewardPerShare}
            onChange={(e) => setRewardPerShare(e.target.value)}
            className="mt-1 block w-full bg-[#181c23] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
        <div>
          <label htmlFor="totalBudget" className="block text-sm font-medium text-purple-300">Total Budget ($CHESS)*</label>
          <input
            type="number"
            id="totalBudget"
            value={totalBudget}
            onChange={(e) => setTotalBudget(e.target.value)}
            className="mt-1 block w-full bg-[#181c23] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
      </div>
      
      {error && <p className="text-red-400 text-sm text-center bg-red-900/50 p-3 rounded-md">{error}</p>}
      
      <div className="flex items-center gap-4 pt-4">
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleCreateCampaign}
          disabled={isProcessing || !address}
          className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? `Processing: ${processingStep}` : "Create & Fund Campaign"}
        </button>
      </div>
      {!address && <p className="text-yellow-400 text-xs text-center mt-2">Please connect your wallet to create a campaign.</p>}
    </div>
  );
}