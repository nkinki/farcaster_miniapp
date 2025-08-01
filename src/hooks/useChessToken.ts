"use client"

import { useReadContract, useWriteContract, useAccount } from 'wagmi'
import { CONTRACTS } from '@/config/contracts'

// ERC20 ABI for CHESS token
const ERC20_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
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
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      }
    ],
    "name": "allowance",
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
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

export function useChessToken() {
  const { address } = useAccount()

  // Read functions
  const { data: balance } = useReadContract({
    address: CONTRACTS.CHESS_TOKEN as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })

  const { data: allowance } = useReadContract({
    address: CONTRACTS.CHESS_TOKEN as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.FarcasterPromo] : undefined,
    query: {
      enabled: !!address,
    },
  })

  // Debug logging
  console.log('useChessToken debug:', {
    address,
    balance: balance?.toString(),
    allowance: allowance?.toString(),
    farcasterPromoAddress: CONTRACTS.FarcasterPromo
  })

  // Write functions
  const { 
    data: approveData, 
    writeContract: approve, 
    isPending: isApproving,
    error: approveError,
    isSuccess: isApproveSuccess
  } = useWriteContract()

  // Log approval events
  console.log('Approval status:', {
    isApproving,
    isApproveSuccess,
    approveError: approveError?.message,
    approveData
  })

  return {
    // Read data
    balance: balance || BigInt(0),
    allowance: allowance || BigInt(0),
    
    // Write functions
    approve: (args: any) => approve({
      address: CONTRACTS.CHESS_TOKEN as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args,
    }),
    
    // Loading states
    isApproving,
    isApproveSuccess,
    approveError,
    
    // Transaction hash
    approveHash: approveData,
    
    // Helper functions
    needsApproval: (amount: bigint) => (allowance || BigInt(0)) < amount,
  }
} 