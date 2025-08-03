"use client"

import { useState, useEffect, useCallback } from "react"
import { sdk as miniAppSdk } from "@farcaster/miniapp-sdk"
import { sdk as frameSdk } from "@farcaster/frame-sdk"
import { FiArrowLeft, FiShare2, FiDollarSign, FiUsers, FiTrendingUp, FiPlus } from "react-icons/fi"
import Link from "next/link"
import UserProfile from "@/components/UserProfile"
import PaymentForm from "../../components/PaymentForm"
import FundingForm from "../../components/FundingForm"
import { useAccount } from "wagmi"
import { ConnectWalletButton } from "@/components/ConnectWalletButton"
import { PromoCast, DatabasePromotion } from "@/types/promotions"

// Farcaster-specifikus típusok, érdemes lehet ezeket is központosítani
interface FarcasterUser {
  fid: number
  username?: string
  displayName?: string
  pfpUrl?: string
  pfp?: string // Frame SDK uses 'pfp' instead of 'pfpUrl'
}

interface FarcasterContext {
  user?: FarcasterUser
  client?: {
    platformType?: "web" | "mobile"
    safeAreaInsets?: { top: number; bottom: number; left: number; right: number }
    added?: boolean // Frame SDK property
  }
  location?: {
    type: string
    cast?: { hash: string; text: string; embeds?: string[] }
  }
}

// Helper a DB -> Kliens konverzióhoz
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
  // State-ek
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [profile, setProfile] = useState<FarcasterUser | null>(null)
  const [context, setContext] = useState<FarcasterContext | null>(null)
  const [sdkType, setSdkType] = useState<"miniapp" | "frame" | null>(null)
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

  // SDK inicializálása
  useEffect(() => {
    const initializeSDKs = async () => {
      // ... (a korábbi SDK inicializáló logika változatlan)
    };
    initializeSDKs();
  }, [])

  // Adatok lekérése
  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/promotions?status=all");
      if (response.ok) {
        const data = await response.json();
        setPromoCasts(data.promotions.map(convertDbToPromoCast));
      } else {
        console.error("Failed to fetch promotions");
      }
    } catch (error) {
      console.error("Error fetching promotions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const fetchUserStats = useCallback(async (fid: number) => {
    // ... (user stats lekérő logika)
  }, []);

  useEffect(() => {
    if (isAuthenticated && profile?.fid) {
      fetchUserStats(profile.fid);
    }
  }, [isAuthenticated, profile, fetchUserStats]);


  // Aktuális felhasználó
  const currentUser =
    isAuthenticated && profile
      ? {
          fid: profile.fid,
          username: profile.username || "user",
          displayName: profile.displayName || "Current User",
        }
      : {
          fid: 0, // Inaktív felhasználó esetén biztonságos default érték
          username: "guest",
          displayName: "Guest",
        };
  
  // Handler függvények a formokhoz
  const handleCreateSuccess = () => {
    setShowForm(false);
    fetchPromotions();
    alert("Campaign created successfully!");
  };

  const handleCreateCancel = () => {
    setShowForm(false);
  };

  const handleFundSuccess = () => {
    setShowFundingForm(false);
    setFundingPromo(null);
    fetchPromotions();
    alert("Campaign funded successfully!");
  };

  const handleFundCancel = () => {
    setShowFundingForm(false);
    setFundingPromo(null);
  };
  
  // Megosztás kezelése
  const handleSharePromo = async (promo: PromoCast) => {
    // ... (a megosztás logikája változatlan)
  };

  // Látható promóciók szűrése
  const visiblePromos = promoCasts.filter(
    (promo) => promo.status === "active" || promo.author.fid === currentUser.fid
  );

  const calculateProgress = (promo: PromoCast) => {
    if (promo.totalBudget === 0) return 0;
    const spent = promo.totalBudget - promo.remainingBudget;
    return (spent / promo.totalBudget) * 100;
  };

  // Loading állapot
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 flex items-center justify-center">
        <div className="text-purple-400 text-2xl font-bold animate-pulse">Loading promotions...</div>
      </div>
    );
  }

  // Renderelés
  return (
    <div className={`min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 px-4 py-6`}>
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
            onEditPromo={() => alert("Manage your campaign from its card below.")}
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
          </div>
          {visiblePromos.length === 0 ? (
            <div className="text-center py-12 bg-[#23283a] rounded-2xl border border-[#a64d79]">
              <div className="text-gray-400 text-lg mb-2">No campaigns yet.</div>
              <div className="text-gray-500">Be the first to create a promotion!</div>
            </div>
          ) : (
            visiblePromos.map((promo) => (
              <div key={promo.id} className="bg-[#23283a] rounded-2xl p-6 border border-[#a64d79]">
                <div className="flex items-start justify-between mb-4">
                  {/* ... (Campaign card details) */}
                </div>

                <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                  <div
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${calculateProgress(promo)}%` }}
                  ></div>
                </div>

                <div className="flex gap-3">
                  {/* Fund Campaign Button - only show for own campaigns */}
                  {promo.author.fid === currentUser.fid && (
                    <button
                      onClick={() => {
                        setFundingPromo(promo);
                        setShowFundingForm(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all"
                    >
                      <FiDollarSign />
                      Fund Campaign
                    </button>
                  )}

                  {/* Share & Earn Button */}
                  <button
                    onClick={() => handleSharePromo(promo)}
                    disabled={
                      sharingPromoId === promo.id ||
                      promo.author.fid === currentUser.fid ||
                      promo.status !== 'active'
                    }
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 font-semibold rounded-lg transition-all bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white disabled:from-gray-600 disabled:to-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <FiShare2 size={16} />
                    {promo.author.fid === currentUser.fid ? 'Your Campaign' : `Share & Earn ${promo.rewardPerShare} $CHESS`}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Funding Form Modal */}
      {showFundingForm && fundingPromo && (
        <FundingForm
          promotionId={Number(fundingPromo.id)}
          totalBudget={fundingPromo.totalBudget}
          rewardPerShare={fundingPromo.rewardPerShare}
          castUrl={fundingPromo.castUrl}
          shareText={fundingPromo.shareText || ""}
          status={fundingPromo.status}
          onSuccess={handleFundSuccess}
          onCancel={handleFundCancel}
        />
      )}
    </div>
  );
}