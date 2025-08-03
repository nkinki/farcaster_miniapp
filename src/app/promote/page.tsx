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

// JAVÍTÁS: A típusokat a központi fájlból importáljuk
import { PromoCast, DatabasePromotion } from "@/types/promotions"

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
    safeAreaInsets?: {
      top: number
      bottom: number
      left: number
      right: number
    }
    added?: boolean // Frame SDK property
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

// Helper function to convert database promotion to PromoCast
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
  // Dual SDK authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [profile, setProfile] = useState<FarcasterUser | null>(null)
  const [context, setContext] = useState<FarcasterContext | null>(null)
  const [hapticsSupported, setHapticsSupported] = useState(false)
  const [sdkType, setSdkType] = useState<"miniapp" | "frame" | null>(null)
  const [showAddToFavorites, setShowAddToFavorites] = useState(false)

  // Wallet connection (handled by Farcaster SDK connector)
  const { isConnected: isWalletConnected, address: walletAddress } = useAccount()

  // Campaign creation state
  const [showForm, setShowForm] = useState(false)
  const [castUrl, setCastUrl] = useState("")

  // Payment form state
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("")
  // Funding form state
  const [showFundingForm, setShowFundingForm] = useState(false)
  const [fundingPromo, setFundingPromo] = useState<PromoCast | null>(null)
  const [shareText, setShareText] = useState("")
  const [rewardPerShare, setRewardPerShare] = useState(1000) // Default 1k
  const [totalBudget, setTotalBudget] = useState(10000) // Default 10k
  const [isCreating, setIsCreating] = useState(false)

  // Database state
  const [promoCasts, setPromoCasts] = useState<PromoCast[]>([])
  const [loading, setLoading] = useState(true)
  const [sharingPromoId, setSharingPromoId] = useState<string | null>(null)
  const [shareTimers, setShareTimers] = useState<Record<string, { canShare: boolean; timeRemaining: number }>>({})
  const [userStats, setUserStats] = useState<{ totalEarnings: number; totalShares: number; pendingClaims: number }>({
    totalEarnings: 0,
    totalShares: 0,
    pendingClaims: 0,
  })

  // Initialize both SDKs
  useEffect(() => {
    const initializeSDKs = async () => {
      console.log("🔄 Initializing dual SDK support...")

      // Try Mini App SDK first
      try {
        console.log("🎯 Attempting Mini App SDK initialization...")
        const miniAppContext = await miniAppSdk.context
        console.log("✅ Mini App SDK context:", miniAppContext)

        if (miniAppContext.user?.fid) {
          console.log("🎉 Mini App SDK authentication successful")
          setSdkType("miniapp")
          setContext(miniAppContext)
          setProfile({
            fid: miniAppContext.user.fid,
            username: miniAppContext.user.username || "user",
            displayName: miniAppContext.user.displayName || "Current User",
            pfpUrl: miniAppContext.user.pfpUrl,
          })
          setIsAuthenticated(true)

          // Check haptics support for Mini App
          try {
            await miniAppSdk.haptics.impactOccurred("light")
            setHapticsSupported(true)
            console.log("✅ Mini App haptics supported")
          } catch (error) {
            console.log("❌ Mini App haptics not supported:", error)
          }

          return // Success with Mini App SDK
        }
      } catch (miniAppError) {
        console.log("⚠️ Mini App SDK failed, trying Frame SDK...", miniAppError)
      }

      // Fallback to Frame SDK
      try {
        console.log("🖼️ Attempting Frame SDK initialization...")
        const frameContext = await frameSdk.context
        console.log("✅ Frame SDK context:", frameContext)

        if (frameContext.user?.fid) {
          console.log("🎉 Frame SDK authentication successful")
          setSdkType("frame")
          setContext(frameContext)
          setProfile({
            fid: frameContext.user.fid,
            username: frameContext.user.username || "user",
            displayName: frameContext.user.displayName || "Current User",
            pfpUrl: (frameContext.user as any).pfp || frameContext.user.pfpUrl,
          })
          setIsAuthenticated(true)

          // Check for add to favorites
          if (!frameContext.client?.added) {
            setTimeout(() => {
              setShowAddToFavorites(true)
            }, 2000)
          }

          // Initialize Frame SDK
          try {
            await frameSdk.actions.ready()
            console.log("✅ Frame SDK ready")
          } catch (error) {
            console.log("⚠️ Frame SDK ready failed:", error)
          }

          return // Success with Frame SDK
        }
      } catch (frameError) {
        console.log("❌ Frame SDK also failed:", frameError)
      }

      // Both SDKs failed
      console.log("❌ Both SDKs failed, using fallback")
      setIsAuthenticated(false)
      setProfile(null)
      setSdkType(null)
    }

    initializeSDKs()
  }, [])

  // Haptic feedback helper
  const triggerHaptic = async (type: "light" | "medium" | "heavy" | "success" | "warning" | "error") => {
    if (!hapticsSupported || sdkType !== "miniapp") return

    try {
      if (type === "success" || type === "warning" || type === "error") {
        await miniAppSdk.haptics.notificationOccurred(type)
      } else {
        await miniAppSdk.haptics.impactOccurred(type)
      }
    } catch (error) {
      console.log("Haptics error:", error)
    }
  }

  // Add to favorites handler (Frame SDK only)
  const handleAddToFavorites = async () => {
    if (sdkType !== "frame") return

    try {
      await frameSdk.actions.addMiniApp()
      setShowAddToFavorites(false)
      console.log("🎉 App added to favorites!")
    } catch (error) {
      console.error("Add to favorites error:", error)
      setShowAddToFavorites(false)
    }
  }

  const handleDismissAddToFavorites = () => setShowAddToFavorites(false)

  // Fetch promotions from database
  const fetchPromotions = async () => {
    try {
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
  }

  useEffect(() => {
    fetchPromotions()
  }, [])

  // Use real user data if authenticated, otherwise mock data
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

  const handlePaymentComplete = (amount: number, txHash: string) => {
    console.log("Payment completed:", { amount, txHash })

    if (selectedCampaignId === "new") {
      // New campaign was created successfully
      console.log("New campaign created successfully with hash:", txHash)

      // Reset form
      setCastUrl("")
      setShareText("")
      setShowForm(false)
      setShowPaymentForm(false)
      setSelectedCampaignId("")

      // Refresh the promotions list
      fetchPromotions()

      // Haptic feedback for successful campaign creation
      triggerHaptic("success")

      console.log("🎉 Campaign created successfully on blockchain and saved to database!")
    } else {
      // Existing campaign was funded
      console.log("Campaign funded successfully with hash:", txHash)
      setShowPaymentForm(false)
      setSelectedCampaignId("")

      // Refresh the promotions list
      fetchPromotions()

      console.log(`🎉 Campaign funded successfully! Transaction hash: ${txHash}`)
    }
  }

  const handlePaymentCancel = () => {
    setShowPaymentForm(false)
    setSelectedCampaignId("")
  }

  const openPaymentForm = (campaignId: string) => {
    setSelectedCampaignId(campaignId)
    setShowPaymentForm(true)
  }

  const handleCreateCampaign = async () => {
    if (!castUrl.trim()) {
      await triggerHaptic("error")
      alert("Please enter a cast URL")
      return
    }

    if (!isAuthenticated) {
      await triggerHaptic("error")
      alert("Please connect your Farcaster account first")
      return
    }

    if (!isWalletConnected) {
      await triggerHaptic("error")
      alert("Please connect your wallet first")
      return
    }

    setIsCreating(true)

    try {
      // First, create campaign on blockchain
      console.log("Creating blockchain campaign with data:", {
        castUrl,
        shareText: shareText || "Share this promotion!",
        rewardPerShare,
        totalBudget,
      })

      // Open payment form for blockchain campaign creation
      setSelectedCampaignId("new") // Special ID for new campaign
      setShowPaymentForm(true)
    } catch (error) {
      console.error("Error preparing campaign creation:", error)
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsCreating(false)
    }
  }

  // Auto-adjust reward if too low and no shares
  const checkAndAdjustReward = useCallback(async (promo: PromoCast) => {
    if (promo.sharesCount === 0 && promo.rewardPerShare < 2000) {
      const newReward = Math.min(promo.rewardPerShare * 1.5, 5000)

      try {
        const response = await fetch(`/api/promotions/${promo.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rewardPerShare: Math.round(newReward),
          }),
        })

        if (response.ok) {
          const updatedPromo = { ...promo, rewardPerShare: Math.round(newReward) }
          setPromoCasts((prev) => prev.map((p) => (p.id === promo.id ? updatedPromo : p)))

          console.log(`Auto-adjusted reward for promo ${promo.id} from ${promo.rewardPerShare} to ${newReward} $CHESS`)

          // Haptic feedback for auto-adjustment
          await triggerHaptic("warning")
        }
      } catch (error) {
        console.error("Error updating promotion:", error)
      }
    }
  }, [])

  const handleSharePromo = async (promo: PromoCast) => {
    if (!isAuthenticated) {
      alert("Please connect your Farcaster account first")
      return
    }

    if (promo.author.fid === currentUser.fid) {
      alert("You cannot share your own campaign")
      return
    }

    if (promo.status !== "active") {
      alert("This campaign is not active")
      return
    }

    if (promo.remainingBudget < promo.rewardPerShare) {
      alert("This campaign has insufficient budget")
      return
    }

    setSharingPromoId(promo.id)

    try {
      // Create share text
      const shareText = promo.shareText || `Check out this amazing post! ${promo.castUrl}`

      // Use appropriate SDK for composing cast
      let castResult
      if (sdkType === "miniapp") {
        castResult = await miniAppSdk.actions.composeCast({
          text: shareText,
          embeds: [promo.castUrl],
        })
      } else if (sdkType === "frame") {
        // Frame SDK might have different API - adapt as needed
        console.log("Frame SDK cast composition not implemented yet")
        alert("Cast composition not available in Frame mode")
        return
      } else {
        alert("No SDK available for cast composition")
        return
      }

      // Check if cast was actually published (not cancelled)
      if (!castResult || !castResult.cast) {
        console.log("Cast was cancelled or failed:", castResult)
        return // Don't record share if cast was cancelled
      }

      console.log("Cast published successfully:", castResult)

      // Record share in database only after successful cast
      const shareData = {
        promotionId: Number.parseInt(promo.id),
        sharerFid: currentUser.fid,
        sharerUsername: currentUser.username,
        shareText: shareText,
        rewardAmount: promo.rewardPerShare,
      }

      console.log("Sending share data to API:", shareData)

      const response = await fetch("/api/shares", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(shareData),
      })

      console.log("Share API response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("Share created:", data)

        // Update local state
        const updatedPromo = {
          ...promo,
          sharesCount: promo.sharesCount + 1,
          remainingBudget: promo.remainingBudget - promo.rewardPerShare,
        }
        setPromoCasts((prev) => prev.map((p) => (p.id === promo.id ? updatedPromo : p)))

        // Refresh share timers
        await fetchShareTimers()

        // Refresh user stats
        await fetchUserStats()

        // Haptic feedback
        await triggerHaptic("success")

        alert(`Successfully shared! You earned ${promo.rewardPerShare} $CHESS!`)
      } else if (response.status === 429) {
        const errorData = await response.json()
        console.error("Share limit reached:", errorData)
        alert(errorData.error)
      } else {
        const errorData = await response.json()
        console.error("Share failed:", errorData)
        alert(`Failed to record share: ${errorData.error}`)
      }
    } catch (error) {
      console.error("Error sharing promo:", error)
      if (error instanceof Error && error.message.includes("cancelled")) {
        console.log("User cancelled the cast")
        return // Don't show error for user cancellation
      }
      alert(`Share failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setSharingPromoId(null)
    }
  }

  const calculateProgress = (promo: PromoCast) => {
    const spent = promo.totalBudget - promo.remainingBudget
    return (spent / promo.totalBudget) * 100
  }

  const formatTimeRemaining = (hours: number) => {
    if (hours <= 0) return "Ready to share"
    const h = Math.floor(hours)
    const m = Math.floor((hours - h) * 60)
    return `${h}h ${m}m remaining`
  }

  // Auto-check and adjust rewards every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      promoCasts.forEach(checkAndAdjustReward)
    }, 30000)

    return () => clearInterval(interval)
  }, [promoCasts, checkAndAdjustReward])

  // Fetch share timers for current user
  const fetchShareTimers = async () => {
    if (isAuthenticated && currentUser.fid) {
      try {
        const response = await fetch(`/api/share-timers?fid=${currentUser.fid}`)
        if (response.ok) {
          const data = await response.json()
          const timersMap: Record<string, { canShare: boolean; timeRemaining: number }> = {}
          data.timers.forEach((timer: { promotionId: number; canShare: boolean; timeRemaining: number }) => {
            timersMap[timer.promotionId.toString()] = {
              canShare: timer.canShare,
              timeRemaining: timer.timeRemaining,
            }
          })
          setShareTimers(timersMap)
        }
      } catch (error) {
        console.error("Error fetching share timers:", error)
      }
    }
  }

  // Fetch timers when promotions load
  useEffect(() => {
    if (promoCasts.length > 0) {
      fetchShareTimers()
    }
  }, [promoCasts, isAuthenticated, currentUser.fid])

  // Auto-refresh timers every minute
  useEffect(() => {
    if (isAuthenticated && currentUser.fid && promoCasts.length > 0) {
      const interval = setInterval(() => {
        fetchShareTimers()
      }, 60000) // Refresh every minute

      return () => clearInterval(interval)
    }
  }, [isAuthenticated, currentUser.fid, promoCasts.length])

  // Auto-fill cast URL if coming from cast context
  useEffect(() => {
    if (context?.location?.type === "cast_embed" && context.location.cast?.embeds?.[0]) {
      setCastUrl(context.location.cast.embeds[0])
      console.log("Auto-filled cast URL from context:", context.location.cast.embeds[0])
    }
  }, [context])

  // Fetch user statistics
  const fetchUserStats = async () => {
    if (isAuthenticated && currentUser.fid) {
      try {
        const response = await fetch(`/api/users?fid=${currentUser.fid}`)
        if (response.ok) {
          const data = await response.json()
          if (data.user) {
            setUserStats({
              totalEarnings: data.user.total_earnings || 0,
              totalShares: data.user.total_shares || 0,
              pendingClaims: data.user.total_earnings || 0, // All earnings are pending until claimed
            })
          }
        }
      } catch (error) {
        console.error("Error fetching user stats:", error)
      }
    }
  }

  // Fetch user stats when authenticated
  useEffect(() => {
    if (isAuthenticated && currentUser.fid) {
      fetchUserStats()
    }
  }, [isAuthenticated, currentUser.fid])

  const isMobile = context?.client?.platformType === "mobile"
  const safeArea = context?.client?.safeAreaInsets

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
      className={`min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 ${
        isMobile ? "px-2" : "px-4"
      } py-6`}
      style={{
        paddingTop: (safeArea?.top || 0) + 24,
        paddingBottom: (safeArea?.bottom || 0) + 24,
        paddingLeft: (safeArea?.left || 0) + (isMobile ? 8 : 16),
        paddingRight: (safeArea?.right || 0) + (isMobile ? 8 : 16),
      }}
    >
      {/* Add to Favorites Modal (Frame SDK only) */}
      {showAddToFavorites && sdkType === "frame" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "transparent",
              border: "2px solid rgba(139, 92, 246, 0.6)",
              borderRadius: "16px",
              padding: "30px",
              maxWidth: "400px",
              width: "100%",
              textAlign: "center",
              boxShadow: "0 0 40px rgba(139, 92, 246, 0.4)",
            }}
          >
            <div style={{ fontSize: "3em", marginBottom: "16px" }}>⭐</div>
            <h2
              style={{
                margin: "0 0 12px 0",
                fontSize: "1.4em",
                fontWeight: "600",
                color: "#8B5CF6",
                textShadow: "0 0 15px #8B5CF6",
              }}
            >
              Add to Favorites
            </h2>
            <p style={{ margin: "0 0 24px 0", opacity: 0.8, lineHeight: "1.5", color: "white" }}>
              Get quick access and receive notifications about new campaigns!
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={handleAddToFavorites}
                style={{
                  background: "transparent",
                  border: "2px solid #FF6B35",
                  color: "#FF6B35",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  fontSize: "1em",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s",
                }}
              >
                ⭐ Add to Favorites
              </button>
              <button
                onClick={handleDismissAddToFavorites}
                style={{
                  background: "transparent",
                  color: "rgba(255, 255, 255, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  fontSize: "1em",
                  cursor: "pointer",
                }}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

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
              onClick={() => setShowForm(false)}
              aria-label="Close"
            >
              ×
            </button>
            <PaymentForm user={currentUser} onSuccess={() => setShowForm(false)} />
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
              <div key={promo.id} className="bg-[#23283a] rounded-2xl p-6 border border-[#a64d79]">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {promo.author.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{promo.author.displayName}</h3>
                        <p className="text-purple-300 text-sm">@{promo.author.username}</p>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm break-all">{promo.castUrl}</p>
                    {promo.shareText && (
                      <p className="text-gray-400 text-sm mt-2 italic">“{promo.shareText}”</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        promo.status === "active"
                          ? "bg-green-600 text-white"
                          : promo.status === "paused"
                            ? "bg-yellow-600 text-white"
                            : promo.status === "inactive"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-600 text-white"
                      }`}
                    >
                      {promo.status === "inactive" ? "Funding needed" : promo.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-[#181c23] rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <FiDollarSign className="text-green-400" />
                      <span className="text-white font-semibold">{promo.rewardPerShare}</span>
                    </div>
                    <p className="text-xs text-gray-400">Reward per Share</p>
                  </div>
                  <div className="text-center p-3 bg-[#181c23] rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <FiUsers className="text-blue-400" />
                      <span className="text-white font-semibold">{promo.sharesCount}</span>
                    </div>
                    <p className="text-xs text-gray-400">Total Shares</p>
                  </div>
                  <div className="text-center p-3 bg-[#181c23] rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <FiTrendingUp className="text-purple-400" />
                      <span className="text-white font-semibold">{promo.remainingBudget}</span>
                    </div>
                    <p className="text-xs text-gray-400">Remaining Budget</p>
                  </div>
                  <div className="text-center p-3 bg-[#181c23] rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="text-white font-semibold">{Math.round(calculateProgress(promo))}%</span>
                    </div>
                    <p className="text-xs text-gray-400">Progress</p>
                  </div>
                </div>

                {/* Share Timer Display */}
                {promo.author.fid !== currentUser.fid && shareTimers[promo.id] && (
                  <div className="mb-4 p-3 bg-[#181c23] rounded-lg border border-purple-500">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-purple-400">⏰</span>
                      <span className="text-white font-semibold">
                        {shareTimers[promo.id].canShare
                          ? "Ready to share!"
                          : formatTimeRemaining(shareTimers[promo.id].timeRemaining)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                  <div
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
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
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300"
                    >
                      <FiDollarSign />
                      {promo.status === 'inactive' ? 'Fund to Activate' : 'Fund Campaign'}
                    </button>
                  )}

                  <button
                    onClick={() => handleSharePromo(promo)}
                    disabled={
                      sharingPromoId === promo.id ||
                      promo.author.fid === currentUser.fid ||
                      promo.status !== 'active' ||
                      (shareTimers[promo.id] && !shareTimers[promo.id].canShare) ||
                      sdkType !== "miniapp"
                    }
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 font-semibold rounded-lg transition-all duration-300 ${
                      promo.author.fid === currentUser.fid || promo.status !== 'active'
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : sharingPromoId === promo.id
                          ? "bg-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          : shareTimers[promo.id] && !shareTimers[promo.id].canShare
                            ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                            : sdkType !== "miniapp"
                              ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                              : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    }`}
                  >
                    {sharingPromoId === promo.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Sharing...
                      </>
                    ) : promo.author.fid === currentUser.fid ? (
                      <>
                        <FiShare2 size={16} />
                        Your Campaign
                      </>
                    ) : promo.status !== 'active' ? (
                       <>
                        <FiShare2 size={16} />
                        Not Active
                       </>
                    ) : sdkType !== "miniapp" ? (
                      <>
                        <FiShare2 size={16} />
                        Share (Mini App Only)
                      </>
                    ) : (
                      <>
                        <FiShare2 size={16} />
                        Share & Earn {promo.rewardPerShare} $CHESS
                      </>
                    )}
                  </button>
                </div>

                {/* Share Timer Info */}
                {promo.author.fid !== currentUser.fid && (
                  <div className="text-center mt-2">
                    <div className="text-xs text-gray-400">⏰ Share limit: 48h per campaign</div>
                  </div>
                )}
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
          onSuccess={() => {
            setShowFundingForm(false);
            setFundingPromo(null);
            fetchPromotions();
          }}
        />
      )}
      {/* Payment Form Modal */}
      {showPaymentForm && (
        <PaymentForm
          user={currentUser}
          onSuccess={() => {
            setShowPaymentForm(false);
            setSelectedCampaignId("");
            fetchPromotions();
          }}
        />
      )}
    </div>
  )
}