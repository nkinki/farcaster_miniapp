// src/components/PaymentForm.tsx

"use client";

import { useState, useEffect } from "react";
import { FiAlertCircle, FiCheckCircle, FiLoader } from "react-icons/fi";
import { useSimulateContract } from "wagmi";
import { BaseError } from "viem";
import { useFarcasterPromo } from "@/hooks/useFarcasterPromo";
import { useChessToken } from "@/hooks/useChessToken";
import { usePromotion } from "@/hooks/usePromotions";
import { CONTRACTS } from "@/config/contracts";
import FARCASTER_PROMO_ABI from "@/abis/FarcasterPromo.json"; // Ellenőrizd az útvonalat

interface PaymentFormProps {
  promotionId: string; // 'new' vagy egy létező ID
  onComplete: (amount: number, hash: string) => void;
  onCancel: () => void;
  newCampaignData?: {
    castUrl: string;
    shareText: string;
    rewardPerShare: number;
    totalBudget: number;
  };
}

export default function PaymentForm({ promotionId, onComplete, onCancel, newCampaignData }: PaymentFormProps) {
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  
  const { createCampaign, isCreatingCampaign, fundCampaign, isFundingCampaign } = useFarcasterPromo();
  const { approve, isApproving, needsApproval } = useChessToken();
  const { promotion } = usePromotion(promotionId === 'new' ? undefined : Number(promotionId));

  const isNewCampaign = promotionId === 'new';

  // --- SZIMULÁCIÓ ÚJ KAMPÁNY LÉTREHOZÁSÁHOZ ---
  const { data: simResult, error: simError } = useSimulateContract({
    address: CONTRACTS.FarcasterPromo as `0x${string}`,
    abi: FARCASTER_PROMO_ABI,
    functionName: 'createCampaign',
    args: newCampaignData ? [
      newCampaignData.castUrl,
      newCampaignData.shareText || 'Share this promotion!',
      BigInt(newCampaignData.rewardPerShare) * BigInt(10 ** 18),
      BigInt(newCampaignData.totalBudget) * BigInt(10 ** 18),
      true
    ] : undefined,
    query: { enabled: isNewCampaign && !!newCampaignData },
  });

  // --- ESEMÉNYKEZELŐK ---
  const handleCreate = () => {
    if (!simResult?.request) {
      const errMsg = simError instanceof BaseError ? simError.shortMessage : "Simulation failed. Check console for details.";
      setError(`Cannot create campaign: ${errMsg}`);
      console.error("Simulation Error:", simError);
      return;
    }
    setError("");
    setSuccessMessage("Creating campaign on the blockchain...");
    createCampaign(simResult.request, {
      onSuccess: (hash) => {
        setSuccessMessage(`Campaign created successfully!`);
        // Itt kellene a DB-be írás, majd a teljesítés jelzése
        onComplete(newCampaignData!.totalBudget, hash);
      },
    });
  };

  const handleFund = () => {
    if (!promotion) return setError("Promotion data not found.");
    const budget = BigInt(promotion.total_budget) * BigInt(10 ** 18);
    setError("");
    
    const executeFund = () => {
      setSuccessMessage("Funding campaign...");
      fundCampaign({ /* args for funding */ }, {
        onSuccess: (hash) => {
          setSuccessMessage("Funding successful!");
          onComplete(promotion.total_budget, hash);
        }
      });
    };
    
    if (needsApproval(budget)) {
      setSuccessMessage("Approval required. Please confirm in your wallet...");
      approve([CONTRACTS.FarcasterPromo as `0x${string}`, budget], {
        onSuccess: () => {
          setSuccessMessage("Approval successful! Now funding...");
          executeFund();
        }
      });
    } else {
      executeFund();
    }
  };

  const isLoading = isCreatingCampaign || isFundingCampaign || isApproving;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-purple-800 shadow-lg text-white">
        <h2 className="text-xl font-bold mb-4">{isNewCampaign ? "Confirm Campaign Creation" : "Fund Existing Campaign"}</h2>
        
        {/* Tartalom */}
        <div className="space-y-4">
          {isNewCampaign && newCampaignData ? (
            <>
              <p className="text-sm text-gray-300">You are about to create a new campaign on the Base blockchain. This transaction is free (you only pay for gas).</p>
              <button onClick={handleCreate} disabled={isLoading || !simResult?.request} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg py-3 font-semibold">
                {isLoading ? <FiLoader className="animate-spin mx-auto"/> : "Confirm & Create"}
              </button>
            </>
          ) : promotion ? (
            <>
              <p className="text-sm text-gray-300">You are about to fund campaign #{promotion.id} with {promotion.total_budget.toLocaleString()} $CHESS.</p>
              <button onClick={handleFund} disabled={isLoading} className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg py-3 font-semibold">
                {isApproving ? "Approving..." : isFundingCampaign ? "Funding..." : "Approve & Fund"}
              </button>
            </>
          ) : <p>Loading promotion data...</p>}
        </div>

        {/* Üzenetek */}
        <div className="mt-4 min-h-[40px]">
          {successMessage && <div className="flex items-center gap-2 text-green-400 p-2 bg-green-900/30 rounded-lg"><FiCheckCircle /><span>{successMessage}</span></div>}
          {error && <div className="flex items-center gap-2 text-red-400 p-2 bg-red-900/30 rounded-lg"><FiAlertCircle /><span>{error}</span></div>}
        </div>

        {/* Bezárás gomb */}
        <button onClick={onCancel} disabled={isLoading} className="w-full mt-2 bg-gray-700 hover:bg-gray-600 rounded-lg py-2 text-sm disabled:opacity-50">
          Cancel
        </button>
      </div>
    </div>
  );
}