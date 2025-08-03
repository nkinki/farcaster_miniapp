"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useAccount } from "wagmi"
import { useChessToken } from "../hooks/useChessToken"
import { useFarcasterPromo } from "../hooks/useFarcasterPromo"

// Types and Enums
type PromotionStatus = "inactive" | "active"
type FundingStep = "idle" | "approving" | "funding" | "creating" | "done"

interface FundingFormProps {
  promotionId: number
  totalBudget: number
  rewardPerShare: number
  castUrl: string
  shareText: string
  status: PromotionStatus
  onchainCampaignId?: number
  onSuccess?: () => void
}

interface FundingState {
  error: string | null
  success: boolean
  step: FundingStep
}

// Constants
const CHESS_DECIMALS = 1e18
const API_ENDPOINTS = {
  PROMOTION: (id: number) => `/api/promotions/${id}`
} as const

// Custom hook for funding logic
function useFundingLogic({
  promotionId,
  totalBudget,
  rewardPerShare,
  castUrl,
  shareText,
  status,
  onchainCampaignId,
  onSuccess
}: FundingFormProps) {
  const [state, setState] = useState<FundingState>({
    error: null,
    success: false,
    step: "idle"
  })

  const {
    approveFarcasterPromo,
    isApproving,
    needsApproval,
    parseChessAmount,
    balance,
    allowance,
  } = useChessToken()

  const {
    fundCampaign,
    isFundingCampaign,
    createCampaign,
    isCreatingCampaign,
  } = useFarcasterPromo()

  // Memoized calculations
  const amount = useMemo(() => parseChessAmount(totalBudget), [totalBudget, parseChessAmount])
  
  const balanceInfo = useMemo(() => {
    const balanceInChess = balance ? Number(balance) / CHESS_DECIMALS : 0
    const allowanceInChess = allowance ? Number(allowance) / CHESS_DECIMALS : 0
    const hasSufficientBalance = balanceInChess >= totalBudget
    
    return {
      balance: balanceInChess,
      allowance: allowanceInChess,
      hasSufficientBalance,
      formattedBalance: balanceInChess.toLocaleString(),
      formattedAllowance: allowanceInChess.toLocaleString()
    }
  }, [balance, allowance, totalBudget])

  const needsTokenApproval = useMemo(() => needsApproval(amount), [needsApproval, amount])

  // Reset error when step changes
  useEffect(() => {
    if (state.step !== "idle") {
      setState(prev => ({ ...prev, error: null }))
    }
  }, [state.step])

  // Error handler
  const handleError = useCallback((error: unknown, context: string) => {
    const message = error instanceof Error ? error.message : `${context} failed`
    console.error(`${context} error:`, error)
    setState(prev => ({
      ...prev,
      error: message,
      step: "idle"
    }))
  }, [])

  // Success handler
  const handleSuccess = useCallback(() => {
    setState(prev => ({
      ...prev,
      success: true,
      step: "done"
    }))
    onSuccess?.()
  }, [onSuccess])

  // Approval handler
  const handleApprove = useCallback(async () => {
    setState(prev => ({ ...prev, step: "approving", error: null }))
    
    try {
      await approveFarcasterPromo(amount)
      // Note: Success will be handled by the hook's success state
    } catch (error) {
      handleError(error, "Token approval")
    }
  }, [approveFarcasterPromo, amount, handleError])

  // Campaign creation handler
  const handleCreateCampaign = useCallback(async () => {
    setState(prev => ({ ...prev, step: "creating", error: null }))
    
    try {
      await createCampaign({
        castUrl,
        shareText,
        rewardPerShare: parseChessAmount(rewardPerShare),
        totalBudget: amount,
        divisible: true
      })

      // Update promotion status in backend
      const response = await fetch(API_ENDPOINTS.PROMOTION(promotionId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" })
      })

      if (!response.ok) {
        throw new Error(`Failed to update promotion status: ${response.statusText}`)
      }

      handleSuccess()
    } catch (error) {
      handleError(error, "Campaign creation")
    }
  }, [createCampaign, castUrl, shareText, rewardPerShare, amount, promotionId, parseChessAmount, handleSuccess, handleError])

  // Campaign funding handler
  const handleFundCampaign = useCallback(async () => {
    if (!onchainCampaignId || isNaN(Number(onchainCampaignId))) {
      setState(prev => ({
        ...prev,
        error: "Invalid campaign ID for funding"
      }))
      return
    }

    setState(prev => ({ ...prev, step: "funding", error: null }))
    
    try {
      await fundCampaign(BigInt(onchainCampaignId), amount)
      handleSuccess()
    } catch (error) {
      handleError(error, "Campaign funding")
    }
  }, [onchainCampaignId, fundCampaign, amount, handleSuccess, handleError])

  // Main funding handler
  const handleFund = useCallback(async () => {
    if (status === "inactive") {
      await handleCreateCampaign()
    } else if (status === "active") {
      if (!onchainCampaignId) {
        setState(prev => ({
          ...prev,
          error: "This promotion is active but has no onchain campaign ID. Please contact support."
        }))
        return
      }
      await handleFundCampaign()
    } else {
      setState(prev => ({
        ...prev,
        error: `This promotion cannot be funded. Status: ${status}`
      }))
    }
  }, [status, handleCreateCampaign, handleFundCampaign, onchainCampaignId])

  // Button states
  const buttonStates = useMemo(() => {
    const isProcessing = state.step !== "idle" && state.step !== "done"
    const isApprovalStep = isApproving || state.step === "approving"
    const isFundingStep = (status === "inactive" && (isCreatingCampaign || state.step === "creating")) ||
                         (status === "active" && (isFundingCampaign || state.step === "funding"))

    return {
      isProcessing,
      isApprovalStep,
      isFundingStep,
      approveDisabled: isApprovalStep,
      fundDisabled: isFundingStep || !balanceInfo.hasSufficientBalance
    }
  }, [state.step, isApproving, isCreatingCampaign, isFundingCampaign, status, balanceInfo.hasSufficientBalance])

  return {
    state,
    balanceInfo,
    needsTokenApproval,
    buttonStates,
    handlers: {
      handleApprove,
      handleFund
    }
  }
}

