"use client"

import { useState } from "react"
import { useAccount } from "wagmi"
import { useChessToken } from "../hooks/useChessToken"
import { useFarcasterPromo } from "../hooks/useFarcasterPromo"

interface FundingFormProps {
  promotionId: number
  totalBudget: number
  onSuccess?: () => void
}

export default function FundingForm({ promotionId, totalBudget, onSuccess }: FundingFormProps) {
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
    isFundCampaignConfirming
  } = useFarcasterPromo()

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [autoStep, setAutoStep] = useState<"idle"|"approving"|"funding"|"done">("idle")

  // Automatikus approve, ha kell
  const amount = parseChessAmount(totalBudget)

  // Approve
  const handleApprove = async () => {
    setError(null)
    setAutoStep("approving")
    try {
      await approveFarcasterPromo(amount)
    } catch (e: any) {
      setError(e.message || "Approve hiba")
      setAutoStep("idle")
    }
  }

  // Funding
  const handleFund = async () => {
    setError(null)
    setAutoStep("funding")
    try {
      await fundCampaign(BigInt(promotionId), amount)
      setSuccess(true)
      setAutoStep("done")
      if (onSuccess) onSuccess()
    } catch (e: any) {
      setError(e.message || "Funding hiba")
      setAutoStep("idle")
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-gray-900 rounded-xl">
      <h2 className="text-xl font-bold mb-4 text-white">Promóció aktiválása (2. lépés)</h2>
      <div className="mb-2 text-sm text-gray-300">
        Szükséges funding: <b>{totalBudget.toLocaleString()} CHESS</b><br />
        Egyenleg: {balance ? (Number(balance) / 1e18).toLocaleString() : "–"} CHESS<br />
        Engedélyezett: {allowance ? (Number(allowance) / 1e18).toLocaleString() : "–"} CHESS
      </div>
      {error && <div className="mb-2 text-red-400">{error}</div>}
      {success && <div className="mb-2 text-green-400">Promóció sikeresen aktiválva!</div>}
      {needsApproval(amount) ? (
        <button
          className="w-full bg-green-600 text-white py-2 rounded mb-2 disabled:opacity-50"
          onClick={handleApprove}
          disabled={isApproving || autoStep === "approving"}
        >
          {isApproving || autoStep === "approving" ? "Jóváhagyás..." : "CHESS jóváhagyása"}
        </button>
      ) : (
        <button
          className="w-full bg-blue-600 text-white py-2 rounded mb-2 disabled:opacity-50"
          onClick={handleFund}
          disabled={isFundingCampaign || autoStep === "funding"}
        >
          {isFundingCampaign || autoStep === "funding" ? "Funding..." : "Aktiválás (onchain funding)"}
        </button>
      )}
      <div className="mt-4 text-xs text-gray-400">
        <b>Fontos:</b> Az aktiválás onchain tranzakcióval történik, a promóció csak sikeres funding után lesz publikus!
      </div>
    </div>
  )
}
