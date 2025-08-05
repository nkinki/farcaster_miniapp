"use client"

import { useState, useEffect, useRef } from "react"
import { useAccount } from "wagmi"
import { useSignIn, useProfile } from "@farcaster/auth-kit"
import { FiArrowLeft, FiShare2, FiDollarSign, FiUsers, FiPlus, FiX, FiClock } from "react-icons/fi"
import Link from "next/link"
import UserProfile, { type UserProfileRef } from "@/components/UserProfile"
import PaymentForm from "../../components/PaymentForm"
import FundingForm from "../../components/FundingForm"
import MyCampaignsDropdown from "../../components/MyCampaignsDropdown"
import { usePromotions } from "@/hooks/usePromotions"
import { mapPromotionsToPromoCasts } from "@/utils/promotionMapper"

// Local type definitions to ensure consistency
interface PromoCast {
  id: number
  fid: number
  username: string
  displayName: string
  castUrl: string
  shareText: string | null
  rewardPerShare: number
  totalBudget: number
  sharesCount: number
  remainingBudget: number
  status: "active" | "inactive" | "paused" | "completed"
  createdAt: string
  updatedAt: string
  author: {
    fid: number
    username: string
    displayName: string
  }
}

interface ShareTimer {
  promotionId: number
  canShareAt: string
  timeRemaining: number
}

