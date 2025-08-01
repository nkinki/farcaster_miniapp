"use client"

import { useContractRead, useContractWrite, useWaitForTransaction, useAccount } from 'wagmi'
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
  const { data: balance } = useContractRead({
    address: CONTRACTS.CHESS_TOKEN as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    enabled: !!address,
  })

  const { data: allowance } = useContractRead({
    address: CONTRACTS.CHESS_TOKEN as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.FarcasterPromo] : undefined,
    enabled: !!address,
  })

  // Write functions
  const { 
    data: approveData, 
    write: approve, 
    isLoading: isApproving 
  } = useContractWrite({
    address: CONTRACTS.CHESS_TOKEN as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'approve',
  })

  // Wait for transaction
  const { isLoading: isApprovingPending } = useWaitForTransaction({
    hash: approveData?.hash,
  })

  return {
    // Read data
    balance: balance || 0n,
    allowance: allowance || 0n,
    
    // Write functions
    approve,
    
    // Loading states
    isApproving: isApproving || isApprovingPending,
    
    // Transaction hash
    approveHash: approveData?.hash,
    
    // Helper functions
    needsApproval: (amount: bigint) => (allowance || 0n) < amount,
  }
} 