// Main component
export default function FundingForm(props: FundingFormProps) {
  const { address, isConnected } = useAccount()
  const {
    state,
    balanceInfo,
    needsTokenApproval,
    buttonStates,
    handlers
  } = useFundingLogic(props)

  // Early return if wallet not connected
  if (!isConnected || !address) {
    return (
      <div className="p-6 max-w-md mx-auto bg-gray-900 rounded-xl">
        <h2 className="text-xl font-bold mb-4 text-white">Activate Promotion (Step 2)</h2>
        <div className="text-center text-gray-400">
          Please connect your wallet to continue
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-gray-900 rounded-xl">
      <h2 className="text-xl font-bold mb-4 text-white">
        Activate Promotion (Step 2)
      </h2>
      
      {/* Balance Information */}
      <div className="mb-4 text-sm text-gray-300 space-y-1">
        <div>
          Required funding: <span className="font-semibold text-white">{props.totalBudget.toLocaleString()} CHESS</span>
        </div>
        <div>
          Balance: <span className="font-semibold">{balanceInfo.formattedBalance}</span> CHESS
        </div>
        <div>
          Allowance: <span className="font-semibold">{balanceInfo.formattedAllowance}</span> CHESS
        </div>
        <div className={`font-semibold ${balanceInfo.hasSufficientBalance ? 'text-green-400' : 'text-red-400'}`}>
          {balanceInfo.hasSufficientBalance ? '✓ Sufficient balance' : '✗ Insufficient balance'}
        </div>
      </div>

      {/* Error Message */}
      {state.error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">
          {state.error}
        </div>
      )}

      {/* Success Message */}
      {state.success && (
        <div className="mb-4 p-3 bg-green-900/50 border border-green-500 rounded text-green-200 text-sm">
          ✅ Promotion successfully activated and is now public!
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {needsTokenApproval ? (
          <button
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200"
            onClick={handlers.handleApprove}
            disabled={buttonStates.approveDisabled}
          >
            {buttonStates.isApprovalStep ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Approving...
              </span>
            ) : (
              "Approve CHESS Tokens"
            )}
          </button>
        ) : (
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200"
            onClick={handlers.handleFund}
            disabled={buttonStates.fundDisabled}
          >
            {buttonStates.isFundingStep ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {props.status === "inactive" ? "Creating Campaign..." : "Funding Campaign..."}
              </span>
            ) : (
              props.status === "inactive" ? "Activate Campaign (Create Onchain)" : "Fund Campaign (Onchain)"
            )}
          </button>
        )}
      </div>

      {/* Information Note */}
      <div className="mt-4 p-3 bg-gray-800 rounded-lg">
        <div className="text-xs text-gray-400">
          <span className="font-semibold text-gray-300">Note:</span> Activation requires an onchain transaction. 
          The promotion will only become public after successful funding.
        </div>
      </div>
    </div>
  )
}
