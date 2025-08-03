"use client"

import { useState } from "react"
import { useAccount } from "wagmi"

export default function PaymentForm({ onSuccess }: { onSuccess?: () => void }) {
  const [rewardPerShare, setRewardPerShare] = useState(1000)
  const [totalBudget, setTotalBudget] = useState(10000)
  const [castUrl, setCastUrl] = useState("")
  const [shareText, setShareText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const { address, isConnected } = useAccount()

  // 1. lépés: csak DB-be mentés, inaktív státusszal
  const handleSave = async () => {
    setError(null)
    setIsSaving(true)
    setSuccess(false)

    if (!castUrl.trim()) {
      setError("Cast URL megadása kötelező!")
      setIsSaving(false)
      return
    }
    if (!isConnected || !address) {
      setError("Wallet csatlakoztatása kötelező!")
      setIsSaving(false)
      return
    }
    if (rewardPerShare <= 0 || totalBudget <= 0) {
      setError("A jutalom és a költségvetés legyen nagyobb 0-nál!")
      setIsSaving(false)
      return
    }
    if (rewardPerShare > totalBudget) {
      setError("A jutalom nem lehet nagyobb, mint a költségvetés!")
      setIsSaving(false)
      return
    }

    try {
      const res = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cast_url: castUrl,
          share_text: shareText,
          reward_per_share: rewardPerShare,
          total_budget: totalBudget,
          status: "inactive",
          owner_fid: address, // vagy user.fid, ha van Farcaster context
        })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Mentési hiba")
      }
      setSuccess(true)
      setIsSaving(false)
      if (onSuccess) onSuccess()
    } catch (e: any) {
      setError(e.message || "Mentési hiba")
      setIsSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-gray-900 rounded-xl">
      <h2 className="text-xl font-bold mb-4 text-white">Új promóció létrehozása (1. lépés)</h2>
      <input
        className="mb-2 w-full p-2 rounded text-white bg-[#181c23] border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
        placeholder="Cast URL"
        value={castUrl}
        onChange={e => setCastUrl(e.target.value)}
      />
      <input
        className="mb-2 w-full p-2 rounded text-white bg-[#181c23] border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
        placeholder="Megosztási szöveg"
        value={shareText}
        onChange={e => setShareText(e.target.value)}
      />
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">Total Budget ($CHESS)</label>
        <div className="grid grid-cols-5 gap-2 mb-2">
          {[10000, 100000, 500000, 1000000, 5000000].map((amount) => (
            <button
              key={amount}
              onClick={() => setTotalBudget(amount)}
              className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                totalBudget === amount
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {amount >= 1000000 ? `${amount / 1000000}M` : `${amount / 1000}K`}
            </button>
          ))}
        </div>
        <input
          className="w-full p-2 rounded text-white bg-[#181c23] border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
          type="number"
          placeholder="Egyedi összeg (CHESS)"
          value={totalBudget}
          onChange={e => setTotalBudget(Number(e.target.value))}
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">Reward per Share ($CHESS)</label>
        <div className="grid grid-cols-5 gap-2 mb-2">
          {[1000, 2000, 5000, 10000, 20000].map((amount) => (
            <button
              key={amount}
              onClick={() => setRewardPerShare(amount)}
              className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                rewardPerShare === amount
                  ? "bg-green-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {amount / 1000}K
            </button>
          ))}
        </div>
        <input
          className="w-full p-2 rounded text-white bg-[#181c23] border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
          type="number"
          placeholder="Egyedi összeg (CHESS)"
          value={rewardPerShare}
          onChange={e => setRewardPerShare(Number(e.target.value))}
        />
      </div>
      {error && <div className="mb-2 text-red-400">{error}</div>}
      {success && <div className="mb-2 text-green-400">Promóció sikeresen mentve (inaktív)!</div>}
      <button
        className="w-full bg-blue-600 text-white py-2 rounded mb-2 disabled:opacity-50"
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? "Mentés..." : "Mentés (inaktív promóció)"}
      </button>
      <div className="mt-4 text-xs text-gray-400">
        <b>Fontos:</b> A promóció csak a saját fiókodban jelenik meg, amíg nem aktiválod fundinggal.<br />
        A funding/aktiválás után lesz publikus és aktív!
      </div>
    </div>
  )
}
