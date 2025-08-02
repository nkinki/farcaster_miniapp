"use client"

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi"
import { CONTRACTS } from "../config/contracts" // Helyes útvonal
import FARCASTER_PROMO_ABI from "../abis/FarcasterPromo.json" // Helyes útvonal

export function useFarcasterPromo() {
  const { address, isConnected } = useAccount()

  // Read functions
  const { data: totalCampaigns, refetch: refetchTotalCampaigns } = useReadContract({
    address: CONTRACTS.FarcasterPromo as `0x${string}`,
    abi: FARCASTER_PROMO_ABI,
    functionName: "getTotalCampaigns",
    query: {
      enabled: !!CONTRACTS.FarcasterPromo,
    },
  })

  const { data: claimableAmount, refetch: refetchClaimableAmount } = useReadContract({
    address: CONTRACTS.FarcasterPromo as `0x${string}`,
    abi: FARCASTER_PROMO_ABI,
    functionName: "getClaimableAmount",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected && !!CONTRACTS.FarcasterPromo,
    },
  })

  // Debug logging
  console.log("🎯 useFarcasterPromo debug:", {
    totalCampaigns: totalCampaigns?.toString(),
    claimableAmount: claimableAmount?.toString(),
    address,
    isConnected,
    contractAddress: CONTRACTS.FarcasterPromo,
  })

  // Write functions for campaign creation
  const {
    data: createCampaignHash,
    writeContract: writeCreateCampaign,
    isPending: isCreatingCampaign,
    error: createCampaignError, // <-- EZT HOZZÁADVA
    reset: resetCreateCampaign,
  } = useWriteContract()

  // Wait for campaign creation transaction
  const {
    isLoading: isCreateCampaignConfirming,
    isSuccess: isCreateCampaignSuccess,
    error: createCampaignReceiptError, // <-- EZT HOZZÁADVA
  } = useWaitForTransactionReceipt({
    hash: createCampaignHash,
  })

  // Write functions for campaign funding
  const {
    data: fundCampaignHash,
    writeContract: writeFundCampaign,
    isPending: isFundingCampaign,
    error: fundCampaignError,
    reset: resetFundCampaign,
  } = useWriteContract()

  // Wait for funding transaction
  const {
    isLoading: isFundCampaignConfirming,
    isSuccess: isFundCampaignSuccess,
    error: fundCampaignReceiptError,
  } = useWaitForTransactionReceipt({
    hash: fundCampaignHash,
  })

  // Write functions for treasury claim
  const {
    data: claimTreasuryHash,
    writeContract: writeClaimTreasury,
    isPending: isClaimingTreasury,
    error: claimTreasuryError,
    reset: resetClaimTreasury,
  } = useWriteContract()

  // Wait for treasury claim transaction
  const {
    isLoading: isClaimTreasuryConfirming,
    isSuccess: isClaimTreasurySuccess,
    error: claimTreasuryReceiptError,
  } = useWaitForTransactionReceipt({
    hash: claimTreasuryHash,
  })

  // Enhanced create campaign function
  const createCampaign = (params: {
    castUrl: string
    shareText: string
    rewardPerShare: bigint
    totalBudget: bigint
    divisible: boolean
  }) => {
    console.log("🚀 Creating campaign with params:", {
      ...params,
      rewardPerShare: params.rewardPerShare.toString(),
      totalBudget: params.totalBudget.toString(),
    })

    if (!address || !isConnected) {
      throw new Error("Wallet not connected")
    }

    if (!CONTRACTS.FarcasterPromo) {
      throw new Error("FarcasterPromo contract address not configured")
    }

    resetCreateCampaign()

    return writeCreateCampaign({
      address: CONTRACTS.FarcasterPromo as `0x${string}`,
      abi: FARCASTER_PROMO_ABI,
      functionName: "createCampaign",
      args: [params.castUrl, params.shareText, params.rewardPerShare, params.totalBudget, params.divisible],
    })
  }

  // Enhanced fund campaign function
  const fundCampaign = (campaignId: bigint, amount: bigint) => {
    console.log("💰 Funding campaign:", {
      campaignId: campaignId.toString(),
      amount: amount.toString(),
      amountInCHESS: Number(amount) / 1e18,
    })

    if (!address || !isConnected) {
      throw new Error("Wallet not connected")
    }

    if (!CONTRACTS.FarcasterPromo) {
      throw new Error("FarcasterPromo contract address not configured")
    }

    resetFundCampaign()

    return writeFundCampaign({
      address: CONTRACTS.FarcasterPromo as `0x${string}`,
      abi: FARCASTER_PROMO_ABI,
      functionName: "fundCampaign",
      args: [campaignId, amount],
    })
  }

  // Enhanced claim treasury function
  const claimFromTreasury = () => {
    console.log("🏦 Claiming from treasury")

    if (!address || !isConnected) {
      throw new Error("Wallet not connected")
    }

    if (!CONTRACTS.FarcasterPromo) {
      throw new Error("FarcasterPromo contract address not configured")
    }

    resetClaimTreasury()

    return writeClaimTreasury({
      address: CONTRACTS.FarcasterPromo as `0x${string}`,
      abi: FARCASTER_PROMO_ABI,
      functionName: "claimFromTreasury",
    })
  }

  return {
    // Read data
    totalCampaigns: totalCampaigns || BigInt(0),
    claimableAmount: claimableAmount || BigInt(0),

    // Write functions
    createCampaign,
    fundCampaign,
    claimFromTreasury,

    // Loading states
    isCreatingCampaign,
    isCreateCampaignConfirming,
    isCreateCampaignSuccess,
    isFundingCampaign,
    isFundCampaignConfirming,
    isFundCampaignSuccess,
    isClaimingTreasury,
    isClaimTreasuryConfirming,
    isClaimTreasurySuccess,

    // Transaction hashes
    createCampaignHash,
    fundCampaignHash,
    claimTreasuryHash,

    // Errors
    createCampaignError, // <-- EZT VISSZAADVA
    createCampaignReceiptError, // <-- EZT VISSZAADVA
    fundCampaignError,
    fundCampaignReceiptError,
    claimTreasuryError,
    claimTreasuryReceiptError,

    // Reset functions
    resetCreateCampaign,
    resetFundCampaign,
    resetClaimTreasury,

    // Refetch functions
    refetchTotalCampaigns,
    refetchClaimableAmount,
  }
}

