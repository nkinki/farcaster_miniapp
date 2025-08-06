"use client"

import { useState, useEffect, useImperativeHandle, forwardRef } from "react"
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

export interface UserProfileRef {
  refetchRewards: () => void;
}

type ClaimMode = "auto" | "batch"; // JAVÍTÁS: A 'single' módot eltávolítottuk

const UserProfile = forwardRef<UserProfileRef, UserProfileProps>(({ user }, ref) => {
  const { address } = useAccount()
  const { balance, formatChessAmount } = useChessToken()

  // JAVÍTÁS: A nem létező változókat eltávolítottuk a destrukturálásból
  const {
    totalPendingRewards,
    claimableCampaignIds,
    isPendingRewardsLoading,
    claimAllRewards,
    claimRewardsBatch,
    isClaimingAll,
    isClaimingBatch,
    isClaimAllSuccess,
    isClaimBatchSuccess,
    claimAllError,
    claimBatchError,
    refetchPendingRewards,
  } = useFarcasterPromo()

  const [claimMode, setClaimMode] = useState<ClaimMode>("auto")
  const [selectedCampaigns, setSelectedCampaigns] = useState<bigint[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const campaignCount = claimableCampaignIds.length
  const hasPendingRewards = totalPendingRewards > 0
  const canClaimAll = campaignCount > 0 && campaignCount <= 15
  const needsBatchClaim = campaignCount > 15

  useEffect(() => {
    if (campaignCount <= 15) {
      setClaimMode("auto")
    } else {
      setClaimMode("batch")
    }
  }, [campaignCount])

  useEffect(() => {
    // JAVÍTÁS: A 'single' sikert eltávolítottuk
    if (isClaimAllSuccess || isClaimBatchSuccess) {
      setSuccess("Rewards claimed successfully! 🎉")
      setError(null)
      setSelectedCampaigns([])
      refetchPendingRewards()
      setTimeout(() => setSuccess(null), 5000)
    }
  }, [isClaimAllSuccess, isClaimBatchSuccess, refetchPendingRewards])

  useEffect(() => {
    // JAVÍTÁS: A 'single' hibát eltávolítottuk
    const currentError = claimAllError || claimBatchError
    if (currentError) {
      setError(currentError.message || "Transaction failed")
      setSuccess(null)
    }
  }, [claimAllError, claimBatchError])

  const handleClaimAll = async () => {
    setError(null)
    try {
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
    setError(null)
    try {
      await claimRewardsBatch(selectedCampaigns)
    } catch (err: any) {
      setError(err.message || "Failed to claim batch rewards")
    }
  }

  const toggleCampaignSelection = (campaignId: bigint) => {
    setSelectedCampaigns((prev) => {
      if (prev.includes(campaignId)) {
        return prev.filter((id) => id !== campaignId)
      } else {
        if (prev.length >= 15) {
          setError("Maximum 15 campaigns can be selected for a batch claim.")
          return prev
        }
        return [...prev, campaignId]
      }
    })
  }

  const selectAllCampaigns = () => {
    const maxSelection = Math.min(claimableCampaignIds.length, 15)
    setSelectedCampaigns(claimableCampaignIds.slice(0, maxSelection))
  }

  const clearSelection = () => {
    setSelectedCampaigns([])
  }

  // JAVÍTÁS: A 'single' állapotot eltávolítottuk
  const isProcessing = isClaimingAll || isClaimingBatch

  useImperativeHandle(ref, () => ({
      refetchRewards: () => {
        refetchPendingRewards()
      },
    }), [refetchPendingRewards]
  )

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

      {hasPendingRewards && (
        <div className="space-y-4">
          {needsBatchClaim && (
            <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-4 text-sm text-yellow-200">
              <FiAlertTriangle className="inline-block mr-2 text-yellow-400" />
              You have rewards from {campaignCount} campaigns. To avoid high gas fees, please claim them in batches.
            </div>
          )}

          {canClaimAll && claimMode === "auto" && (
            <button
              onClick={handleClaimAll}
              disabled={isProcessing || !address}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClaimingAll ? "Claiming All Rewards..." : `Claim All Rewards (${campaignCount} campaigns)`}
            </button>
          )}

          {claimMode === "batch" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-white font-medium">Select campaigns (max 15):</span>
                <div className="flex gap-2">
                  <button onClick={selectAllCampaigns} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded">Select 15</button>
                  <button onClick={clearSelection} className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded">Clear</button>
                </div>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-2 p-1">
                {claimableCampaignIds.map((campaignId) => (
                  <div
                    key={campaignId.toString()}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${selectedCampaigns.includes(campaignId) ? "bg-purple-600/30 border border-purple-500" : "bg-[#181c23] hover:bg-gray-700"}`}
                    onClick={() => toggleCampaignSelection(campaignId)}
                  >
                    <span className="text-white">Campaign #{campaignId.toString()}</span>
                    {selectedCampaigns.includes(campaignId) && <FiCheck className="text-green-400" />}
                  </div>
                ))}
              </div>

              <button
                onClick={handleBatchClaim}
                disabled={isProcessing || selectedCampaigns.length === 0 || !address}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClaimingBatch ? "Claiming Batch..." : `Claim Selected (${selectedCampaigns.length})`}
              </button>
            </div>
          )}
        </div>
      )}

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

      {!hasPendingRewards && !isPendingRewardsLoading && (
        <div className="text-center py-4">
          <p className="text-gray-400">No pending rewards to claim.</p>
        </div>
      )}
    </div>
  )
})

UserProfile.displayName = "UserProfile"

export default UserProfile