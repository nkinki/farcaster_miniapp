"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useAccount } from "wagmi"
import { sdk as miniAppSdk } from "@farcaster/miniapp-sdk"
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

  // State management for Farcaster user
  const [farcasterUser, setFarcasterUser] = useState<{
    fid: number
    username: string
    displayName: string
  } | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // Refs
  const userProfileRef = useRef<UserProfileRef>(null)

  // State management
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [showFundingForm, setShowFundingForm] = useState(false)
  const [selectedPromoForFunding, setSelectedPromoForFunding] = useState<PromoCast | null>(null)
  const [shareTimers, setShareTimers] = useState<ShareTimer[]>([])
  const [isLoadingTimers, setIsLoadingTimers] = useState(false)

  // Initialize Farcaster SDK and get user info
  useEffect(() => {
    const initializeFarcaster = async () => {
      try {
        setIsAuthenticating(true)
        setAuthError(null)

        console.log("🔍 Available miniAppSdk properties:", Object.keys(miniAppSdk))
        console.log("🔍 miniAppSdk.context type:", typeof miniAppSdk.context)

        // Try different approaches to get context
        let context = null

        // Approach 1: Direct context property access (if it's a Promise)
        try {
          if (miniAppSdk.context && typeof miniAppSdk.context.then === "function") {
            context = await miniAppSdk.context
            console.log("✅ Direct context property access successful:", context)
          }
        } catch (error) {
          console.log("❌ Direct context property access failed:", error)
        }

        // Approach 2: Check if context is a function
        if (!context && typeof miniAppSdk.context === "function") {
          try {
            context = await (miniAppSdk.context as any)()
            console.log("✅ Context function call successful:", context)
          } catch (error) {
            console.log("❌ Context function call failed:", error)
          }
        }

        // Approach 3: Check if getContext method exists
        if (!context && "getContext" in miniAppSdk) {
          try {
            context = await (miniAppSdk as any).getContext()
            console.log("✅ getContext call successful:", context)
          } catch (error) {
            console.log("❌ getContext call failed:", error)
          }
        }

        // Approach 4: Check if user property exists directly
        if (!context && "user" in miniAppSdk) {
          try {
            const user = (miniAppSdk as any).user
            if (user) {
              context = { user }
              console.log("✅ Direct user property access successful:", context)
            }
          } catch (error) {
            console.log("❌ Direct user property access failed:", error)
          }
        }

        // Approach 5: Check if we need to wait for ready state
        if (!context && "ready" in miniAppSdk) {
          try {
            await (miniAppSdk as any).ready
            if (miniAppSdk.context) {
              context = await miniAppSdk.context
              console.log("✅ Ready + context successful:", context)
            }
          } catch (error) {
            console.log("❌ Ready + context failed:", error)
          }
        }

        if (context?.user) {
          setFarcasterUser({
            fid: context.user.fid,
            username: context.user.username || `user-${context.user.fid}`,
            displayName: context.user.displayName || context.user.username || `User ${context.user.fid}`,
          })
          console.log("✅ Farcaster user loaded:", context.user)
        } else {
          console.warn("⚠️ No Farcaster user context available")
          console.log("🔍 Full miniAppSdk object:", miniAppSdk)
          setAuthError("No user context available. This app needs to run in a Farcaster frame.")
        }
      } catch (error: any) {
        console.error("❌ Failed to initialize Farcaster SDK:", error)
        setAuthError(error.message || "Failed to initialize Farcaster")
      } finally {
        setIsAuthenticating(false)
      }
    }

    initializeFarcaster()
  }, [])

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
  const myPromotions: PromoCast[] = useMemo(() => {
    return promotions.filter((promo) => {
      // Ensure both values exist and are numbers
      const userFid = farcasterUser?.fid
      const promoFid = promo?.fid

      if (typeof userFid !== "number" || typeof promoFid !== "number") {
        return false
      }

      return promoFid === userFid
    })
  }, [promotions, farcasterUser?.fid])

  // Other promotions (not user's own) - with explicit typing and better error handling
  const otherPromotions: PromoCast[] = useMemo(() => {
    return promotions.filter((promo) => {
      const userFid = farcasterUser?.fid
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
  }, [promotions, farcasterUser?.fid])

  // Debug Farcaster state
  console.log("🔍 Farcaster debug:", {
    farcasterUser,
    isAuthenticating,
    authError,
    myPromotionsCount: myPromotions.length,
    otherPromotionsCount: otherPromotions.length,
    miniAppSdkKeys: Object.keys(miniAppSdk),
  })

  // Fetch share timers
  useEffect(() => {
    const fetchShareTimers = async () => {
      if (!farcasterUser?.fid) return

      setIsLoadingTimers(true)
      try {
        const response = await fetch(`/api/share-timers?fid=${farcasterUser.fid}`)
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
  }, [farcasterUser?.fid])

  // Handle successful payment form completion
  const handlePaymentSuccess = useCallback(() => {
    setShowPaymentForm(false)
    refetchPromotions()
    // Refresh user profile rewards
    userProfileRef.current?.refetchRewards()
  }, [refetchPromotions])

  // Handle successful funding
  const handleFundingSuccess = useCallback(() => {
    setShowFundingForm(false)
    setSelectedPromoForFunding(null)
    refetchPromotions()
    // Refresh user profile rewards
    userProfileRef.current?.refetchRewards()
  }, [refetchPromotions])

  // Handle manage campaign click
  const handleManageCampaign = useCallback((promo: PromoCast) => {
    setSelectedPromoForFunding(promo)
    setShowFundingForm(true)
  }, [])

  // Handle share promotion
  const handleShare = useCallback(
    async (promotion: PromoCast) => {
      if (!farcasterUser?.fid) {
        alert("Please sign in with Farcaster first")
        return
      }

      try {
        const response = await fetch("/api/shares", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            promotionId: promotion.id,
            fid: farcasterUser.fid,
            username: farcasterUser.username,
            displayName: farcasterUser.displayName,
          }),
        })

        if (response.ok) {
          alert("Share recorded successfully! 🎉")
          refetchPromotions()
          // Refresh user profile rewards
          userProfileRef.current?.refetchRewards()

          // Refresh share timers
          const timerResponse = await fetch(`/api/share-timers?fid=${farcasterUser.fid}`)
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
    },
    [farcasterUser, refetchPromotions],
  )

  // Check if user can share a promotion (48-hour cooldown)
  const canShare = useCallback(
    (promotionId: number): boolean => {
      const timer = shareTimers.find((t) => t.promotionId === promotionId)
      return !timer || timer.timeRemaining <= 0
    },
    [shareTimers],
  )

  // Get time remaining for a promotion
  const getTimeRemaining = useCallback(
    (promotionId: number): string => {
      const timer = shareTimers.find((t) => t.promotionId === promotionId)
      if (!timer || timer.timeRemaining <= 0) return ""

      const hours = Math.floor(timer.timeRemaining / 3600)
      const minutes = Math.floor((timer.timeRemaining % 3600) / 60)
      return `${hours}h ${minutes}m`
    },
    [shareTimers],
  )

  // Handle retry authentication
  const handleRetryAuth = useCallback(async () => {
    setAuthError(null)
    setIsAuthenticating(true)

    try {
      // Try direct context property access
      let context = null

      if (miniAppSdk.context && typeof miniAppSdk.context.then === "function") {
        context = await miniAppSdk.context
      }

      if (context?.user) {
        setFarcasterUser({
          fid: context.user.fid,
          username: context.user.username || `user-${context.user.fid}`,
          displayName: context.user.displayName || context.user.username || `User ${context.user.fid}`,
        })
      } else {
        setAuthError("No user context available")
      }
    } catch (error: any) {
      setAuthError(error.message || "Failed to initialize Farcaster")
    } finally {
      setIsAuthenticating(false)
    }
  }, [])

  // Show loading state during authentication
  if (isAuthenticating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a1f2e] to-[#2d1b69] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-white mb-2">Loading Farcaster...</h1>
          <p className="text-gray-400">Initializing your profile</p>
        </div>
      </div>
    )
  }

  // Show error state if authentication failed
  if (authError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a1f2e] to-[#2d1b69] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Authentication Error</h1>
          <p className="text-gray-400 mb-8">Failed to load Farcaster profile</p>
          <p className="text-sm text-red-300 mb-8">{authError}</p>

          {/* Debug info in development */}
          {process.env.NODE_ENV === "development" && (
            <div className="mb-4 p-4 bg-gray-800 rounded-lg text-left text-sm max-w-md mx-auto">
              <p className="text-yellow-400 mb-2">Debug Info:</p>
              <p className="text-gray-300">Available SDK properties:</p>
              <pre className="text-xs text-gray-400 mt-1 overflow-auto max-h-32">
                {JSON.stringify(Object.keys(miniAppSdk), null, 2)}
              </pre>
              <p className="text-gray-300 mt-2">Context type: {typeof miniAppSdk.context}</p>
            </div>
          )}

          <button
            onClick={handleRetryAuth}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Authentication check
  if (!farcasterUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a1f2e] to-[#2d1b69] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Welcome to Farcaster Promotions</h1>
          <p className="text-gray-400 mb-8">This app needs to run inside a Farcaster frame</p>

          {/* Debug info in development */}
          {process.env.NODE_ENV === "development" && (
            <div className="mb-4 p-4 bg-gray-800 rounded-lg text-left text-sm max-w-md mx-auto">
              <p className="text-yellow-400 mb-2">Debug Info:</p>
              <p className="text-gray-300">farcasterUser: {farcasterUser ? "exists" : "null"}</p>
              <p className="text-gray-300">isAuthenticating: {String(isAuthenticating)}</p>
              <p className="text-gray-300">authError: {authError || "null"}</p>
              <p className="text-gray-300">SDK properties: {Object.keys(miniAppSdk).join(", ")}</p>
              <p className="text-gray-300">Context type: {typeof miniAppSdk.context}</p>
            </div>
          )}

          <button
            onClick={handleRetryAuth}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300"
          >
            Retry Loading Profile
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
                fid: farcasterUser.fid,
                username: farcasterUser.username,
                displayName: farcasterUser.displayName,
              }}
            />
          </div>

          {/* Right Column - Campaigns */}
          <div className="lg:col-span-2 space-y-6">
            {/* My Campaigns */}
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
                  fid: farcasterUser.fid,
                  username: farcasterUser.username,
                  displayName: farcasterUser.displayName,
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
