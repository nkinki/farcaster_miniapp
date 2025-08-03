"use client"

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi"
import { CONTRACTS } from "@/config/contracts" // Ez az alias a src/config-ra mutat
import CHESS_TOKEN_ABI from "../abis/ChessToken.json" // <-- EZ AZ ÚTVONAL

export function useChessToken() {
  console.log("🔧 useChessToken hook initialized")

  const { address, isConnected } = useAccount()
  console.log("👤 User address:", address, "Connected:", isConnected)

  // Read CHESS token decimals
  const {
    data: decimals,
    error: decimalsError,
    isLoading: decimalsLoading,
  } = useReadContract({
    address: CONTRACTS.CHESS_TOKEN as `0x${string}`,
    abi: CHESS_TOKEN_ABI,
    functionName: "decimals",
    query: {
      enabled: !!CONTRACTS.CHESS_TOKEN,
      retry: (failureCount, error) => {
        if (error?.message?.includes('getChainId') ||
            error?.message?.includes('connector') ||
            error?.message?.includes('chain')) {
          console.warn('Skipping decimals retry for connector error:', error.message)
          return false
        }
        return failureCount < 3
      },
      retryDelay: 1000,
    },
  })

  // Use 18 as default decimals (standard for CHESS token)
  const tokenDecimals = decimals ? Number(decimals) : 18
  const decimalMultiplier = BigInt(10 ** tokenDecimals)

  console.log("🔢 CHESS Token Decimals:", {
    decimals: decimals?.toString(),
    tokenDecimals,
    decimalMultiplier: decimalMultiplier.toString(),
    decimalsError: decimalsError?.message,
    decimalsLoading,
  })

  // Read functions with better error handling
  const {
    data: balance,
    error: balanceError,
    isLoading: balanceLoading,
    refetch: refetchBalance,
  } = useReadContract({
    address: CONTRACTS.CHESS_TOKEN as `0x${string}`,
    abi: CHESS_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
      retry: (failureCount, error) => {
        // Skip retry for connector-related errors
        if (error?.message?.includes('getChainId') ||
            error?.message?.includes('connector') ||
            error?.message?.includes('chain')) {
          console.warn('Skipping retry for connector error:', error.message)
          return false
        }
        return failureCount < 3
      },
      retryDelay: 1000,
    },
  })

  const {
    data: allowance,
    error: allowanceError,
    isLoading: allowanceLoading,
    refetch: refetchAllowance,
  } = useReadContract({
    address: CONTRACTS.CHESS_TOKEN as `0x${string}`,
    abi: CHESS_TOKEN_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACTS.FarcasterPromo] : undefined,
    query: {
      enabled: !!address && isConnected && !!CONTRACTS.FarcasterPromo,
      retry: (failureCount, error) => {
        // Skip retry for connector-related errors
        if (error?.message?.includes('getChainId') ||
            error?.message?.includes('connector') ||
            error?.message?.includes('chain')) {
          console.warn('Skipping retry for connector error:', error.message)
          return false
        }
        return failureCount < 3
      },
      retryDelay: 1000,
    },
  })

  // Enhanced debug logging
  console.log("💰 CHESS Token Debug:", {
    address,
    isConnected,
    balance: balance?.toString(),
    balanceError: balanceError?.message,
    balanceLoading,
    allowance: allowance?.toString(),
    allowanceError: allowanceError?.message,
    allowanceLoading,
    farcasterPromoAddress: CONTRACTS.FarcasterPromo,
    chessTokenAddress: CONTRACTS.CHESS_TOKEN,
    contractsValid: !!(CONTRACTS.CHESS_TOKEN && CONTRACTS.FarcasterPromo),
  })

  // Write functions with better error handling
  const {
    data: approveHash,
    writeContract: writeApprove,
    isPending: isApproving,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract()

  // Wait for approval transaction
  const {
    isLoading: isApprovalConfirming,
    isSuccess: isApproveSuccess,
    error: approvalReceiptError,
  } = useWaitForTransactionReceipt({
    hash: approveHash,
  })

  // Enhanced approval logging
  console.log("✅ Approval Status:", {
    isApproving,
    isApprovalConfirming,
    isApproveSuccess,
    approveError: approveError?.message,
    approvalReceiptError: approvalReceiptError?.message,
    approveHash,
  })

  // Helper function with enhanced debug
  const needsApproval = (amount: bigint) => {
    if (!allowance || allowanceLoading) {
      console.log("🔍 Needs Approval Check: allowance not loaded yet")
      return true // Assume needs approval if not loaded
    }

    const currentAllowance = BigInt(allowance.toString())
    const needs = currentAllowance < amount

    console.log("🔍 Needs Approval Check:", {
      amount: amount.toString(),
      currentAllowance: currentAllowance.toString(),
      needs,
      allowanceRaw: allowance,
      amountInCHESS: Number(amount) / Number(decimalMultiplier),
      allowanceInCHESS: Number(currentAllowance) / Number(decimalMultiplier),
    })

    return needs
  }

  // Enhanced approve function with proper parameter handling and error recovery
  const approve = (spender: `0x${string}`, amount: bigint) => {
    console.log("🚀 Approve function called:", {
      spender,
      amount: amount.toString(),
      amountInCHESS: Number(amount) / Number(decimalMultiplier),
      contractAddress: CONTRACTS.CHESS_TOKEN,
      isConnected,
      address,
      chainId: (typeof window !== 'undefined' && (window as any).ethereum?.chainId) || 'unknown',
      wagmiChainId: (typeof window !== 'undefined' && (window as any).__wagmi__?.state?.chains?.[0]?.id) || 'unknown',
      wagmiChains: (typeof window !== 'undefined' && (window as any).__wagmi__?.state?.chains) || 'unknown',
      wagmiProvider: (typeof window !== 'undefined' && (window as any).__wagmi__?.state?.provider) || 'unknown',
    })

    if (!address || !isConnected) {
      console.error("❌ Cannot approve: wallet not connected")
      throw new Error("Wallet not connected")
    }

    if (!CONTRACTS.CHESS_TOKEN) {
      console.error("❌ Cannot approve: CHESS token contract address missing")
      throw new Error("CHESS token contract address not configured")
    }

    try {
      resetApprove() // Reset previous state

      const result = writeApprove({
        address: CONTRACTS.CHESS_TOKEN as `0x${string}`,
        abi: CHESS_TOKEN_ABI,
        functionName: "approve",
        args: [spender, amount],
      })

      console.log("✅ Approve transaction initiated:", result)
      return result

    } catch (error) {
      console.error("❌ Approve call failed:", error)
      
      // If it's a connector error, try to provide helpful feedback
      if (error instanceof Error && error.message.includes('getChainId')) {
        throw new Error("Wallet connection issue. Please disconnect and reconnect your wallet.")
      }
      
      throw error
    }
  }

  // Convenience function for approving FarcasterPromo contract
  const approveFarcasterPromo = (amount: bigint) => {
    if (!CONTRACTS.FarcasterPromo) {
      throw new Error("FarcasterPromo contract address not configured")
    }
    return approve(CONTRACTS.FarcasterPromo as `0x${string}`, amount)
  }

  // Helper functions for formatting
  const formatChessAmount = (amount: bigint): string => {
    const formatted = Number(amount) / Number(decimalMultiplier)
    return formatted.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })
  }

  const parseChessAmount = (amount: number): bigint => {
    return BigInt(Math.floor(amount)) * decimalMultiplier
  }

  function safeBigInt(val: unknown): bigint {
  if (typeof val === "bigint") return val
  if (typeof val === "number" || typeof val === "boolean") return BigInt(val)
  if (typeof val === "string" && val !== "") return BigInt(val)
  return BigInt(0)
  }
  
  return {
  // Read data
  balance: safeBigInt(balance),
  allowance: safeBigInt(allowance),
  decimals: tokenDecimals,
  decimalMultiplier,

    // Write functions
    approve,
    approveFarcasterPromo,

    // Loading states
    isApproving,
    isApprovalConfirming,
    isApproveSuccess,

    // Errors
    approveError,
    approvalReceiptError,
    balanceError,
    allowanceError,
    decimalsError,

    // Loading states
    balanceLoading,
    allowanceLoading,
    decimalsLoading,

    // Transaction hash
    approveHash,

    // Helper functions
    needsApproval,
    formatChessAmount,
    parseChessAmount,

    // Refetch functions
    refetchBalance,
    refetchAllowance,

    // Reset function
    resetApprove,
  }
}  allowance: safeBigInt(allowance),
  decimals: tokenDecimals,
  decimalMultiplier,

    // Write functions
    approve,
    approveFarcasterPromo,

    // Loading states
    isApproving,
    isApprovalConfirming,
    isApproveSuccess,

    // Errors
    approveError,
    approvalReceiptError,
    balanceError,
    allowanceError,
    decimalsError,

    // Loading states
    balanceLoading,
    allowanceLoading,
    decimalsLoading,

    // Transaction hash
    approveHash,

    // Helper functions
    needsApproval,
    formatChessAmount,
    parseChessAmount,

    // Refetch functions
    refetchBalance,
    refetchAllowance,

    // Reset function
    resetApprove,
  }
}
