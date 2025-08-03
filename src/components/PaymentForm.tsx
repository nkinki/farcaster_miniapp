"use client"

import { useState, useEffect } from "react"
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { parseUnits, erc20Abi } from "viem"
import { CONTRACTS } from "@/config/contracts"
import FARCASTER_PROMO_ABI from "@/abis/FarcasterPromo.json"

const CHESS_TOKEN_ADDRESS = CONTRACTS.CHESS_TOKEN as `0x${string}`
const FARCASTER_PROMO_CONTRACT = CONTRACTS.FarcasterPromo as `0x${string}`

export default function PaymentForm({ onSuccess }: { onSuccess?: () => void }) {
  const [rewardPerShare, setRewardPerShare] = useState(1000)
  const [totalBudget, setTotalBudget] = useState(10000)
  const [castUrl, setCastUrl] = useState("")
  const [shareText, setShareText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [autoStep, setAutoStep] = useState<"idle"|"approving"|"creating"|"saving"|"done">("idle")

  const { address, isConnected } = useAccount()

  // 1. Lekérdezzük a balance-t és az allowance-t
  const { data: balance } = useReadContract({
    address: CHESS_TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  })

  const { data: allowance } = useReadContract({
    address: CHESS_TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, FARCASTER_PROMO_CONTRACT] : undefined,
    query: { enabled: !!address }
  })

  // 2. Approve
  const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract()
  const { isSuccess: isApproveSuccess, isLoading: isApproveLoading } = useWaitForTransactionReceipt({ hash: approveHash })

  // 3. createCampaign
  const { writeContract: createCampaign, data: createHash, isPending: isCreating } = useWriteContract()
  const { isSuccess: isCreateSuccess, isLoading: isCreateLoading } = useWaitForTransactionReceipt({ hash: createHash })

  // Helper: parse CHESS mennyiség
  const parseChessAmount = (amount: number) => parseUnits(amount.toString(), 18)

  // Helper: elég-e az allowance?
  const needsApproval = () => {
    if (!allowance) return true
    return BigInt(allowance) < parseChessAmount(totalBudget)
  }

  // Automatikus approve, ha kell
  useEffect(() => {
    if (
      isConnected &&
      address &&
      castUrl &&
      rewardPerShare > 0 &&
      totalBudget > 0 &&
      !isApproving &&
      !isApproveLoading &&
      needsApproval() &&
      autoStep === "idle"
    ) {
      setError(null)
      setAutoStep("approving")
      approve({
        address: CHESS_TOKEN_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [FARCASTER_PROMO_CONTRACT, parseChessAmount(totalBudget)]
      })
    }
  }, [isConnected, address, castUrl, rewardPerShare, totalBudget, isApproving, isApproveLoading, allowance, autoStep, approve])

  // Automatikus createCampaign, ha van elég allowance
  useEffect(() => {
    if (
      isConnected &&
      address &&
      castUrl &&
      rewardPerShare > 0 &&
      totalBudget > 0 &&
      !needsApproval() &&
      !isCreating &&
      !isCreateLoading &&
      autoStep !== "creating" &&
      !isCreateSuccess
    ) {
      setError(null)
      setAutoStep("creating")
      createCampaign({
        address: FARCASTER_PROMO_CONTRACT,
        abi: FARCASTER_PROMO_ABI,
        functionName: "createCampaign",
        args: [
          castUrl,
          shareText,
          parseChessAmount(rewardPerShare),
          parseChessAmount(totalBudget),
          true // divisible
        ]
      })
    }
  }, [isConnected, address, castUrl, rewardPerShare, totalBudget, allowance, isCreating, isCreateLoading, autoStep, createCampaign, isCreateSuccess, shareText])

  // Sikeres createCampaign után mentés Neon DB-be
  useEffect(() => {
    if (isCreateSuccess && createHash && !isSaving && autoStep !== "done") {
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
          blockchain_hash: createHash,
          status: "active"
        })
      })
        .then(res => res.json())
        .then(() => {
          setIsSaving(false)
          setTxHash(createHash)
          setAutoStep("done")
          if (onSuccess) onSuccess()
        })
        .catch(e => {
          setError("Neon DB mentési hiba: " + e.message)
          setIsSaving(false)
        })
    }
  }, [isCreateSuccess, createHash, isSaving, castUrl, shareText, rewardPerShare, totalBudget, onSuccess, autoStep])

  // Hibakezelés: ha nincs elég balance
  useEffect(() => {
    if (balance && parseChessAmount(totalBudget) > BigInt(balance)) {
      setError("Nincs elég CHESS token a walletben!")
    }
  }, [balance, totalBudget])

  return (
    <div className="p-6 max-w-md mx-auto bg-gray-900 rounded-xl">
      <h2 className="text-xl font-bold mb-4 text-white">Új promóció létrehozása</h2>

      {/* DEBUG PANEL */}
      <div className="mb-4 p-3 bg-gray-800 rounded-lg text-xs text-yellow-200">
        <div><b>isConnected:</b> {isConnected ? 'true' : 'false'}</div>
        <div><b>address:</b> {address || 'nincs'}</div>
        <div><b>balance:</b> {balance ? balance.toString() : 'nincs'}</div>
        <div><b>allowance:</b> {allowance ? allowance.toString() : 'nincs'}</div>
        <div><b>rewardPerShare:</b> {rewardPerShare}</div>
        <div><b>totalBudget:</b> {totalBudget}</div>
        <div><b>needsApproval:</b> {needsApproval() ? 'true' : 'false'}</div>
        <div><b>autoStep:</b> {autoStep}</div>
        <div><b>isApproving:</b> {isApproving ? 'true' : 'false'}</div>
        <div><b>isApproveLoading:</b> {isApproveLoading ? 'true' : 'false'}</div>
        <div><b>isApproveSuccess:</b> {isApproveSuccess ? 'true' : 'false'}</div>
        <div><b>isCreating:</b> {isCreating ? 'true' : 'false'}</div>
        <div><b>isCreateLoading:</b> {isCreateLoading ? 'true' : 'false'}</div>
        <div><b>isCreateSuccess:</b> {isCreateSuccess ? 'true' : 'false'}</div>
        <div><b>isSaving:</b> {isSaving ? 'true' : 'false'}</div>
        <div><b>error:</b> {error || 'nincs'}</div>
      </div>

      <input
        className="mb-2 w-full p-2 rounded"
        placeholder="Cast URL"
        value={castUrl}
        onChange={e => { setCastUrl(e.target.value); setAutoStep("idle"); }}
      />
      <input
        className="mb-2 w-full p-2 rounded"
        placeholder="Megosztási szöveg"
        value={shareText}
        onChange={e => { setShareText(e.target.value); setAutoStep("idle"); }}
      />
      <input
        className="mb-2 w-full p-2 rounded"
        type="number"
        placeholder="Jutalom megosztásonként (CHESS)"
        value={rewardPerShare}
        onChange={e => { setRewardPerShare(Number(e.target.value)); setAutoStep("idle"); }}
      />
      <input
        className="mb-2 w-full p-2 rounded"
        type="number"
        placeholder="Teljes költségvetés (CHESS)"
        value={totalBudget}
        onChange={e => { setTotalBudget(Number(e.target.value)); setAutoStep("idle"); }}
      />

      <div className="mb-2 text-sm text-gray-300">
        Egyenleg: {balance ? (Number(balance) / 1e18).toLocaleString() : "–"} CHESS<br />
        Engedélyezett: {allowance ? (Number(allowance) / 1e18).toLocaleString() : "–"} CHESS
      </div>

      {error && <div className="mb-2 text-red-400">{error}</div>}

      {autoStep === "approving" && <div className="text-yellow-300 mb-2">Jóváhagyás folyamatban...</div>}
      {autoStep === "creating" && <div className="text-yellow-300 mb-2">Kampány létrehozása folyamatban...</div>}
      {isSaving && <div className="text-yellow-300 mb-2">Mentés Neon DB-be...</div>}
      {txHash && <div className="text-green-400 mb-2">Siker! Tranzakció hash: {txHash}</div>}
      {autoStep === "done" && <div className="text-green-400 mb-2">Promóció sikeresen létrehozva!</div>}
    </div>
  )
}
