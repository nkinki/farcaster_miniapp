"use client"

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi"
// FIX: We import the missing `parseUnits` function here as well.
import { formatUnits, parseUnits } from 'viem'

// FIX: Instead of the central CONTRACTS import, we take everything from its own ABI file.
import { CHESS_TOKEN_ADDRESS, CHESS_TOKEN_ABI } from "@/abis/chessToken"
import { treasuryDepositAddress } from "@/abis/treasuryDeposit"

export function useChessToken() {
  const { address, isConnected } = useAccount()

  const {
    data: decimals,
    error: decimalsError,
    isLoading: decimalsLoading,
  } = useReadContract({
    address: CHESS_TOKEN_ADDRESS,
    abi: CHESS_TOKEN_ABI,
    functionName: "decimals",
  })

  const tokenDecimals = decimals ? Number(decimals) : 18

  const {
    data: balance,
    error: balanceError,
    isLoading: balanceLoading,
    refetch: refetchBalance,
  } = useReadContract({
    address: CHESS_TOKEN_ADDRESS,
    abi: CHESS_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  })

  const {
    data: allowance,
    error: allowanceError,
    isLoading: allowanceLoading,
    refetch: refetchAllowance,
  } = useReadContract({
    address: CHESS_TOKEN_ADDRESS,
    abi: CHESS_TOKEN_ABI,
    functionName: "allowance",
    // FIX: We already check the `allowance` for the new TreasuryDeposit contract!
    args: address ? [address, treasuryDepositAddress] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  })

  const {
    data: approveHash,
    writeContractAsync: writeApprove,
    isPending: isApproving,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract()

  const {
    isLoading: isApprovalConfirming,
    isSuccess: isApproveSuccess,
    error: approvalReceiptError,
  } = useWaitForTransactionReceipt({
    hash: approveHash,
  })

  const needsApproval = (amount: bigint) => {
    if (!allowance) return true
    return allowance < amount
  }

  const approve = async (spender: `0x${string}`, amount: bigint) => {
    if (!address || !isConnected) {
      throw new Error("Wallet not connected")
    }
    resetApprove()
    return await writeApprove({
      address: CHESS_TOKEN_ADDRESS,
      abi: CHESS_TOKEN_ABI,
      functionName: "approve",
      args: [spender, amount],
    })
  }

  // FIX: We translate this helper function name to refer to the new contract.
  const approveTreasuryDeposit = (amount: bigint) => {
    return approve(treasuryDepositAddress, amount)
  }

  const formatChessAmount = (amount: bigint | undefined): string => {
    if (amount === undefined) return "0.00";
    const formatted = formatUnits(amount, tokenDecimals)
    return parseFloat(formatted).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const parseChessAmount = (amount: string | number): bigint => {
    const amountAsString = typeof amount === 'number' ? amount.toString() : amount;
    // Now `parseUnits` exists and works correctly.
    return parseUnits(amountAsString, tokenDecimals)
  }

  function safeBigInt(val: unknown): bigint {
    try {
      if (typeof val === "bigint") return val
      if (typeof val === "number" || typeof val === "boolean") return BigInt(val)
      if (typeof val === "string" && /^\d+$/.test(val)) return BigInt(val)
    } catch (e) {
      return BigInt(0)
    }
    return BigInt(0)
  }

  return {
    balance: safeBigInt(balance),
    allowance: safeBigInt(allowance),
    decimals: tokenDecimals,
    approve,
    approveTreasuryDeposit, // FIX: We export the new name.
    isApproving,
    isApprovalConfirming,
    isApproveSuccess,
    approveError,
    approvalReceiptError,
    balanceError,
    allowanceError,
    decimalsError,
    balanceLoading,
    allowanceLoading,
    decimalsLoading,
    approveHash,
    needsApproval,
    formatChessAmount,
    parseChessAmount,
    refetchBalance,
    refetchAllowance,
    resetApprove,
  }
}