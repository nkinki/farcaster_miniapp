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
                <div key={promo.id} className="mb-4 p-3 bg-gray-800 rounded-lg">
                  {/* Promo Info Header */}
                  <div className="mb-3">
                    <div className="text-white font-bold text-sm mb-1">🎯 Promotion Details</div>
                    <div className="text-xs text-gray-400 mb-1">Reward: {promo.rewardPerShare} | Budget: {promo.totalBudget}</div>
                    <div className="text-xs text-green-400 mb-2">Status: {promo.status}</div>
                    <div className="flex gap-2">
                      <button className="px-2 py-1 text-xs bg-blue-700 text-white rounded hover:bg-blue-600" onClick={() => setEditPromo(promo)}>Edit</button>
                      <button className="px-2 py-1 text-xs bg-green-700 text-white rounded hover:bg-green-600" onClick={() => setFundPromo(promo)}>Fund</button>
                    </div>
                  </div>
                  
                  {/* Embedded Content Preview */}
                  <div className="bg-gray-900 rounded-lg p-2">
                    <div className="text-xs text-gray-400 mb-2">📱 Content Preview (what users will share):</div>
                    <div className="bg-white rounded overflow-hidden" style={{ height: '300px' }}>
                      <iframe 
                        src={promo.castUrl} 
                        className="w-full h-full border-0" 
                        title={`Preview of ${promo.castUrl}`}
                        loading="lazy"
                        sandbox="allow-scripts allow-same-origin"
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      🔗 {promo.castUrl}
                    </div>
                  </div>
                </div>
              ))}
              <div className="mb-2 mt-4 text-yellow-400 font-semibold">Inactive / Paused</div>
              {inactivePromos.length === 0 && <div className="text-gray-400 mb-2">No inactive promotions.</div>}
              {inactivePromos.map(promo => (
                <div key={promo.id} className="mb-4 p-3 bg-gray-800 rounded-lg">
                  {/* Promo Info Header */}
                  <div className="mb-3">
                    <div className="text-white font-bold text-sm mb-1">🎯 Promotion Details</div>
                    <div className="text-xs text-gray-400 mb-1">Reward: {promo.rewardPerShare} | Budget: {promo.totalBudget}</div>
                    <div className="text-xs text-yellow-400 mb-2">Status: {promo.status}</div>
                    <div className="flex gap-2">
                      <button className="px-2 py-1 text-xs bg-blue-700 text-white rounded hover:bg-blue-600" onClick={() => setEditPromo(promo)}>Edit</button>
                      <button className="px-2 py-1 text-xs bg-green-700 text-white rounded hover:bg-green-600" onClick={() => setFundPromo(promo)}>Fund</button>
                    </div>
                  </div>
                  
                  {/* Embedded Content Preview */}
                  <div className="bg-gray-900 rounded-lg p-2">
                    <div className="text-xs text-gray-400 mb-2">📱 Content Preview (what users will share):</div>
                    <div className="bg-white rounded overflow-hidden" style={{ height: '300px' }}>
                      <iframe 
                        src={promo.castUrl} 
                        className="w-full h-full border-0" 
                        title={`Preview of ${promo.castUrl}`}
                        loading="lazy"
                        sandbox="allow-scripts allow-same-origin"
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      🔗 {promo.castUrl}
                    </div>
                  </div>
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