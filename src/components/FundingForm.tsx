"use client"

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useWriteContract } from 'wagmi';
import { parseUnits } from 'viem';
import { PROMO_CONTRACT_ADDRESS, PROMO_CONTRACT_ABI, CHESS_TOKEN_ADDRESS, CHESS_TOKEN_ABI } from '@/lib/contracts';
import { FiX } from 'react-icons/fi';
import { PromoCast } from '@/types/promotions';

// Itt definiáljuk a props-okat, amiket a komponens fogad
export interface FundingFormProps {
  promotionId: number;
  totalBudget: number;
  rewardPerShare: number;
  castUrl: string;
  shareText: string;
  status: "active" | "inactive" | "paused" | "completed";
  onSuccess: () => void;
  onCancel: () => void; // JAVÍTÁS: Hozzáadjuk a hiányzó onCancel propot
}

export default function FundingForm({
  promotionId,
  castUrl,
  status,
  onSuccess,
  onCancel, // JAVÍTÁS: Beolvassuk a propot
}: FundingFormProps) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFundCampaign = async () => {
    setError(null);
    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount to fund.");
      return;
    }

    setIsProcessing(true);

    try {
      const decimals = 18; // CHESS token decimálisai
      const amountInWei = parseUnits(amount, decimals);

      // --- 1. LÉPÉS: APPROVE ---
      setProcessingStep("Approving token...");
      await writeContractAsync({
        address: CHESS_TOKEN_ADDRESS,
        abi: CHESS_TOKEN_ABI,
        functionName: 'approve',
        args: [PROMO_CONTRACT_ADDRESS, amountInWei],
      });
      
      // --- 2. LÉPÉS: FUND CAMPAIGN ---
      setProcessingStep("Funding campaign...");
      const fundHash = await writeContractAsync({
        address: PROMO_CONTRACT_ADDRESS,
        abi: PROMO_CONTRACT_ABI,
        functionName: 'fundCampaign',
        args: [promotionId, amountInWei],
      });

      console.log('Campaign funded successfully, tx hash:', fundHash);

      // Nem kell az adatbázist frissíteni itt, mert a contract események alapján
      // egy indexernek kellene ezt megtennie. A frontend egyszerűen frissíti a listát.
      
      onSuccess();

    } catch (err: any) {
      console.error("Campaign funding failed:", err);
      setError(err.shortMessage || err.message || "An unknown error occurred.");
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  return (
    // Modal-szerű felület
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-[#23283a] rounded-2xl p-6 border border-[#a64d79] w-full max-w-md relative">
        <button onClick={onCancel} className="absolute top-3 right-3 text-gray-400 hover:text-white">
          <FiX size={24} />
        </button>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white text-center">Fund Campaign</h2>
          
          <div className="bg-[#181c23] p-3 rounded-lg text-sm">
            <p className="text-white truncate">
              <strong>Cast:</strong> {castUrl}
            </p>
            <p className="text-gray-400">
              <strong>Status:</strong> <span className="font-semibold">{status}</span>
            </p>
          </div>

          <div>
            <label htmlFor="fundAmount" className="block text-sm font-medium text-purple-300">
              Amount to Add ($CHESS)
            </label>
            <input
              type="number"
              id="fundAmount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 block w-full bg-[#181c23] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              placeholder="e.g., 5000"
            />
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
              onClick={handleFundCampaign}
              disabled={isProcessing || !address}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? `Processing: ${processingStep}` : "Fund Campaign"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}