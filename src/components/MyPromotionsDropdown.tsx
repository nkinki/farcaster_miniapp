"use client"

import { useState } from "react"
import FundingForm from "./FundingForm"
import { useChessToken } from "../hooks/useChessToken"

interface Promo {
  id: string | number
  castUrl: string
  rewardPerShare: number
  totalBudget: number
  status: string
  shareText?: string
  createdAt?: string
}

interface MyPromotionsDropdownProps {
  promotions: Promo[]
}

export default function MyPromotionsDropdown({ promotions }: MyPromotionsDropdownProps) {
  const [open, setOpen] = useState(false)
  const [editPromo, setEditPromo] = useState<Promo | null>(null)
  const [fundPromo, setFundPromo] = useState<Promo | null>(null)
  const hasPromos = promotions.length > 0
  const activePromos = promotions.filter(p => p.status === "active")
  const inactivePromos = promotions.filter(p => p.status !== "active")

  // CHESS balance fedezet ellenőrzéshez
  const { balance } = useChessToken()

  // Edit mentése
  const [editError, setEditError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editSuccess, setEditSuccess] = useState(false)

  const handleEditSave = async () => {
    setEditError(null)
    setEditSaving(true)
    setEditSuccess(false)
    if (!editPromo) return
    if (editPromo.rewardPerShare <= 0 || editPromo.totalBudget <= 0) {
      setEditError("Reward and budget must be greater than 0.")
      setEditSaving(false)
      return
    }
    if (editPromo.rewardPerShare > editPromo.totalBudget) {
      setEditError("Reward per share cannot be greater than total budget.")
      setEditSaving(false)
      return
    }
    try {
      const res = await fetch(`/api/promotions/${editPromo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rewardPerShare: editPromo.rewardPerShare,
          totalBudget: editPromo.totalBudget,
        })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Edit failed")
      }
      setEditSuccess(true)
      setEditSaving(false)
      setTimeout(() => setEditPromo(null), 1200)
    } catch (e: any) {
      setEditError(e.message || "Edit failed")
      setEditSaving(false)
    }
  }

  return (
    <div className="mb-6">
      <button
        className="w-full flex justify-between items-center px-4 py-3 bg-[#23283a] border border-[#a64d79] rounded-t-xl text-white font-semibold text-lg focus:outline-none"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        My Promotions
        <span className="ml-2">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="bg-[#23283a] border-x border-b border-[#a64d79] rounded-b-xl p-4">
          {!hasPromos && <div className="text-gray-400">No promotions yet.</div>}
          {hasPromos && (
            <>
              <div className="mb-2 text-green-400 font-semibold">Active</div>
              {activePromos.length === 0 && <div className="text-gray-400 mb-2">No active promotions.</div>}
              {activePromos.map(promo => (
                <div key={promo.id} className="mb-2 p-2 bg-gray-800 rounded">
                  <div className="text-white font-bold">{promo.castUrl}</div>
                  <div className="text-xs text-gray-400">Reward: {promo.rewardPerShare} | Budget: {promo.totalBudget}</div>
                  <div className="text-xs text-green-400">Status: {promo.status}</div>
                  <button className="mt-1 mr-2 px-2 py-1 text-xs bg-blue-700 text-white rounded" onClick={() => setEditPromo(promo)}>Edit</button>
                </div>
              ))}
              <div className="mb-2 mt-4 text-yellow-400 font-semibold">Inactive</div>
              {inactivePromos.length === 0 && <div className="text-gray-400 mb-2">No inactive promotions.</div>}
              {inactivePromos.map(promo => (
                <div key={promo.id} className="mb-2 p-2 bg-gray-800 rounded">
                  <div className="text-white font-bold">{promo.castUrl}</div>
                  <div className="text-xs text-gray-400">Reward: {promo.rewardPerShare} | Budget: {promo.totalBudget}</div>
                  <div className="text-xs text-yellow-400">Status: {promo.status}</div>
                  <button className="mt-1 mr-2 px-2 py-1 text-xs bg-blue-700 text-white rounded" onClick={() => setEditPromo(promo)}>Edit</button>
                  <button className="mt-1 px-2 py-1 text-xs bg-green-700 text-white rounded" onClick={() => setFundPromo(promo)}>Add CHESS</button>
                </div>
              ))}
            </>
          )}
          {/* Edit Modal */}
          {editPromo && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
              <div className="bg-[#23283a] p-6 rounded-xl border border-[#a64d79] max-w-md w-full">
                <h3 className="text-lg font-bold text-white mb-4">Edit Promotion</h3>
                <div className="mb-2 text-white">Cast URL: {editPromo.castUrl}</div>
                <div className="mb-2">
                  <label className="block text-sm text-gray-300 mb-1">Reward per Share</label>
                  <div className="grid grid-cols-5 gap-2 mb-2">
                    {[1000, 2000, 5000, 10000, 20000].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setEditPromo({ ...editPromo, rewardPerShare: amount })}
                        className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                          editPromo.rewardPerShare === amount
                            ? "bg-green-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        {amount / 1000}K
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-2">
                  <label className="block text-sm text-gray-300 mb-1">Total Budget</label>
                  <div className="grid grid-cols-5 gap-2 mb-2">
                    {[10000, 100000, 500000, 1000000, 5000000].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setEditPromo({ ...editPromo, totalBudget: amount })}
                        className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                          editPromo.totalBudget === amount
                            ? "bg-blue-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        {amount >= 1000000 ? `${amount / 1000000}M` : `${amount / 1000}K`}
                      </button>
                    ))}
                  </div>
                </div>
                {editPromo.status !== "active" ? (
                  <div className="mb-2 text-xs text-gray-300">
                    Balance: {balance ? (Number(balance) / 1e18).toLocaleString() : "–"} CHESS<br />
                    Needed: {editPromo.totalBudget.toLocaleString()} CHESS<br />
                    {balance && Number(balance) / 1e18 >= editPromo.totalBudget ? (
                      <span className="text-green-400">Sufficient balance</span>
                    ) : (
                      <span className="text-red-400">Insufficient balance</span>
                    )}
                  </div>
                ) : (
                  <div className="mb-2 text-xs text-green-400">Promotion is already funded and active.</div>
                )}
                {editError && <div className="mb-2 text-red-400">{editError}</div>}
                {editSuccess && <div className="mb-2 text-green-400">Promotion updated!</div>}
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 bg-blue-600 text-white py-2 rounded" onClick={handleEditSave} disabled={editSaving}>
                    {editSaving ? "Saving..." : "Save"}
                  </button>
                  <button className="flex-1 bg-gray-600 text-white py-2 rounded" onClick={() => setEditPromo(null)}>Close</button>
                </div>
              </div>
            </div>
          )}
          {/* Funding Modal */}
          {fundPromo && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
              <div className="bg-[#23283a] p-6 rounded-xl border border-[#a64d79] max-w-md w-full">
                <FundingForm
                  promotionId={Number(fundPromo.id)}
                  totalBudget={fundPromo.totalBudget}
                  rewardPerShare={fundPromo.rewardPerShare}
                  castUrl={fundPromo.castUrl}
                  shareText={fundPromo.shareText || ""}
                  status={fundPromo.status}
                  onSuccess={() => setFundPromo(null)}
                />
                <button className="mt-4 w-full bg-blue-600 text-white py-2 rounded" onClick={() => setFundPromo(null)}>Close</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
