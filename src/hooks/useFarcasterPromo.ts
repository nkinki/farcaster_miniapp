"use client"

import { useContractRead, useContractWrite, useWaitForTransaction, useAccount } from 'wagmi'
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
  const { data: totalCampaigns } = useContractRead({
    address: CONTRACTS.FarcasterPromo as `0x${string}`,
    abi: FARCASTER_PROMO_ABI,
    functionName: 'getTotalCampaigns',
  })

  const { data: claimableAmount } = useContractRead({
    address: CONTRACTS.FarcasterPromo as `0x${string}`,
    abi: FARCASTER_PROMO_ABI,
    functionName: 'getClaimableAmount',
    args: address ? [address] : undefined,
    enabled: !!address,
  })

  // Write functions
  const { 
    data: createCampaignData, 
    write: createCampaign, 
    isLoading: isCreatingCampaign 
  } = useContractWrite({
    address: CONTRACTS.FarcasterPromo as `0x${string}`,
    abi: FARCASTER_PROMO_ABI,
    functionName: 'createCampaign',
  })

  const { 
    data: fundCampaignData, 
    write: fundCampaign, 
    isLoading: isFundingCampaign 
  } = useContractWrite({
    address: CONTRACTS.FarcasterPromo as `0x${string}`,
    abi: FARCASTER_PROMO_ABI,
    functionName: 'fundCampaign',
  })

  const { 
    data: claimTreasuryData, 
    write: claimFromTreasury, 
    isLoading: isClaimingTreasury 
  } = useContractWrite({
    address: CONTRACTS.FarcasterPromo as `0x${string}`,
    abi: FARCASTER_PROMO_ABI,
    functionName: 'claimFromTreasury',
  })

  // Wait for transactions
  const { isLoading: isCreatingCampaignPending } = useWaitForTransaction({
    hash: createCampaignData?.hash,
  })

  const { isLoading: isFundingCampaignPending } = useWaitForTransaction({
    hash: fundCampaignData?.hash,
  })

  const { isLoading: isClaimingTreasuryPending } = useWaitForTransaction({
    hash: claimTreasuryData?.hash,
  })

  return {
    // Read data
    totalCampaigns: totalCampaigns || 0n,
    claimableAmount: claimableAmount || 0n,
    
    // Write functions
    createCampaign,
    fundCampaign,
    claimFromTreasury,
    
    // Loading states
    isCreatingCampaign: isCreatingCampaign || isCreatingCampaignPending,
    isFundingCampaign: isFundingCampaign || isFundingCampaignPending,
    isClaimingTreasury: isClaimingTreasury || isClaimingTreasuryPending,
    
    // Transaction hashes
    createCampaignHash: createCampaignData?.hash,
    fundCampaignHash: fundCampaignData?.hash,
    claimTreasuryHash: claimTreasuryData?.hash,
  }
}

// Hook for getting campaign details
export function useCampaign(campaignId: bigint | undefined) {
  const { data: campaign } = useContractRead({
    address: CONTRACTS.FarcasterPromo as `0x${string}`,
    abi: FARCASTER_PROMO_ABI,
    functionName: 'getCampaign',
    args: campaignId ? [campaignId] : undefined,
    enabled: !!campaignId,
  })

  return campaign
} 