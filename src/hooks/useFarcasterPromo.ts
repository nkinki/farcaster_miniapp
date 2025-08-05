"use client"

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi"
import { CONTRACTS } from "../config/contracts"
import FARCASTER_PROMO_ABI from "../abis/FarcasterPromo.json"

export function useFarcasterPromo() {
  const { address, isConnected } = useAccount()

  // Read pending rewards with campaign details
  const {
    data: pendingRewardsData,
    refetch: refetchPendingRewards,
    isLoading: isPendingRewardsLoading,
  } = useReadContract({
    address: CONTRACTS.FarcasterPromo as `0x${string}`,
    abi: FARCASTER_PROMO_ABI,
    functionName: "getPendingRewards",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected && !!CONTRACTS.FarcasterPromo,
      retry: (failureCount, error) => {
        if (error?.message?.includes("getChainId") || error?.message?.includes("connector")) {
          console.warn("Skipping retry for connector error in pendingRewards:", error.message)
          return false
        }
        return failureCount < 3
      },
    },
  })

  // Parse pending rewards data
  const totalPendingRewards = pendingRewardsData ? (pendingRewardsData as [bigint, bigint[]])[0] : BigInt(0)
  const claimableCampaignIds = pendingRewardsData ? (pendingRewardsData as [bigint, bigint[]])[1] : []

  // Write functions for different claim methods
  const {
    data: claimAllHash,
    writeContract: writeClaimAll,
    isPending: isClaimingAll,
    error: claimAllError,
    reset: resetClaimAll,
  } = useWriteContract()

  const {
    data: claimBatchHash,
    writeContract: writeClaimBatch,
    isPending: isClaimingBatch,
    error: claimBatchError,
    reset: resetClaimBatch,
  } = useWriteContract()

  const {
    data: claimSingleHash,
    writeContract: writeClaimSingle,
    isPending: isClaimingSingle,
    error: claimSingleError,
    reset: resetClaimSingle,
  } = useWriteContract()

  // Wait for transactions
  const { isSuccess: isClaimAllSuccess } = useWaitForTransactionReceipt({ hash: claimAllHash })
  const { isSuccess: isClaimBatchSuccess } = useWaitForTransactionReceipt({ hash: claimBatchHash })
  const { isSuccess: isClaimSingleSuccess } = useWaitForTransactionReceipt({ hash: claimSingleHash })

  // Claim all rewards (limited to 15 campaigns)
  const claimAllRewards = () => {
    console.log("🎯 Claiming all rewards for", claimableCampaignIds.length, "campaigns")

    if (!address || !isConnected) {
      throw new Error("Wallet not connected")
    }

    if (claimableCampaignIds.length > 15) {
      throw new Error("Too many campaigns (>15). Please use batch claim instead.")
    }

    resetClaimAll()

    return writeClaimAll({
      address: CONTRACTS.FarcasterPromo as `0x${string}`,
      abi: FARCASTER_PROMO_ABI,
      functionName: "claimAllRewards",
    })
  }

  // Claim rewards in batches
  const claimRewardsBatch = (campaignIds: bigint[]) => {
    console.log(
      "🎯 Claiming batch rewards for campaigns:",
      campaignIds.map((id) => id.toString()),
    )

    if (!address || !isConnected) {
      throw new Error("Wallet not connected")
    }

    if (campaignIds.length === 0) {
      throw new Error("No campaigns selected")
    }

    if (campaignIds.length > 10) {
      throw new Error("Too many campaigns in batch (max 10)")
    }

    resetClaimBatch()

    return writeClaimBatch({
      address: CONTRACTS.FarcasterPromo as `0x${string}`,
      abi: FARCASTER_PROMO_ABI,
      functionName: "claimRewardsBatch",
      args: [campaignIds],
    })
  }

  // Claim single campaign reward
  const claimSingleReward = (campaignId: bigint) => {
    console.log("🎯 Claiming single reward for campaign:", campaignId.toString())

    if (!address || !isConnected) {
      throw new Error("Wallet not connected")
    }

    resetClaimSingle()

    return writeClaimSingle({
      address: CONTRACTS.FarcasterPromo as `0x${string}`,
      abi: FARCASTER_PROMO_ABI,
      functionName: "claimReward",
      args: [campaignId],
    })
  }

  console.log("🎯 useFarcasterPromo debug:", {
    totalPendingRewards: totalPendingRewards.toString(),
    campaignCount: claimableCampaignIds.length,
    claimableCampaignIds: claimableCampaignIds.map((id) => id.toString()),
    address,
    isConnected,
  })

  return {
    // Read data
    totalPendingRewards,
    claimableCampaignIds,
    isPendingRewardsLoading,

    // Write functions
    claimAllRewards,
    claimRewardsBatch,
    claimSingleReward,

    // Loading states
    isClaimingAll,
    isClaimingBatch,
    isClaimingSingle,

    // Success states
    isClaimAllSuccess,
    isClaimBatchSuccess,
    isClaimSingleSuccess,

    // Errors
    claimAllError,
    claimBatchError,
    claimSingleError,

    // Transaction hashes
    claimAllHash,
    claimBatchHash,
    claimSingleHash,

    // Reset functions
    resetClaimAll,
    resetClaimBatch,
    resetClaimSingle,

    // Refetch function
    refetchPendingRewards,
  }
}
