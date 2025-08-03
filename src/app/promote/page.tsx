"use client"

import { useState, useEffect, useCallback } from "react"
import { sdk as miniAppSdk } from "@farcaster/miniapp-sdk"
import { sdk as frameSdk } from "@farcaster/frame-sdk"
import { FiArrowLeft, FiShare2, FiDollarSign, FiUsers, FiTrendingUp, FiPlus } from "react-icons/fi"
import Link from "next/link"
import UserProfile from "@/components/UserProfile"
import PaymentForm from "../../components/PaymentForm"
import MyPromotionsDropdown from "../../components/MyPromotionsDropdown"
import FundingForm from "../../components/FundingForm"
import { useAccount } from "wagmi"
import { ConnectWalletButton } from "@/components/ConnectWalletButton"
import { PromoCast, DatabasePromotion } from "@/types/promotions"

interface FarcasterUser {
  fid: number
  username?: string
  displayName?: string
  pfpUrl?: string
  pfp?: string
}

interface FarcasterContext {
  user?: FarcasterUser
  client?: {
    platformType?: "web" | "mobile"
    safeAreaInsets?: {
      top: number
      bottom: number
      left: number
      right: number
    }
    added?: boolean
  }
  location?: {
    type: string
    cast?: {
      hash: string
      text: string
      embeds?: string[]
    }
  }
}

const convertDbToPromoCast = (dbPromo: DatabasePromotion): PromoCast => ({
  id: dbPromo.id.toString(),
  castUrl: dbPromo.cast_url,
  author: {
    fid: dbPromo.fid,
    username: dbPromo.username,
    displayName: dbPromo.display_name || dbPromo.username,
  },
  rewardPerShare: dbPromo.reward_per_share,
  totalBudget: dbPromo.total_budget,
  sharesCount: dbPromo.shares_count,
  remainingBudget: dbPromo.remaining_budget,
  shareText: dbPromo.share_text || undefined,
  createdAt: dbPromo.created_at,
  status: dbPromo.status,
  blockchainHash: dbPromo.blockchain_hash || undefined,
})

export default function PromotePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [profile, setProfile] = useState<FarcasterUser | null>(null)
  const [context, setContext] = useState<FarcasterContext | null>(null)
  const [hapticsSupported, setHapticsSupported] = useState(false)
  const [sdkType, setSdkType] = useState<"miniapp" | "frame" | null>(null)
  const [showAddToFavorites, setShowAddToFavorites] = useState(false)
  const { isConnected: isWalletConnected } = useAccount()
  const [showForm, setShowForm] = useState(false)
  const [showFundingForm, setShowFundingForm] = useState(false)
  const [fundingPromo, setFundingPromo] = useState<PromoCast | null>(null)
  const [promoCasts, setPromoCasts] = useState<PromoCast[]>([])
  const [loading, setLoading] = useState(true)
  const [sharingPromoId, setSharingPromoId] = useState<string | null>(null)
  const [shareTimers, setShareTimers] = useState<Record<string, { canShare: boolean; timeRemaining: number }>>({})
  const [userStats, setUserStats] = useState<{ totalEarnings: number; totalShares: number; pendingClaims: number }>({
    totalEarnings: 0,
    totalShares: 0,
    pendingClaims: 0,
  })

  // ... (az useEffect hívások és a többi logika változatlan)

  useEffect(() => {
    // ... initializeSDKs logika ...
  }, [])

  const fetchPromotions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/promotions?status=all")
      if (response.ok) {
        const data = await response.json()
        const convertedPromos = data.promotions.map(convertDbToPromoCast)
        setPromoCasts(convertedPromos)
      } else {
        console.error("Failed to fetch promotions")
      }
    } catch (error) {
      console.error("Error fetching promotions:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPromotions()
  }, [fetchPromotions])

  const currentUser =
    isAuthenticated && profile
      ? {
          fid: profile.fid || 0,
          username: profile.username || "user",
          displayName: profile.displayName || "Current User",
        }
      : {
          fid: 1234,
          username: "testuser",
          displayName: "Test User",
        }

  // JAVÍTÁS: Handler függvények a PaymentForm számára
  const handleCreateSuccess = () => {
    setShowForm(false); // Bezárja a formot
    fetchPromotions();  // Frissíti a listát, hogy megjelenjen az új, aktív kampány
  };

  const handleCreateCancel = () => {
    setShowForm(false); // Csak bezárja a formot
  };

  const handleFundSuccess = () => {
    setShowFundingForm(false);
    setFundingPromo(null);
    fetchPromotions(); // Frissíti a listát a megnövelt budgettel
  }
  
  // ... (a többi handler függvény, pl. handleSharePromo, stb. változatlan)

  const visiblePromos = promoCasts.filter(
    (promo) => promo.status === "active" || promo.author.fid === currentUser.fid
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 flex items-center justify-center">
        <div className="text-purple-400 text-2xl font-bold animate-pulse">Loading promotions...</div>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 px-4 py-6`}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2 text-purple-300 hover:text-white transition-colors">
            <FiArrowLeft size={20} />
            <span>Back to AppRank</span>
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white">Promotion Campaigns</h1>
            <ConnectWalletButton />
          </div>
        </div>

        {/* User Profile */}
        <div className="mb-8">
          <UserProfile
            userPromos={promoCasts.filter((promo) => promo.author.fid === currentUser.fid)}
            onEditPromo={(promo) => {
              console.log("Edit promo:", promo)
              alert("Edit functionality coming soon!")
            }}
            userStats={userStats}
          />
        </div>

        {/* Create Promotion Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <FiPlus size={20} />
            Create Promotion
          </button>
        </div>
        
        {/* Campaign Creation Form (only if showForm) */}
        {showForm && (
          <div id="promo-form" className="bg-[#23283a] rounded-2xl p-6 mb-8 border border-[#a64d79] relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-white text-xl font-bold"
              onClick={handleCreateCancel}
              aria-label="Close"
            >
              ×
            </button>
            
            {/* JAVÍTÁS: A PaymentForm most már megkapja a hiányzó onCancel propot is */}
            <PaymentForm 
              user={currentUser} 
              onSuccess={handleCreateSuccess} 
              onCancel={handleCreateCancel} 
            />
          </div>
        )}

        {/* Campaigns List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Available Campaigns</h2>
            <div className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-lg">
              ⏰ Share limit: 48h per campaign
            </div>
          </div>
          {visiblePromos.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">No active campaigns yet</div>
              <div className="text-gray-500">Create your first promotion campaign to get started!</div>
            </div>
          ) : (
            visiblePromos.map((promo) => (
              // A lista renderelése itt változatlan
              <div key={promo.id} className="bg-[#23283a] rounded-2xl p-6 border border-[#a64d79]">
                {/* ... A promóciós kártya JSX kódja ... */}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Funding Form Modal */}
      {showFundingForm && fundingPromo && (
        <FundingForm
          promotionId={Number(fundingPromo.id)}
          onSuccess={handleFundSuccess}
          // ... többi prop
        />
      )}
    </div>
  )
}