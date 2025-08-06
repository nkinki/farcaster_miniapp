"use client"

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi"

// JAVÍTÁS: A hibás és inkonzisztens importokat lecseréljük a helyes, központi ABI fájlra.
import { PROMO_CONTRACT_ADDRESS, PROMO_CONTRACT_ABI } from "@/abis/farcasterPromo";

export function useFarcasterPromo() {
  const { address, isConnected } = useAccount()

  // Read pending rewards with campaign details
  const {
    data: pendingRewardsData,
    refetch: refetchPendingRewards,
    isLoading: isPendingRewardsLoading,
  } = useReadContract({
    address: PROMO_CONTRACT_ADDRESS, // JAVÍTÁS: A helyes, importált változót használjuk
    abi: PROMO_CONTRACT_ABI,         // JAVÍTÁS: A helyes, importált változót használjuk
    functionName: "getPendingRewards",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
      staleTime: 0,
    },
  })

  // Parse pending rewards data
  const totalPendingRewards = pendingRewardsData ? (pendingRewardsData as [bigint, bigint[]])[0] : BigInt(0)
  const claimableCampaignIds = pendingRewardsData ? (pendingRewardsData as [bigint, bigint[]])[1] : []

  // Write functions for different claim methods
  const {
    data: claimAllHash,
    writeContractAsync: writeClaimAll,
    isPending: isClaimingAll,
    error: claimAllError,
    reset: resetClaimAll,
  } = useWriteContract()

  const {
    data: claimBatchHash,
    writeContractAsync: writeClaimBatch,
    isPending: isClaimingBatch,
    error: claimBatchError,
    reset: resetClaimBatch,
  } = useWriteContract()

  // ... (a single claim hook-ot is hozzáadhatnánk, ha szükséges)

  // Wait for transactions
  const { isSuccess: isClaimAllSuccess } = useWaitForTransactionReceipt({ hash: claimAllHash })
  const { isSuccess: isClaimBatchSuccess } = useWaitForTransactionReceipt({ hash: claimBatchHash })

  // Claim all rewards (limited to 15 campaigns for gas safety)
  const claimAllRewards = async () => {
    if (!address || !isConnected) throw new Error("Wallet not connected")
    if (claimableCampaignIds.length > 15) throw new Error("Too many campaigns (>15). Please use batch claim instead.")
    if (claimableCampaignIds.length === 0) throw new Error("No rewards to claim.")

    resetClaimAll()
    return await writeClaimAll({
      address: PROMO_CONTRACT_ADDRESS,
      abi: PROMO_CONTRACT_ABI,
      functionName: "claimRewardsForCampaigns", // FONTOS: Ezt a gázhatékony függvényt hívjuk
      args: [claimableCampaignIds],
    })
  }

  // Claim rewards in batches
  const claimRewardsBatch = async (campaignIds: bigint[]) => {
    if (!address || !isConnected) throw new Error("Wallet not connected")
    if (campaignIds.length === 0) throw new Error("No campaigns selected")
    if (campaignIds.length > 15) throw new Error("Batch size is too large (max 15)")

    resetClaimBatch()
    return await writeClaimBatch({
      address: PROMO_CONTRACT_ADDRESS,
      abi: PROMO_CONTRACT_ABI,
      functionName: "claimRewardsForCampaigns", // FONTOS: A smart contractban is ez legyen a neve
      args: [campaignIds],
    })
  }

  // ... (claimSingleReward implementációja, ha szükséges)

  return {
    // Read data
    totalPendingRewards,
    claimableCampaignIds,
    isPendingRewardsLoading,

    // Write functions
    claimAllRewards,
    claimRewardsBatch,
    
    // Loading states
    isClaimingAll,
    isClaimingBatch,

    // Success states
    isClaimAllSuccess,
    isClaimBatchSuccess,

    // Errors
    claimAllError,
    claimBatchError,

    // Refetch function
    refetchPendingRewards,
  }
}