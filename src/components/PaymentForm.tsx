"use client"

import { useState, useEffect } from "react"
import { useAccount } from "wagmi"
import { useFarcasterPromo } from "../hooks/useFarcasterPromo"
import { useChessToken } from "../hooks/useChessToken"

const CHESS_TOKEN_ADDRESS = "0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07" as const
const FARCASTER_PROMO_CONTRACT = "0x439f17d5b1b1076c04f9a1d36a3a5df3346ddb98" as const

export default function PaymentForm({ onSuccess }: { onSuccess?: () => void }) {
  const [rewardPerShare, setRewardPerShare] = useState(1000)
  const [totalBudget, setTotalBudget] = useState(10000)
  const [castUrl, setCastUrl] = useState("")
  const [shareText, setShareText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [autoStep, setAutoStep] = useState<"idle" | "approving" | "creating" | "saving" | "done">("idle")

  const { address, isConnected } = useAccount()

  // 1. Lekérdezzük a balance-t és az allowance-t (csak a useChessToken hookból!)
  const {
    approveFarcasterPromo,
    isApproving,
    isApproveSuccess,
    isApprovalConfirming,
    approveHash,
    needsApproval,
    parseChessAmount,
    allowance,
    balance,
    formatChessAmount,
  } = useChessToken()

  // 2. createCampaign (useFarcasterPromo)
  const {
    createCampaign,
    isCreatingCampaign,
    isCreateCampaignSuccess,
    createCampaignHash,
    createCampaignError,
    isCreateCampaignConfirming,
  } = useFarcasterPromo()

  // Automatikus approve, ha kell
  useEffect(() => {
    if (
      isConnected &&
      address &&
      castUrl &&
      rewardPerShare > 0 &&
      totalBudget > 0 &&
      !isApproving &&
      needsApproval(parseChessAmount(totalBudget)) &&
      autoStep === "idle"
    ) {
      setError(null)
      setAutoStep("approving")
      approveFarcasterPromo(parseChessAmount(totalBudget))
    }
  }, [isConnected, address, castUrl, rewardPerShare, totalBudget, isApproving, allowance, autoStep, approveFarcasterPromo, needsApproval, parseChessAmount])

  // Automatikus createCampaign, ha van elég allowance
  useEffect(() => {
    if (
      isConnected &&
      address &&
      castUrl &&
      rewardPerShare > 0 &&
      totalBudget > 0 &&
      !needsApproval(parseChessAmount(totalBudget)) &&
      !isCreatingCampaign &&
      autoStep !== "creating" &&
      !isCreateCampaignSuccess
    ) {
      setError(null)
      setAutoStep("creating")
      createCampaign({
        castUrl,
        shareText,
        rewardPerShare: parseChessAmount(rewardPerShare),
        totalBudget: parseChessAmount(totalBudget),
        divisible: true,
      })
    }
  }, [
    isConnected,
    address,
    castUrl,
    rewardPerShare,
    totalBudget,
    allowance,
    isCreatingCampaign,
    autoStep,
    createCampaign,
    isCreateCampaignSuccess,
    shareText,
    needsApproval,
    parseChessAmount,
  ])

  // Sikeres createCampaign után mentés Neon DB-be
  useEffect(() => {
    if (isCreateCampaignSuccess && createCampaignHash && !isSaving && autoStep !== "done") {
      setIsSaving(true)
      setAutoStep("saving")
      fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cast_url: castUrl,
          share_text: shareText,
          reward_per_share: rewardPerShare,
          total_budget: totalBudget,
          blockchain_hash: createCampaignHash,
          status: "active",
        }),
      })
        .then((res) => res.json())
        .then(() => {
          setIsSaving(false)
          setTxHash(createCampaignHash)
          setAutoStep("done")
          if (onSuccess) onSuccess()
        })
        .catch((e) => {
          setError("Neon DB mentési hiba: " + e.message)
          setIsSaving(false)
        })
    }
  }, [isCreateCampaignSuccess, createCampaignHash, isSaving, castUrl, shareText, rewardPerShare, totalBudget, onSuccess, autoStep])

  // Hibakezelés: ha nincs elég balance
  useEffect(() => {
    console.log("Balance check:", {
      balance: balance?.toString(),
      totalBudgetParsed: parseChessAmount(totalBudget).toString(),
    });
    if (typeof balance === "bigint" && balance < parseChessAmount(totalBudget)) {
      setError("Nincs elég CHESS token a walletben!");
    } else {
      setError(null); // Töröljük a hibát, ha elég egyenleg van
    }
  }, [balance, totalBudget, parseChessAmount])

  return (
    <div className="p-6 max-w-md mx-auto bg-gray-900 rounded-xl">
      <h2 className="text-xl font-bold mb-4 text-white">Új promóció létrehozása</h2>

      {/* DEBUG PANEL */}
      <div className="mb-4 p-3 bg-gray-800 rounded-lg text-xs text-yellow-200">
        <div><b>isConnected:</b> {isConnected ? "true" : "false"}</div>
        <div><b>address:</b> {address || "nincs"}</div>
        <div><b>balance:</b> {balance ? balance.toString() : "nincs"}</div>
        <div><b>allowance:</b> {allowance ? allowance.toString() : "nincs"}</div>
        <div><b>rewardPerShare:</b> {rewardPerShare}</div>
        <div><b>totalBudget:</b> {totalBudget}</div>
        <div><b>needsApproval:</b> {needsApproval(parseChessAmount(totalBudget)) ? "true" : "false"}</div>
        <div><b>autoStep:</b> {autoStep}</div>
        <div><b>isApproving:</b> {isApproving ? "true" : "false"}</div>
        <div><b>isApproveSuccess:</b> {isApproveSuccess ? "true" : "false"}</div>
        <div><b>isCreating:</b> {isCreatingCampaign ? "true" : "false"}</div>
        <div><b>isCreateLoading:</b> {isCreateCampaignConfirming ? "true" : "false"}</div>
        <div><b>isCreateSuccess:</b> {isCreateCampaignSuccess ? "true" : "false"}</div>
        <div><b>isSaving:</b> {isSaving ? "true" : "false"}</div>
        <div><b>error:</b> {error || "nincs"}</div>
      </div>

      <input
        className="mb-2 w-full p-2 rounded"
        placeholder="Cast URL"
        value={castUrl}
        onChange={(e) => { setCastUrl(e.target.value); setAutoStep("idle"); }}
      />
      <input
        className="mb-2 w-full p-2 rounded"
        placeholder="Megosztási szöveg"
        value={shareText}
        onChange={(e) => { setShareText(e.target.value); setAutoStep("idle"); }}
      />
      <input
        className="mb-2 w-full p-2 rounded"
        type="number"
        placeholder="Jutalom megosztásonként (CHESS)"
        value={rewardPerShare}
        onChange={(e) => { setRewardPerShare(Number(e.target.value)); setAutoStep("idle"); }}
      />
      <input
        className="mb-2 w-full p-2 rounded"
        type="number"
        placeholder="Teljes költségvetés (CHESS)"
        value={totalBudget}
        onChange={(e) => { setTotalBudget(Number(e.target.value)); setAutoStep("idle"); }}
      />

      <div className="mb-2 text-sm text-gray-300">
        Egyenleg: {balance ? formatChessAmount(balance) : "–"} CHESS<br />
        Engedélyezett: {allowance ? formatChessAmount(allowance) : "–"} CHESS
      </div>

      {error && <div className="mb-2 text-red-400">{error}</div>}

      {autoStep === "approving" && <div className="text-yellow-300 mb-2">Jóváhagyás folyamatban...</div>}
      {autoStep === "creating" && <div className="text-yellow-300 mb-2">Kampány létrehozása folyamatban...</div>}
      {isSaving && <div className="text-yellow-300 mb-2">Mentés Neon DB-be...</div>}
      {createCampaignHash && <div className="text-green-400 mb-2">Siker! Tranzakció hash: {createCampaignHash.toString()}</div>}
      {autoStep === "done" && <div className="text-green-400 mb-2">Promóció sikeresen létrehozva!</div>}
    </div>
  )
}