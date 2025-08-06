"use client"

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi"
import { formatUnits } from 'viem'
import { CONTRACTS } from "@/config/contracts"

// JAVÍTÁS: A hibás, default importot lecseréljük a helyes, "named" importra.
// Mostantól a címet és az ABI-t is innen vesszük.
import { CHESS_TOKEN_ADDRESS, CHESS_TOKEN_ABI } from "@/abis/chessToken"

export function useChessToken() {
  console.log("🔧 useChessToken hook initialized")

  const { address, isConnected } = useAccount()
  console.log("👤 User address:", address, "Connected:", isConnected)

  const {
    data: decimals,
    error: decimalsError,
    isLoading: decimalsLoading,
  } = useReadContract({
    // JAVÍTÁS: A központi CONTRACTS helyett a típus-biztos ABI fájlból vesszük a címet.
    address: CHESS_TOKEN_ADDRESS,
    abi: CHESS_TOKEN_ABI,
    functionName: "decimals",
  })

  const tokenDecimals = decimals ? Number(decimals) : 18
  const decimalMultiplier = BigInt(10 ** tokenDecimals)

  console.log("🔢 CHESS Token Decimals:", {
    decimals: decimals?.toString(),
    tokenDecimals,
    decimalMultiplier: decimalMultiplier.toString(),
  })

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
    // Itt továbbra is a `CONTRACTS` objektumból vesszük a FarcasterPromo címet, ami rendben van.
    args: address ? [address, CONTRACTS.FarcasterPromo as `0x${string}`] : undefined,
    query: {
      enabled: !!address && isConnected && !!CONTRACTS.FarcasterPromo,
    },
  })

  const {
    data: approveHash,
    writeContract: writeApprove,
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
    const currentAllowance = BigInt(allowance.toString())
    return currentAllowance < amount
  }

  const approve = (spender: `0x${string}`, amount: bigint) => {
    if (!address || !isConnected) {
      throw new Error("Wallet not connected")
    }
    resetApprove()
    return writeApprove({
      address: CHESS_TOKEN_ADDRESS,
      abi: CHESS_TOKEN_ABI,
      functionName: "approve",
      args: [spender, amount],
    })
  }

  const approveFarcasterPromo = (amount: bigint) => {
    if (!CONTRACTS.FarcasterPromo) {
      throw new Error("FarcasterPromo contract address not configured")
    }
    return approve(CONTRACTS.FarcasterPromo as `0x${string}`, amount)
  }

  const formatChessAmount = (amount: bigint | undefined): string => {
    if (amount === undefined) return "0.00";
    const formatted = formatUnits(amount, tokenDecimals)
    return parseFloat(formatted).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })
  }

  const parseChessAmount = (amount: string | number): bigint => {
    const amountAsString = typeof amount === 'number' ? amount.toString() : amount;
    return BigInt(parseUnits(amountAsString, tokenDecimals))
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
    approveFarcasterPromo,
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