// Hook for getting campaign details
export function useCampaign(campaignId: bigint | undefined) {
  const {
    data: campaign,
    error,
    isLoading,
    refetch,
  } = useReadContract({
    address: CONTRACTS.FarcasterPromo as `0x${string}`,
    abi: FARCASTER_PROMO_ABI,
    functionName: "getCampaign",
    args: campaignId ? [campaignId] : undefined,
    query: {
      enabled: !!campaignId && !!CONTRACTS.FarcasterPromo,
    },
  })

  console.log("📋 Campaign details:", {
    campaignId: campaignId?.toString(),
    campaign,
    error: error?.message,
    isLoading,
  })

  return {
    campaign,
    error,
    isLoading,
    refetch,
  }
}

// Hook for checking campaign existence
export function useCampaignExists(campaignId: bigint | undefined) {
  const {
    data: campaign,
    error,
    isLoading,
    refetch,
  } = useReadContract({
    address: CONTRACTS.FarcasterPromo as `0x${string}`,
    abi: FARCASTER_PROMO_ABI,
    functionName: "getCampaign",
    args: campaignId ? [campaignId] : undefined,
    query: {
      enabled: !!campaignId && !!CONTRACTS.FarcasterPromo,
    },
  })

  const exists = !!campaign && campaign.active

  console.log("🔍 Campaign existence check:", {
    campaignId: campaignId?.toString(),
    exists,
    campaign,
    error: error?.message,
    isLoading,
  })

  return {
    exists,
    campaign,
    error,
    isLoading,
    refetch,
  }
}
