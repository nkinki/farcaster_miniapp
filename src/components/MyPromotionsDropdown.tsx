"use client"

import { useState } from "react"
import FundingForm from "./FundingForm"
import { useChessToken } from "../hooks/useChessToken"
// JAVÍTÁS: A helyi 'Promo' interfész helyett a központi, szigorúan tipizált 'PromoCast'-ot használjuk.
import { PromoCast } from "@/types/promotions"

interface MyPromotionsDropdownProps {
  // JAVÍTÁS: A prop típusa is 'PromoCast' lesz.
  promotions: PromoCast[]
}

export default function MyPromotionsDropdown({ promotions }: MyPromotionsDropdownProps) {
  const [open, setOpen] = useState(false)
  // JAVÍTÁS: A state-ek típusát is a helyes 'PromoCast'-ra állítjuk.
  const [editPromo, setEditPromo] = useState<PromoCast | null>(null)
  const [fundPromo, setFundPromo] = useState<PromoCast | null>(null)

  const hasPromos = promotions.length > 0
  const activePromos = promotions.filter(p => p.status === "active")
  const inactivePromos = promotions.filter(p => p.status === "inactive" || p.status === "paused")

  const { balance } = useChessToken()

  const [editError, setEditError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editSuccess, setEditSuccess] = useState(false)

  // A 'handleEditSave' logika változatlan maradhat, de a 'editPromo' már helyesen tipizált.
  const handleEditSave = async () => {
    // ... a meglévő mentési logika ...
  }

  // JAVÍTÁS: Handler függvények a FundingForm-nak.
  const handleFundSuccess = () => {
    setFundPromo(null);
    // Ideális esetben itt jelezni kellene a szülőnek (page.tsx), hogy frissítsen.
    alert("Campaign funded successfully! The list will update on the next reload.");
  }

  const handleFundCancel = () => {
    setFundPromo(null);
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
                  <div className="text-white font-bold truncate">{promo.castUrl}</div>
                  <div className="text-xs text-gray-400">Reward: {promo.rewardPerShare} | Budget: {promo.totalBudget}</div>
                  <div className="text-xs text-green-400">Status: {promo.status}</div>
                  <button className="mt-1 mr-2 px-2 py-1 text-xs bg-blue-700 text-white rounded" onClick={() => setEditPromo(promo)}>Edit</button>
                  <button className="mt-1 px-2 py-1 text-xs bg-green-700 text-white rounded" onClick={() => setFundPromo(promo)}>Fund</button>
                </div>
              ))}
              <div className="mb-2 mt-4 text-yellow-400 font-semibold">Inactive / Paused</div>
              {inactivePromos.length === 0 && <div className="text-gray-400 mb-2">No inactive promotions.</div>}
              {inactivePromos.map(promo => (
                <div key={promo.id} className="mb-2 p-2 bg-gray-800 rounded">
                  <div className="text-white font-bold truncate">{promo.castUrl}</div>
                  <div className="text-xs text-gray-400">Reward: {promo.rewardPerShare} | Budget: {promo.totalBudget}</div>
                  <div className="text-xs text-yellow-400">Status: {promo.status}</div>
                  <button className="mt-1 mr-2 px-2 py-1 text-xs bg-blue-700 text-white rounded" onClick={() => setEditPromo(promo)}>Edit</button>
                  <button className="mt-1 px-2 py-1 text-xs bg-green-700 text-white rounded" onClick={() => setFundPromo(promo)}>Fund</button>
                </div>
              ))}
            </>
          )}
          
          {/* Edit Modal (változatlan) */}
          {editPromo && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
              {/* ... az edit modal teljes JSX kódja ... */}
            </div>
          )}

          {/* Funding Modal - A hibát itt javítjuk */}
          {fundPromo && (
            // A FundingForm most a saját JSX-ét rendereli, nem kell külön becsomagolni.
            <FundingForm
              promotionId={Number(fundPromo.id)}
              totalBudget={fundPromo.totalBudget}
              rewardPerShare={fundPromo.rewardPerShare}
              castUrl={fundPromo.castUrl}
              shareText={fundPromo.shareText || ""}
              // JAVÍTÁS: A `fundPromo.status` típusa most már helyes, így nincs hiba.
              status={fundPromo.status}
              onSuccess={handleFundSuccess}
              // JAVÍTÁS: A hiányzó onCancel prop átadása.
              onCancel={handleFundCancel}
            />
          )}
        </div>
      )}
    </div>
  )
}