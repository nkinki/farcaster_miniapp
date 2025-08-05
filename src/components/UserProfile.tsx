"use client"

import { useState, useEffect } from "react"
import { useAccount } from "wagmi"
import { useFarcasterPromo } from "@/hooks/useFarcasterPromo"
import { useChessToken } from "@/hooks/useChessToken"
import { FiUser, FiDollarSign, FiTrendingUp, FiAlertTriangle, FiCheck, FiX } from "react-icons/fi"

interface FarcasterUser {
  fid: number
  username: string
  displayName: string
}

interface UserProfileProps {
  user: FarcasterUser
}

type ClaimMode = "auto" | "batch" | "single"

export default function UserProfile({ user }: UserProfileProps) {
  const { address } = useAccount()
  const { balance, formatChessAmount } = useChessToken()

  const {
    totalPendingRewards,
    claimableCampaignIds,
    isPendingRewardsLoading,
    claimAllRewards,
    claimRewardsBatch,
    claimSingleReward,
    isClaimingAll,
    isClaimingBatch,
    isClaimingSingle,
    isClaimAllSuccess,
    isClaimBatchSuccess,
    isClaimSingleSuccess,
    claimAllError,
    claimBatchError,
    claimSingleError,
    refetchPendingRewards,
  } = useFarcasterPromo()

  const [claimMode, setClaimMode] = useState<ClaimMode>("auto")
  const [selectedCampaigns, setSelectedCampaigns] = useState<bigint[]>([])
  const [showClaimOptions, setShowClaimOptions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const campaignCount = claimableCampaignIds.length
  const hasPendingRewards = totalPendingRewards > 0
  const canClaimAll = campaignCount > 0 && campaignCount <= 15
  const needsBatchClaim = campaignCount > 15

  // Auto-select claim mode based on campaign count
  useEffect(() => {
    if (campaignCount <= 15) {
      setClaimMode("auto")
    } else {
      setClaimMode("batch")
      setShowClaimOptions(true)
    }
  }, [campaignCount])

  // Handle successful claims
  useEffect(() => {
    if (isClaimAllSuccess || isClaimBatchSuccess || isClaimSingleSuccess) {
      setSuccess("Rewards claimed successfully! 🎉")
      setError(null)
      setSelectedCampaigns([])
      refetchPendingRewards()

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000)
    }
  }, [isClaimAllSuccess, isClaimBatchSuccess, isClaimSingleSuccess, refetchPendingRewards])

  // Handle errors
  useEffect(() => {
    const currentError = claimAllError || claimBatchError || claimSingleError
    if (currentError) {
      setError(currentError.message || "Transaction failed")
      setSuccess(null)
    }
  }, [claimAllError, claimBatchError, claimSingleError])

  const handleClaimAll = async () => {
    try {
      setError(null)
      await claimAllRewards()
    } catch (err: any) {
      setError(err.message || "Failed to claim rewards")
    }
  }

  const handleBatchClaim = async () => {
    if (selectedCampaigns.length === 0) {
      setError("Please select at least one campaign")
      return
    }

    try {
      setError(null)
      await claimRewardsBatch(selectedCampaigns)
    } catch (err: any) {
      setError(err.message || "Failed to claim batch rewards")
    }
  }

  const handleSingleClaim = async (campaignId: bigint) => {
    try {
      setError(null)
      await claimSingleReward(campaignId)
    } catch (err: any) {
      setError(err.message || "Failed to claim reward")
    }
  }

  const toggleCampaignSelection = (campaignId: bigint) => {
    setSelectedCampaigns((prev) => {
      const isSelected = prev.some((id) => id === campaignId)
      if (isSelected) {
        return prev.filter((id) => id !== campaignId)
      } else {
        if (prev.length >= 10) {
          setError("Maximum 10 campaigns can be selected for batch claim")
          return prev
        }
        return [...prev, campaignId]
      }
    })
  }

  const selectAllCampaigns = () => {
    const maxSelection = Math.min(claimableCampaignIds.length, 10)
    setSelectedCampaigns(claimableCampaignIds.slice(0, maxSelection))
  }

  const clearSelection = () => {
    setSelectedCampaigns([])
  }

  const isProcessing = isClaimingAll || isClaimingBatch || isClaimingSingle

  return (
    <div className="bg-[#23283a] rounded-2xl p-6 border border-[#a64d79]">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
          <FiUser className="text-white text-xl" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{user.displayName}</h2>
          <p className="text-gray-400">
            @{user.username} • FID: {user.fid}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#181c23] p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FiDollarSign className="text-green-400" />
            <span className="text-sm text-gray-400">CHESS Balance</span>
          </div>
          <p className="text-lg font-bold text-white">{formatChessAmount(balance)}</p>
        </div>

        <div className="bg-[#181c23] p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FiTrendingUp className="text-purple-400" />
            <span className="text-sm text-gray-400">Pending Rewards</span>
          </div>
          <p className="text-lg font-bold text-white">
            {isPendingRewardsLoading ? "Loading..." : formatChessAmount(totalPendingRewards)}
          </p>
          {campaignCount > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              From {campaignCount} campaign{campaignCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {/* Claim Section */}
      {hasPendingRewards && (
        <div className="space-y-4">
          {/* Gas Warning for Many Campaigns */}
          {needsBatchClaim && (
            <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FiAlertTriangle className="text-yellow-400" />
                <span className="text-yellow-400 font-semibold">High Gas Cost Warning</span>
              </div>
              <p className="text-sm text-yellow-200">
                You have {campaignCount} campaigns with pending rewards. Claiming all at once would be very expensive.
                Please use batch claim (max 10 at a time) or individual claims.
              </p>
            </div>
          )}

          {/* Claim Mode Selection */}
          {needsBatchClaim && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setClaimMode("batch")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  claimMode === "batch" ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Batch Claim (Recommended)
              </button>
              <button
                onClick={() => setClaimMode("single")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  claimMode === "single" ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Individual Claims
              </button>
            </div>
          )}

          {/* Auto Claim (for ≤15 campaigns) */}
          {canClaimAll && claimMode === "auto" && (
            <button
              onClick={handleClaimAll}
              disabled={isProcessing || !address}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClaimingAll ? "Claiming All Rewards..." : `Claim All Rewards (${campaignCount} campaigns)`}
            </button>
          )}

          {/* Batch Claim Mode */}
          {claimMode === "batch" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-white font-medium">Select campaigns to claim (max 10):</span>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllCampaigns}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                  >
                    Select 10
                  </button>
                  <button
                    onClick={clearSelection}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-2">
                {claimableCampaignIds.map((campaignId, index) => (
                  <div
                    key={campaignId.toString()}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedCampaigns.some((id) => id === campaignId)
                        ? "bg-purple-600/30 border border-purple-500"
                        : "bg-[#181c23] hover:bg-gray-700"
                    }`}
                    onClick={() => toggleCampaignSelection(campaignId)}
                  >
                    <span className="text-white">Campaign #{campaignId.toString()}</span>
                    <div className="flex items-center gap-2">
                      {selectedCampaigns.some((id) => id === campaignId) ? (
                        <FiCheck className="text-green-400" />
                      ) : (
                        <div className="w-4 h-4 border border-gray-400 rounded"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleBatchClaim}
                disabled={isProcessing || selectedCampaigns.length === 0 || !address}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClaimingBatch
                  ? "Claiming Selected Rewards..."
                  : `Claim Selected Rewards (${selectedCampaigns.length})`}
              </button>
            </div>
          )}

          {/* Single Claim Mode */}
          {claimMode === "single" && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {claimableCampaignIds.map((campaignId) => (
                <div
                  key={campaignId.toString()}
                  className="flex items-center justify-between p-3 bg-[#181c23] rounded-lg"
                >
                  <span className="text-white">Campaign #{campaignId.toString()}</span>
                  <button
                    onClick={() => handleSingleClaim(campaignId)}
                    disabled={isProcessing || !address}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded transition-colors disabled:opacity-50"
                  >
                    {isClaimingSingle ? "Claiming..." : "Claim"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Status Messages */}
      {error && (
        <div className="mt-4 p-3 bg-red-900/50 border border-red-600 rounded-lg flex items-center gap-2">
          <FiX className="text-red-400" />
          <span className="text-red-200 text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-900/50 border border-green-600 rounded-lg flex items-center gap-2">
          <FiCheck className="text-green-400" />
          <span className="text-green-200 text-sm">{success}</span>
        </div>
      )}

      {/* No Rewards Message */}
      {!hasPendingRewards && !isPendingRewardsLoading && (
        <div className="text-center py-8">
          <p className="text-gray-400">No pending rewards to claim</p>
          <p className="text-sm text-gray-500 mt-1">Share some promotions to earn rewards!</p>
        </div>
      )}
    </div>
  )
}
