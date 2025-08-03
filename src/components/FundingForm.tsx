"use client"

import { useState } from "react"
import { useAccount } from "wagmi"
import { useChessToken } from "../hooks/useChessToken"
import { useFarcasterPromo } from "../hooks/useFarcasterPromo"

interface FundingFormProps {
  promotionId: number
  totalBudget: number
  rewardPerShare: number
  castUrl: string
  shareText: string
  status: string // "inactive" | "active"
  onchainCampaignId?: number
  onSuccess?: () => void
}

export default function FundingForm({ promotionId, totalBudget, rewardPerShare, castUrl, shareText, status, onchainCampaignId, onSuccess }: FundingFormProps) {
  const { address, isConnected } = useAccount()
  const {
    approveFarcasterPromo,
    isApproving,
    isApproveSuccess,
    needsApproval,
    parseChessAmount,
    balance,
    allowance,
  } = useChessToken()
  const {
    fundCampaign,
    isFundingCampaign,
    isFundCampaignSuccess,
    fundCampaignHash,
    fundCampaignError,
    isFundCampaignConfirming,
    createCampaign,
    isCreatingCampaign,
    isCreateCampaignSuccess,
    createCampaignHash,
    createCampaignError,
    isCreateCampaignConfirming
  } = useFarcasterPromo()

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [autoStep, setAutoStep] = useState<"idle"|"approving"|"funding"|"creating"|"done">("idle")

  // Funding amount
  const amount = parseChessAmount(totalBudget)

  // Approve
  const handleApprove = async () => {
    setError(null)
    setAutoStep("approving")
    try {
      await approveFarcasterPromo(amount)
    } catch (e: any) {
      setError(e.message || "Approve failed")
      setAutoStep("idle")
    }
  }

  // Funding (createCampaign or fundCampaign)
  const handleFund = async () => {
    setError(null)
    if (status === "inactive") {
      setAutoStep("creating")
      try {
        // Onchain createCampaign
        const tx = await createCampaign({
          castUrl,
          shareText,
          rewardPerShare: parseChessAmount(rewardPerShare),
          totalBudget: amount,
          divisible: true
        })
        // TODO: campaignId-t backend event listenerből kell elmenteni!
        await fetch(`/api/promotions/${promotionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "active" })
        })
        setSuccess(true)
        setAutoStep("done")
        if (onSuccess) onSuccess()
      } catch (e: any) {
        setError(e.message || "Funding failed (createCampaign)")
        setAutoStep("idle")
      }
    } else if (status === "active" && onchainCampaignId && !isNaN(Number(onchainCampaignId))) {
      setAutoStep("funding")
      try {
        await fundCampaign(BigInt(onchainCampaignId), amount)
        setSuccess(true)
        setAutoStep("done")
        if (onSuccess) onSuccess()
      } catch (e: any) {
        setError(e.message || "Funding failed (fundCampaign)")
        setAutoStep("idle")
      }
    } else if (status === "active" && !onchainCampaignId) {
      setError("This promotion is active but has no onchain campaignId. Please contact support.")
    } else {
      setError(`This promotion cannot be funded. (Status: ${status})`)
    }
  }

  const hasSufficientBalance = balance && Number(balance) / 1e18 >= totalBudget

  return (
    <div className="p-6 max-w-md mx-auto bg-gray-900 rounded-xl">
      <h2 className="text-xl font-bold mb-4 text-white">Activate Promotion (Step 2)</h2>
      <div className="mb-2 text-sm text-gray-300">
        Required funding: <b>{totalBudget.toLocaleString()} CHESS</b><br />
        Balance: {balance ? (Number(balance) / 1e18).toLocaleString() : "–"} CHESS<br />
        Allowance: {allowance ? (Number(allowance) / 1e18).toLocaleString() : "–"} CHESS<br />
        {hasSufficientBalance ? (
          <span className="text-green-400">Sufficient balance</span>
        ) : (
          <span className="text-red-400">Insufficient balance</span>
        )}
      </div>
      {error && <div className="mb-2 text-red-400">{error}</div>}
      {success && <div className="mb-2 text-green-400">Promotion successfully activated and now public!</div>}
      {needsApproval(amount) ? (
        <button
          className="w-full bg-green-600 text-white py-2 rounded mb-2 disabled:opacity-50"
          onClick={handleApprove}
          disabled={isApproving || autoStep === "approving"}
        >
          {isApproving || autoStep === "approving" ? "Approving..." : "Approve CHESS"}
        </button>
      ) : (
        <button
          className="w-full bg-blue-600 text-white py-2 rounded mb-2 disabled:opacity-50"
          onClick={handleFund}
          disabled={
            (status === "inactive" && (isCreatingCampaign || autoStep === "creating")) ||
            (status === "active" && (isFundingCampaign || autoStep === "funding")) ||
            !hasSufficientBalance
          }
        >
          {(status === "inactive" && (isCreatingCampaign || autoStep === "creating")) ? "Creating..."
            : (status === "active" && (isFundingCampaign || autoStep === "funding")) ? "Funding..."
            : status === "inactive" ? "Activate (onchain create)"
            : "Fund Campaign (onchain)"}
        </button>
      )}
      <div className="mt-4 text-xs text-gray-400">
        <b>Note:</b> Activation is an onchain transaction. The promotion will be public only after successful funding!
      </div>
    </div>
  )
}mpleted and cannot be funded."
      }))
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
    const cannotFund = status === "paused" || status === "completed"

    return {
      isProcessing,
      isApprovalStep,
      isFundingStep,
      approveDisabled: isApprovalStep || cannotFund,
      fundDisabled: isFundingStep || !balanceInfo.hasSufficientBalance || cannotFund
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
