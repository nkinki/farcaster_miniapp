"use client"

import { useState, useEffect } from "react"
import { FiAlertCircle, FiCheckCircle } from "react-icons/fi"
import { useFarcasterPromo } from "@/hooks/useFarcasterPromo"
import { useChessToken } from "@/hooks/useChessToken"
import { usePromotion } from "@/hooks/usePromotions"
import { useAccount, useSimulateContract, useWaitForTransactionReceipt } from "wagmi"
import FARCASTER_PROMO_ABI from "../../abis/FarcasterPromo.json"
import { CONTRACTS } from "@/config/contracts"
import { BaseError } from "viem"

interface PaymentFormProps {
  promotionId: string
  onPaymentComplete: (amount: number, hash: string) => void
  onCancel: () => void
  newCampaignData?: {
    castUrl: string
    shareText: string
    rewardPerShare: number
    totalBudget: number
    user: {
      fid: number
      username: string
      displayName: string
    }
  }
}

export default function PaymentForm({ promotionId, onPaymentComplete, onCancel, newCampaignData }: PaymentFormProps) {
  const [error, setError] = useState<string>("")
  const [successMessage, setSuccessMessage] = useState<string>("")

  // Wagmi hooks
  const { address, isConnected } = useAccount()

  // Custom Hooks
  const { 
    fundCampaign, 
    isFundingCampaign, 
    createCampaign, 
    isCreatingCampaign 
  } = useFarcasterPromo()
  
  const { 
    balance, 
    allowance, 
    approve, 
    isApproving, 
    needsApproval
  } = useChessToken()

  const { promotion, loading: promotionLoading } = usePromotion(
    promotionId === 'new' ? undefined : Number(promotionId)
  )

  // A legfontosabb hook: a createCampaign szimulációja
  const { data: createSimulation, error: createSimulationError } = useSimulateContract({
    address: CONTRACTS.FarcasterPromo as `0x${string}`,
    abi: FARCASTER_PROMO_ABI,
    functionName: 'createCampaign',
    // Itt kell nagyon pontosnak lenni az argumentumokkal!
    // A hiba valószínűleg itt van: ellenőrizd a szerződésed paramétereit!
    args: newCampaignData ? [
      newCampaignData.castUrl, // GYANÚS: Lehet, hogy csak a cast hash-t várja?
      newCampaignData.shareText || 'Share this promotion!',
      BigInt(newCampaignData.rewardPerShare) * BigInt(10 ** 18),
      BigInt(newCampaignData.totalBudget) * BigInt(10 ** 18),
      true // divisible
    ] : undefined,
    query: {
      // Csak akkor fusson a szimuláció, ha új kampányt hozunk létre
      enabled: !!newCampaignData && promotionId === 'new',
    },
  })

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`
    return num.toString()
  }

  // --- ÚJ, EGYSÉGESÍTETT FOLYAMATOK ---

  /**
   * Kezeli az ÚJ kampány létrehozásának teljes folyamatát.
   * Használja a szimulált adatokat, ha elérhetőek.
   */
  const handleCreateNewCampaign = () => {
    setError("")
    setSuccessMessage("")
    if (!newCampaignData) return setError("Campaign data is missing.");
    if (!createSimulation?.request) {
      // Explicit hibaüzenet a szimuláció sikertelenségéről
      const simulationErrorMessage = createSimulationError instanceof BaseError 
        ? createSimulationError.shortMessage 
        : "Simulation failed. Check contract arguments.";
      console.error("🔥 Create Simulation Error:", createSimulationError);
      return setError(`Simulation Error: ${simulationErrorMessage}`);
    }

    console.log("🚀 Creating new campaign with simulated request...");
    createCampaign(createSimulation.request, {
      onSuccess: (hash) => {
        setSuccessMessage(`Campaign created! Tx: ${hash.slice(0,10)}...`);
        // Itt lehetne a DB mentést is elindítani
        onPaymentComplete(newCampaignData.totalBudget, hash);
      },
    });
  };

  /**
   * Kezeli a MEGLÉVŐ kampány finanszírozásának teljes folyamatát.
   * Ellenőrzi, hogy kell-e approval, és automatikusan továbblép.
   */
  const handleFundingProcess = () => {
    setError("")
    setSuccessMessage("")
    if (!promotion) return setError("Promotion data is missing for funding.");
    
    const budget = BigInt(promotion.total_budget) * BigInt(10 ** 18);
    
    const executeFund = () => {
      console.log(`💸 Funding campaign ${promotion.id} with ${budget.toString()}`);
      fundCampaign({
          promotionId: BigInt(promotion.id),
          amount: budget,
      }, {
        onSuccess: (hash) => {
          setSuccessMessage(`Funding successful! Tx: ${hash.slice(0,10)}...`);
          onPaymentComplete(promotion.total_budget, hash);
        }
      });
    };

    if (needsApproval(budget)) {
      console.log(" Approval is needed. Starting approval process...");
      approve(
        [CONTRACTS.FarcasterPromo as `0x${string}`, budget],
        { 
          onSuccess: () => {
            console.log("✅ Approval successful, proceeding to fund campaign.");
            setSuccessMessage("Approval successful! Now funding...");
            executeFund();
          }
        }
      );
    } else {
      console.log("👍 No approval needed. Funding directly.");
      executeFund();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-purple-800 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">
          {promotionId === 'new' ? 'Create & Fund Campaign' : 'Fund Campaign'}
        </h2>

        {/* --- ÚJ KAMPÁNY LÉTREHOZÁSA SZEKCIÓ --- */}
        {promotionId === 'new' && newCampaignData && (
          <div>
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Campaign Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Cast:</span><span className="text-white truncate max-w-[200px]">{newCampaignData.castUrl}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Reward/Share:</span><span className="text-green-400">{formatNumber(newCampaignData.rewardPerShare)} $CHESS</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Total Budget:</span><span className="text-blue-400">{formatNumber(newCampaignData.totalBudget)} $CHESS</span></div>
              </div>
            </div>
            
            <button
              onClick={handleCreateNewCampaign}
              disabled={!createSimulation?.request || isCreatingCampaign}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {isCreatingCampaign ? 'Creating...' : 'Create Campaign'}
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">Campaign creation is a free transaction on Base.</p>
          </div>
        )}

        {/* --- MEGLÉVŐ KAMPÁNY FINANSZÍROZÁSA SZEKCIÓ --- */}
        {promotionId !== 'new' && promotion && (
          <div>
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Funding Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">Campaign ID:</span><span className="text-white">{promotion.id}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Total to Fund:</span><span className="text-blue-400">{formatNumber(promotion.total_budget)} $CHESS</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Your Balance:</span><span className="text-white">{balance ? `${formatNumber(Number(balance) / 1e18)}` : '0'} $CHESS</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Needs Approval:</span><span className={`font-bold ${needsApproval(BigInt(promotion.total_budget) * BigInt(10**18)) ? 'text-yellow-400' : 'text-green-400'}`}>{needsApproval(BigInt(promotion.total_budget) * BigInt(10**18)) ? 'Yes' : 'No'}</span></div>
                </div>
              </div>

              <button
                onClick={handleFundingProcess}
                disabled={isApproving || isFundingCampaign}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {isApproving ? 'Approving...' : isFundingCampaign ? 'Funding...' : needsApproval(BigInt(promotion.total_budget) * BigInt(10**18)) ? 'Approve & Fund' : 'Fund Campaign'}
              </button>
          </div>
        )}
        
        {/* --- ÁLTALÁNOS ÜZENETEK ÉS GOMBOK --- */}
        {/* Sikeres üzenet */}
        {successMessage && (
          <div className="flex items-center gap-2 text-green-400 mt-4 p-3 bg-green-900 bg-opacity-30 rounded-lg">
            <FiCheckCircle />
            <span className="text-sm">{successMessage}</span>
          </div>
        )}
        
        {/* Hibaüzenet */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 mt-4 p-3 bg-red-900 bg-opacity-30 rounded-lg">
            <FiAlertCircle />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="mt-4">
          <button
            onClick={onCancel}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}