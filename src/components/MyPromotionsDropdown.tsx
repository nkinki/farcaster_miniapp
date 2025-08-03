"use client"

import { useState } from "react"

interface Promo {
  id: string | number
  castUrl: string
  rewardPerShare: number
  totalBudget: number
  status: string
  createdAt?: string
}

interface MyPromotionsDropdownProps {
  promotions: Promo[]
}

export default function MyPromotionsDropdown({ promotions }: MyPromotionsDropdownProps) {
  const [open, setOpen] = useState(false)
  const hasPromos = promotions.length > 0
  const activePromos = promotions.filter(p => p.status === "active")
  const inactivePromos = promotions.filter(p => p.status !== "active")

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
                </div>
              ))}
              <div className="mb-2 mt-4 text-yellow-400 font-semibold">Inactive</div>
              {inactivePromos.length === 0 && <div className="text-gray-400 mb-2">No inactive promotions.</div>}
              {inactivePromos.map(promo => (
                <div key={promo.id} className="mb-2 p-2 bg-gray-800 rounded">
                  <div className="text-white font-bold">{promo.castUrl}</div>
                  <div className="text-xs text-gray-400">Reward: {promo.rewardPerShare} | Budget: {promo.totalBudget}</div>
                  <div className="text-xs text-yellow-400">Status: {promo.status}</div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
