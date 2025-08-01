"use client"

import { useReadContract, useWriteContract, useAccount } from 'wagmi'
import { CONTRACTS } from '@/config/contracts'

// ABI import - we'll need to add this
const FARCASTER_PROMO_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_chessToken",
        "type": "address"
      },
      {
        "internalType": "address", 
        "name": "_treasuryWallet",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_initialOwner",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_castUrl",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_shareText",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_rewardPerShare",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_totalBudget",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "_divisible",
        "type": "bool"
      }
    ],
    "name": "createCampaign",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_campaignId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      }
    ],
    "name": "fundCampaign",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_campaignId",
        "type": "uint256"
      }
    ],
    "name": "getCampaign",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "promoter",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "castUrl",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "shareText",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "rewardPerShare",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalBudget",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "remainingBudget",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "sharesCount",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "divisible",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "accumulatedAmount",
            "type": "uint256"
          }
        ],
        "internalType": "struct FarcasterPromo.Campaign",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalCampaigns",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_user",
        "type": "address"
      }
    ],
    "name": "getClaimableAmount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "claimFromTreasury",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

export function useFarcasterPromo() {
  const { address } = useAccount()

  // Read functions
  const { data: totalCampaigns } = useReadContract({
    address: CONTRACTS.FarcasterPromo as `0x${string}`,
    abi: FARCASTER_PROMO_ABI,
    functionName: 'getTotalCampaigns',
  })

  const { data: claimableAmount } = useReadContract({
    address: CONTRACTS.FarcasterPromo as `0x${string}`,
    abi: FARCASTER_PROMO_ABI,
    functionName: 'getClaimableAmount',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })

  // Debug logging
  console.log('useFarcasterPromo debug:', {
    totalCampaigns: totalCampaigns?.toString(),
    claimableAmount: claimableAmount?.toString(),
    address,
  })

  // Write functions
  const { 
    data: createCampaignData, 
    writeContract: createCampaign, 
    isPending: isCreatingCampaign 
  } = useWriteContract()

  const { 
    data: fundCampaignData, 
    writeContract: fundCampaign, 
    isPending: isFundingCampaign 
  } = useWriteContract()

  const { 
    data: claimTreasuryData, 
    writeContract: claimFromTreasury, 
    isPending: isClaimingTreasury 
  } = useWriteContract()

  return {
    // Read data
    totalCampaigns: totalCampaigns || BigInt(0),
    claimableAmount: claimableAmount || BigInt(0),
    
    // Write functions
    createCampaign: (args: any) => createCampaign({
      address: CONTRACTS.FarcasterPromo as `0x${string}`,
      abi: FARCASTER_PROMO_ABI,
      functionName: 'createCampaign',
      args,
    }),
    fundCampaign: (args: any) => fundCampaign({
      address: CONTRACTS.FarcasterPromo as `0x${string}`,
      abi: FARCASTER_PROMO_ABI,
      functionName: 'fundCampaign',
      args,
    }),
    claimFromTreasury: () => claimFromTreasury({
      address: CONTRACTS.FarcasterPromo as `0x${string}`,
      abi: FARCASTER_PROMO_ABI,
      functionName: 'claimFromTreasury',
    }),
    
    // Loading states
    isCreatingCampaign,
    isFundingCampaign,
    isClaimingTreasury,
    
    // Transaction hashes
    createCampaignHash: createCampaignData,
    fundCampaignHash: fundCampaignData,
    claimTreasuryHash: claimTreasuryData,
  }
}

// Hook for getting campaign details
export function useCampaign(campaignId: bigint | undefined) {
  const { data: campaign } = useReadContract({
    address: CONTRACTS.FarcasterPromo as `0x${string}`,
    abi: FARCASTER_PROMO_ABI,
    functionName: 'getCampaign',
    args: campaignId ? [campaignId] : undefined,
    query: {
      enabled: !!campaignId,
    },
  })

  return campaign
}

// Hook for checking campaign existence
export function useCampaignExists(campaignId: bigint | undefined) {
  const { data: campaign, error, isLoading } = useReadContract({
    address: CONTRACTS.FarcasterPromo as `0x${string}`,
    abi: FARCASTER_PROMO_ABI,
    functionName: 'getCampaign',
    args: campaignId ? [campaignId] : undefined,
    query: {
      enabled: !!campaignId,
    },
  })

  return {
    exists: !!campaign && campaign.active,
    campaign,
    error,
    isLoading
  }
} 