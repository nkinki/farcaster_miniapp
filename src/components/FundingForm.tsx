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
}