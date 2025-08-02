"use client"

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi"
import { CONTRACTS } from "@/config/contracts" // Ez az alias a src/config-ra mutat
import CHESS_TOKEN_ABI from "../abis/ChessToken.json" // <-- EZ AZ ÚTVONAL

export function useChessToken() {
  console.log("🔧 useChessToken hook initialized")

  const { address, isConnected } = useAccount()
  console.log("👤 User address:", address, "Connected:", isConnected)

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
      retry: 3,
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
      retry: 3,
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
      amountInCHESS: Number(amount) / 1e18,
      allowanceInCHESS: Number(currentAllowance) / 1e18,
    })

    return needs
  }

  // Enhanced approve function with proper parameter handling
  const approve = (spender: `0x${string}`, amount: bigint) => {
    console.log("🚀 Approve function called:", {
      spender,
      amount: amount.toString(),
      amountInCHESS: Number(amount) / 1e18,
      contractAddress: CONTRACTS.CHESS_TOKEN,
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

  return {
    // Read data
    balance: balance || BigInt(0),
    allowance: allowance || BigInt(0),

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

    // Loading states
    balanceLoading,
    allowanceLoading,

    // Transaction hash
    approveHash,

    // Helper functions
    needsApproval,

    // Refetch functions
    refetchBalance,
    refetchAllowance,

    // Reset function
    resetApprove,
  }
}
