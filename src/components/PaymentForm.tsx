"use client"

import { useState, useEffect } from "react"
import { FiAlertCircle } from "react-icons/fi"
import { useFarcasterPromo, useCampaignExists } from "../hooks/useFarcasterPromo"
import { useChessToken } from "../hooks/useChessToken"
import { usePromotion } from "../hooks/usePromotions"
import { useAccount } from "wagmi"
import { CONTRACTS } from "../config/contracts"

// TypeScript declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>
    }
  }
}

interface PaymentFormProps {
  promotionId: string
  onPaymentComplete: (amount: number, hash: string) => void
  onCancel: () => void
  // New props for new campaign creation
  newCampaignData?: {
    castUrl: string
    shareText: string
    rewardPerShare: number
    totalBudget: number
    user: {
      fid: number
      username: string
      displayName: string
    }
  }
}

export default function PaymentForm({ promotionId, onPaymentComplete, onCancel, newCampaignData }: PaymentFormProps) {
  const [rewardPerShare, setRewardPerShare] = useState<number>(newCampaignData?.rewardPerShare || 10000) // Default 10k
  const [error, setError] = useState<string>("")
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false)
  const [isSavingToDb, setIsSavingToDb] = useState(false)
  const [campaignCreated, setCampaignCreated] = useState(false)

  // Wagmi hooks
  const { address, isConnected } = useAccount()
  const {
    fundCampaign,
    isFundingCampaign,
    fundCampaignHash,
    createCampaign,
    isCreatingCampaign: isCreatingCampaignFromHook,
    createCampaignHash: createCampaignData,
  } = useFarcasterPromo()
  const {
    balance,
    allowance,
    approve,
    isApproving,
    needsApproval,
    isApproveSuccess,
    approveError,
    balanceError,
    allowanceError,
    balanceLoading,
    allowanceLoading,
    approveFarcasterPromo,
  } = useChessToken()

  // Debug logging for PaymentForm
  console.log("🎯 PaymentForm Debug:", {
    address,
    isConnected,
    balance: balance?.toString(),
    allowance: allowance?.toString(),
    balanceError: balanceError?.message,
    allowanceError: allowanceError?.message,
    balanceLoading,
    allowanceLoading,
    isApproving,
    isApproveSuccess,
    approveError: approveError?.message,
    userAgent: navigator.userAgent,
    isFarcasterApp: navigator.userAgent.includes("Farcaster") || window.location.hostname.includes("farcaster"),
  })

  // Neon DB promotion data (only for existing campaigns)
  const {
    promotion,
    loading: promotionLoading,
    error: promotionError,
  } = usePromotion(promotionId === "new" ? undefined : Number(promotionId))

  // Blockchain campaign check (for compatibility)
  const {
    exists: campaignExists,
    campaign: blockchainCampaign,
    error: campaignError,
    isLoading: campaignLoading,
  } = useCampaignExists(promotionId === "new" ? undefined : BigInt(promotionId))

  // Add timeout for loading state
  const [loadingTimeout, setLoadingTimeout] = useState(false)

  useEffect(() => {
    if (campaignLoading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true)
      }, 10000) // 10 seconds timeout

      return () => clearTimeout(timer)
    } else {
      setLoadingTimeout(false)
    }
  }, [campaignLoading])

  const handleRewardPerShareChange = (value: number) => {
    setRewardPerShare(value)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`
    return num.toString()
  }

  const handleCreateCampaign = async () => {
    if (!isConnected) {
      setError("Please connect your wallet first")
      return
    }

    // For new campaigns, validate newCampaignData
    if (promotionId === "new") {
      if (!newCampaignData) {
        setError("New campaign data is missing")
        return
      }
    } else {
      // For existing campaigns, validate promotion
      if (!promotion) {
        setError(`Promotion ${promotionId} does not exist in database`)
        return
      }

      if (promotion.status !== "active") {
        setError(`Promotion ${promotionId} is not active (status: ${promotion.status})`)
        return
      }
    }

    // Check minimum values
    const rewardPerShareValue = promotionId === "new" ? newCampaignData?.rewardPerShare || 0 : rewardPerShare
    const totalBudgetValue = promotionId === "new" ? newCampaignData?.totalBudget || 0 : promotion?.total_budget || 0

    if (rewardPerShareValue <= 0) {
      setError("Reward per share must be greater than 0")
      return
    }

    if (totalBudgetValue <= 0) {
      setError("Total budget must be greater than 0")
      return
    }

    if (rewardPerShareValue > totalBudgetValue) {
      setError("Reward per share cannot be greater than total budget")
      return
    }

    setError("")

    try {
      setIsCreatingCampaign(true)

      const campaignData = promotionId === "new" ? newCampaignData! : promotion!
      console.log("Creating blockchain campaign for:", campaignData)

      // Use the improved createCampaign function with proper parameters
      if (promotionId === "new" && newCampaignData) {
        createCampaign({
          castUrl: newCampaignData.castUrl.startsWith("http")
            ? newCampaignData.castUrl
            : `https://warpcast.com/~/conversations/${newCampaignData.castUrl}`,
          shareText: newCampaignData.shareText || "Share this promotion!",
          rewardPerShare: BigInt(newCampaignData.rewardPerShare) * BigInt(10 ** 18),
          totalBudget: BigInt(newCampaignData.totalBudget) * BigInt(10 ** 18),
          divisible: true,
        })
      } else if (promotion) {
        createCampaign({
          castUrl: promotion.cast_url.startsWith("http")
            ? promotion.cast_url
            : `https://warpcast.com/~/conversations/${promotion.cast_url}`,
          shareText: promotion.share_text || "Share this promotion!",
          rewardPerShare: BigInt(rewardPerShare) * BigInt(10 ** 18),
          totalBudget: BigInt(promotion.total_budget) * BigInt(10 ** 18),
          divisible: true,
        })
      }
    } catch (err) {
      console.error("Error creating blockchain campaign:", err)
      setError(err instanceof Error ? err.message : "Failed to create campaign")
      setIsCreatingCampaign(false)
    }
  }

  // Handle successful campaign creation
  useEffect(() => {
    if (createCampaignData) {
      console.log("Campaign created successfully on blockchain:", createCampaignData)

      // If this is a new campaign, save to Neon DB
      if (promotionId === "new" && newCampaignData) {
        saveNewCampaignToDb(createCampaignData)
      } else {
        setIsCreatingCampaign(false)
        // Don't reload, just show success message
        console.log("Campaign created successfully!")
        setCampaignCreated(true)
      }
    }
  }, [createCampaignData, promotionId, newCampaignData])

  // Handle approval success
  useEffect(() => {
    if (isApproveSuccess) {
      console.log("CHESS token approval successful!")
      // Don't reload, just show success message
      console.log("✅ CHESS approval completed successfully!")
    }
  }, [isApproveSuccess])

  // Handle approval error
  useEffect(() => {
    if (approveError) {
      console.error("CHESS token approval failed:", approveError)
      setError(`Approval failed: ${approveError.message}`)
    }
  }, [approveError])

  // Save new campaign to Neon DB after successful blockchain creation
  const saveNewCampaignToDb = async (blockchainHash: string) => {
    if (!newCampaignData) return

    try {
      setIsSavingToDb(true)
      console.log("Saving new campaign to Neon DB:", newCampaignData)

      const response = await fetch("/api/promotions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fid: newCampaignData.user.fid,
          username: newCampaignData.user.username,
          displayName: newCampaignData.user.displayName,
          castUrl: newCampaignData.castUrl,
          shareText: newCampaignData.shareText || undefined,
          rewardPerShare: newCampaignData.rewardPerShare,
          totalBudget: newCampaignData.totalBudget,
          blockchainHash: blockchainHash, // Store the blockchain transaction hash
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Campaign saved to Neon DB successfully:", data)

        // Call onPaymentComplete with the blockchain hash
        onPaymentComplete(newCampaignData.totalBudget, blockchainHash)

        // Reset form
        setIsCreatingCampaign(false)
        setIsSavingToDb(false)

        // Show success message instead of reloading
        console.log("🎉 Campaign created and saved successfully!")
        console.log("📋 Campaign details:", {
          blockchainHash,
          totalBudget: newCampaignData.totalBudget,
          castUrl: newCampaignData.castUrl,
        })

        // Set campaign created flag
        setCampaignCreated(true)
      } else {
        const errorData = await response.json()
        console.error("Failed to save to Neon DB:", errorData)
        setError(`Campaign created on blockchain but failed to save to database: ${errorData.error || "Unknown error"}`)
        setIsCreatingCampaign(false)
        setIsSavingToDb(false)
      }
    } catch (error) {
      console.error("Error saving to Neon DB:", error)
      setError(
        `Campaign created on blockchain but failed to save to database: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
      setIsCreatingCampaign(false)
      setIsSavingToDb(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4">
        {/* Wallet Status */}
        <div className="mb-4 p-3 bg-gray-800 rounded-lg text-sm">
          <p>
            <strong>Wallet Status:</strong>
          </p>
          <p>Connected: {isConnected ? "Yes" : "No"}</p>
          <p>
            Address:{" "}
            {address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : "Not connected"}
          </p>
          <p>
            Contract: {CONTRACTS.FarcasterPromo.substring(0, 6)}...
            {CONTRACTS.FarcasterPromo.substring(CONTRACTS.FarcasterPromo.length - 4)}
          </p>
        </div>

        {/* Debug Panel */}
        <div className="mt-3 p-2 bg-red-900 bg-opacity-50 rounded border border-red-500">
          <p className="text-red-300 font-bold text-xs">🔧 DEBUG INFO:</p>
          <p className="text-red-200 text-xs">
            Balance:{" "}
            {balanceLoading
              ? "Loading..."
              : balanceError
                ? `Error: ${balanceError.message}`
                : balance
                  ? `${(Number(balance) / 1e18).toFixed(2)} CHESS`
                  : "0 CHESS"}
          </p>
          <p className="text-red-200 text-xs">
            Allowance:{" "}
            {allowanceLoading
              ? "Loading..."
              : allowanceError
                ? `Error: ${allowanceError.message}`
                : allowance
                  ? `${(Number(allowance) / 1e18).toFixed(2)} CHESS`
                  : "0 CHESS"}
          </p>
          <p className="text-red-200 text-xs">
            Needs Approval: {needsApproval(BigInt(10000) * BigInt(10 ** 18)) ? "Yes" : "No"}
          </p>
          <p className="text-red-200 text-xs">
            CHESS Token: {CONTRACTS.CHESS_TOKEN.substring(0, 6)}...
            {CONTRACTS.CHESS_TOKEN.substring(CONTRACTS.CHESS_TOKEN.length - 4)}
          </p>
          <p className="text-red-200 text-xs">Approving: {isApproving ? "Yes" : "No"}</p>
          <p className="text-red-200 text-xs">Approve Success: {isApproveSuccess ? "Yes" : "No"}</p>
          {approveError && <p className="text-red-400 text-xs">Approve Error: {approveError.message}</p>}

          <button
            onClick={() => {
              console.log("🚀 FORCE APPROVE TEST")
              approveFarcasterPromo(BigInt(10000) * BigInt(10 ** 18))
            }}
            disabled={isApproving}
            className="mt-2 px-2 py-1 bg-green-700 hover:bg-green-600 text-white text-xs rounded"
          >
            🚀 Force Approve 10K CHESS
          </button>
        </div>

        {/* Campaign Creation Form */}
        {promotionId === "new" && newCampaignData && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Create New Campaign</h3>

            {/* Campaign Summary */}
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Campaign Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Cast URL:</span>
                  <span className="text-white truncate max-w-[200px]">{newCampaignData.castUrl}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Share Text:</span>
                  <span className="text-white">"{newCampaignData.shareText || "Share this promotion!"}"</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Reward Per Share:</span>
                  <span className="text-green-400">{formatNumber(newCampaignData.rewardPerShare)} $CHESS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Budget:</span>
                  <span className="text-blue-400">{formatNumber(newCampaignData.totalBudget)} $CHESS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Divisible:</span>
                  <span className="text-green-400">Yes ✓</span>
                </div>
              </div>
            </div>

            {/* Create Campaign Button */}
            <button
              onClick={handleCreateCampaign}
              disabled={isCreatingCampaign || isCreatingCampaignFromHook || isSavingToDb}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {isCreatingCampaign || isCreatingCampaignFromHook
                ? "Creating Campaign..."
                : isSavingToDb
                  ? "Saving to Database..."
                  : "Create New Campaign"}
            </button>

            {/* Note about CHESS funding */}
            <div className="mt-4 p-3 bg-blue-900 bg-opacity-20 rounded-lg">
              <p className="text-xs text-blue-400">
                <strong>Note:</strong> Campaign creation is free. CHESS token funding will be available after campaign
                creation.
              </p>
            </div>
          </div>
        )}

        {/* Success Messages */}
        {isApproveSuccess && (
          <div className="flex items-center gap-2 text-green-400 mb-4 p-3 bg-green-900 bg-opacity-20 rounded-lg">
            <span className="text-lg">✅</span>
            <span className="text-sm">CHESS token approved successfully!</span>
          </div>
        )}

        {campaignCreated && (
          <div className="flex items-center gap-2 text-green-400 mb-4 p-3 bg-green-900 bg-opacity-20 rounded-lg">
            <span className="text-lg">🎉</span>
            <span className="text-sm">Campaign created successfully on blockchain and saved to database!</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 mb-4 p-3 bg-red-900 bg-opacity-20 rounded-lg">
            <FiAlertCircle />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>

          {/* Approval Button for Funding */}
          {needsApproval(BigInt(10000) * BigInt(10 ** 18)) && (
            <button
              onClick={() => {
                console.log("🎯 Approve button clicked")
                console.log("📋 Approve parameters:", {
                  spender: CONTRACTS.FarcasterPromo,
                  amount: (BigInt(10000) * BigInt(10 ** 18)).toString(),
                })

                // Use the correct function signature
                approveFarcasterPromo(BigInt(10000) * BigInt(10 ** 18))
              }}
              disabled={isApproving}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {isApproving ? "Approving..." : "Approve CHESS"}
            </button>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-4 p-3 bg-yellow-900 bg-opacity-20 rounded-lg">
          <p className="text-xs text-yellow-400">
            <strong>Security Notice:</strong> This transaction creates a campaign on the blockchain. Make sure all
            details are correct before proceeding.
          </p>
        </div>
      </div>
    </div>
  )
}