export default function PromotePage() {
  const { address, isConnected } = useAccount()
  const { isAuthenticated, profile } = useProfile()
  const signInResult = useSignIn({ nonce: "farcaster-promo-app" })

  // Extract properties safely
  const { signIn, isSuccess, isError, error } = signInResult

  // Check if isPolling exists, otherwise use a fallback
  const isPolling = "isPolling" in signInResult ? signInResult.isPolling : false
  const isFarcasterConnected = "isConnected" in signInResult ? signInResult.isConnected : false

  // Refs
  const userProfileRef = useRef<UserProfileRef>(null)

  // State management
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [showFundingForm, setShowFundingForm] = useState(false)
  const [selectedPromoForFunding, setSelectedPromoForFunding] = useState<PromoCast | null>(null)
  const [shareTimers, setShareTimers] = useState<ShareTimer[]>([])
  const [isLoadingTimers, setIsLoadingTimers] = useState(false)

  // Fetch promotions
  const {
    promotions: rawPromotions,
    loading: promotionsLoading,
    error: promotionsError,
    refetch: refetchPromotions,
  } = usePromotions({
    limit: 50,
    offset: 0,
    status: "active",
  })

  // Convert database promotions to frontend format - with type safety
  const promotions: PromoCast[] = rawPromotions ? mapPromotionsToPromoCasts(rawPromotions) : []

  // Filter user's own promotions - with explicit typing and better error handling
  const myPromotions: PromoCast[] = promotions.filter((promo) => {
    // Ensure both values exist and are numbers
    const userFid = profile?.fid
    const promoFid = promo?.fid

    if (typeof userFid !== "number" || typeof promoFid !== "number") {
      return false
    }

    return promoFid === userFid
  })

  // Other promotions (not user's own) - with explicit typing and better error handling
  const otherPromotions: PromoCast[] = promotions.filter((promo) => {
    const userFid = profile?.fid
    const promoFid = promo?.fid

    // If no user fid, show all promotions
    if (typeof userFid !== "number") {
      return true
    }

    // If promo fid is invalid, exclude it
    if (typeof promoFid !== "number") {
      return false
    }

    return promoFid !== userFid
  })

  // Debug Farcaster Auth state
  console.log("🔍 Farcaster Auth debug:", {
    isAuthenticated,
    profile,
    isPolling,
    isError,
    error,
    isSuccess,
    isFarcasterConnected,
    signInResult, // Log the entire result to see what's available
  })

  // Fetch share timers
  useEffect(() => {
    const fetchShareTimers = async () => {
      if (!profile?.fid) return

      setIsLoadingTimers(true)
      try {
        const response = await fetch(`/api/share-timers?fid=${profile.fid}`)
        if (response.ok) {
          const data = await response.json()
          setShareTimers(data.timers || [])
        }
      } catch (error) {
        console.error("Error fetching share timers:", error)
      } finally {
        setIsLoadingTimers(false)
      }
    }

    fetchShareTimers()
    // Refresh timers every 30 seconds
    const interval = setInterval(fetchShareTimers, 30000)
    return () => clearInterval(interval)
  }, [profile?.fid])

  // Handle successful payment form completion
  const handlePaymentSuccess = () => {
    setShowPaymentForm(false)
    refetchPromotions()
    // Refresh user profile rewards
    userProfileRef.current?.refetchRewards()
  }

  // Handle successful funding
  const handleFundingSuccess = () => {
    setShowFundingForm(false)
    setSelectedPromoForFunding(null)
    refetchPromotions()
    // Refresh user profile rewards
    userProfileRef.current?.refetchRewards()
  }

  // Handle manage campaign click
  const handleManageCampaign = (promo: PromoCast) => {
    setSelectedPromoForFunding(promo)
    setShowFundingForm(true)
  }

  // Handle share promotion
  const handleShare = async (promotion: PromoCast) => {
    if (!profile?.fid) {
      alert("Please sign in with Farcaster first")
      return
    }

    try {
      const response = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promotionId: promotion.id,
          fid: profile.fid,
          username: profile.username,
          displayName: profile.displayName,
        }),
      })

      if (response.ok) {
        alert("Share recorded successfully! 🎉")
        refetchPromotions()
        // Refresh user profile rewards
        userProfileRef.current?.refetchRewards()

        // Refresh share timers
        const timerResponse = await fetch(`/api/share-timers?fid=${profile.fid}`)
        if (timerResponse.ok) {
          const data = await timerResponse.json()
          setShareTimers(data.timers || [])
        }
      } else {
        const errorData = await response.json()
        alert(`Error: ${errorData.error}`)
      }
    } catch (error) {
      console.error("Error sharing promotion:", error)
      alert("Failed to record share. Please try again.")
    }
  }

  // Check if user can share a promotion (48-hour cooldown)
  const canShare = (promotionId: number): boolean => {
    const timer = shareTimers.find((t) => t.promotionId === promotionId)
    return !timer || timer.timeRemaining <= 0
  }

  // Get time remaining for a promotion
  const getTimeRemaining = (promotionId: number): string => {
    const timer = shareTimers.find((t) => t.promotionId === promotionId)
    if (!timer || timer.timeRemaining <= 0) return ""

    const hours = Math.floor(timer.timeRemaining / 3600)
    const minutes = Math.floor((timer.timeRemaining % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  // Handle sign in - simplified version
  const handleSignIn = async () => {
    try {
      console.log("🔄 Attempting to sign in with Farcaster...")
      signIn()
      console.log("✅ Sign in initiated successfully")
    } catch (error) {
      console.error("❌ Sign in failed:", error)
      alert("Failed to sign in with Farcaster. Please try again.")
    }
  }

  // Show loading state during sign in
  if (isPolling) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a1f2e] to-[#2d1b69] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-white mb-2">Connecting to Farcaster...</h1>
          <p className="text-gray-400">Please complete the authentication in your Farcaster app</p>
        </div>
      </div>
    )
  }

  // Show error state if sign in failed
  if (isError && error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a1f2e] to-[#2d1b69] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Sign In Error</h1>
          <p className="text-gray-400 mb-8">Failed to sign in with Farcaster</p>
          <p className="text-sm text-red-300 mb-8">{error.message || "Unknown error"}</p>
          <button
            onClick={handleSignIn}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Authentication check
  if (!isAuthenticated || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a1f2e] to-[#2d1b69] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Welcome to Farcaster Promotions</h1>
          <p className="text-gray-400 mb-8">Sign in with Farcaster to start promoting and earning rewards</p>

          {/* Debug info in development */}
          {process.env.NODE_ENV === "development" && (
            <div className="mb-4 p-4 bg-gray-800 rounded-lg text-left text-sm max-w-md mx-auto">
              <p className="text-yellow-400 mb-2">Debug Info:</p>
              <p className="text-gray-300">isAuthenticated: {String(isAuthenticated)}</p>
              <p className="text-gray-300">profile: {profile ? "exists" : "null"}</p>
              <p className="text-gray-300">isPolling: {String(isPolling)}</p>
              <p className="text-gray-300">isError: {String(isError)}</p>
              <p className="text-gray-300">isSuccess: {String(isSuccess)}</p>
              <p className="text-gray-300">isFarcasterConnected: {String(isFarcasterConnected)}</p>
              {error && <p className="text-red-300">error: {error.message}</p>}
              <details className="mt-2">
                <summary className="text-blue-400 cursor-pointer">Raw signInResult</summary>
                <pre className="text-xs mt-1 overflow-auto">{JSON.stringify(signInResult, null, 2)}</pre>
              </details>
            </div>
          )}

          <button
            onClick={handleSignIn}
            disabled={isPolling}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPolling ? "Connecting..." : "Sign In with Farcaster"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a1f2e] to-[#2d1b69]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors">
              <FiArrowLeft size={24} />
            </Link>
            <h1 className="text-3xl font-bold text-white">Promotion Dashboard</h1>
          </div>

          <button
            onClick={() => setShowPaymentForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300"
          >
            <FiPlus />
            Create Campaign
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - User Profile */}
          <div className="lg:col-span-1">
            <UserProfile
              ref={userProfileRef}
              user={{
                // Fix: Ensure fid is always a number with fallback to 0
                fid: profile.fid ?? 0,
                username: profile.username || "",
                displayName: profile.displayName || profile.username || "",
              }}
            />
          </div>

          {/* Right Column - Campaigns */}
          <div className="lg:col-span-2 space-y-6">
            {/* My Campaigns - Now using properly typed PromoCast[] */}
            {myPromotions.length > 0 && (
              <MyCampaignsDropdown myPromos={myPromotions} onManageClick={handleManageCampaign} />
            )}

            {/* Available Promotions */}
            <div className="bg-[#23283a] rounded-2xl border border-[#a64d79] overflow-hidden">
              <div className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FiShare2 />
                  Available Promotions ({otherPromotions.length})
                </h2>
              </div>

              <div className="p-4">
                {promotionsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="text-gray-400 mt-2">Loading promotions...</p>
                  </div>
                ) : promotionsError ? (
                  <div className="text-center py-8">
                    <p className="text-red-400">Error loading promotions</p>
                    <button
                      onClick={() => refetchPromotions()}
                      className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                    >
                      Retry
                    </button>
                  </div>
                ) : otherPromotions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No promotions available</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {otherPromotions.map((promotion) => (
                      <div key={promotion.id} className="bg-[#181c23] p-4 rounded-lg border border-gray-700">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <p className="text-white font-medium truncate pr-4">{promotion.castUrl}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                              <span className="flex items-center gap-1">
                                <FiDollarSign />
                                {promotion.rewardPerShare} CHESS
                              </span>
                              <span className="flex items-center gap-1">
                                <FiUsers />
                                {promotion.sharesCount} shares
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                                promotion.status === "active"
                                  ? "bg-green-600 text-white"
                                  : promotion.status === "paused"
                                    ? "bg-yellow-600 text-white"
                                    : "bg-gray-600 text-white"
                              }`}
                            >
                              {promotion.status}
                            </span>

                            {canShare(promotion.id) ? (
                              <button
                                onClick={() => handleShare(promotion)}
                                disabled={promotion.status !== "active"}
                                className="px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Share & Earn
                              </button>
                            ) : (
                              <div className="text-center">
                                <div className="px-4 py-2 bg-gray-600 text-gray-300 font-medium rounded-lg cursor-not-allowed">
                                  <FiClock className="inline mr-1" />
                                  Cooldown
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{getTimeRemaining(promotion.id)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Form Modal */}
        {showPaymentForm && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-[#23283a] rounded-2xl p-6 border border-[#a64d79] w-full max-w-md relative">
              <button
                onClick={() => setShowPaymentForm(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-white"
              >
                <FiX size={24} />
              </button>

              <PaymentForm
                user={{
                  // Fix: Ensure fid is always a number with fallback to 0
                  fid: profile.fid ?? 0,
                  username: profile.username || "",
                  displayName: profile.displayName || profile.username || "",
                }}
                onSuccess={handlePaymentSuccess}
                onCancel={() => setShowPaymentForm(false)}
              />
            </div>
          </div>
        )}

        {/* Funding Form Modal */}
        {showFundingForm && selectedPromoForFunding && (
          <FundingForm
            promotionId={selectedPromoForFunding.id}
            totalBudget={selectedPromoForFunding.totalBudget}
            rewardPerShare={selectedPromoForFunding.rewardPerShare}
            castUrl={selectedPromoForFunding.castUrl}
            shareText={selectedPromoForFunding.shareText || ""}
            status={selectedPromoForFunding.status}
            onSuccess={handleFundingSuccess}
            onCancel={() => {
              setShowFundingForm(false)
              setSelectedPromoForFunding(null)
            }}
          />
        )}
      </div>
    </div>
  )
}
