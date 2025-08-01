"use client"

import { useReadContract, useWriteContract, useAccount } from 'wagmi'
import { CONTRACTS } from '@/config/contracts'

// Import CHESS token ABI from file
import CHESS_TOKEN_ABI from "../../abis/ChessToken.json"

export function useChessToken() {
  console.log('🔧 useChessToken hook initialized')
  
  const { address } = useAccount()
  console.log('👤 User address:', address)

  // Read functions
  const { data: balance, error: balanceError, isLoading: balanceLoading } = useReadContract({
    address: CONTRACTS.CHESS_TOKEN as `0x${string}`,
    abi: CHESS_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })

  const { data: allowance, error: allowanceError, isLoading: allowanceLoading } = useReadContract({
    address: CONTRACTS.CHESS_TOKEN as `0x${string}`,
    abi: CHESS_TOKEN_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.FarcasterPromo] : undefined,
    query: {
      enabled: !!address,
    },
  })

  // Enhanced debug logging
  console.log('💰 CHESS Token Debug:', {
    address,
    balance: balance?.toString(),
    balanceError: balanceError?.message,
    balanceLoading,
    allowance: allowance?.toString(),
    allowanceError: allowanceError?.message,
    allowanceLoading,
    farcasterPromoAddress: CONTRACTS.FarcasterPromo,
    chessTokenAddress: CONTRACTS.CHESS_TOKEN
  })

  // Write functions
  const { 
    data: approveData, 
    writeContract: approve, 
    isPending: isApproving,
    error: approveError,
    isSuccess: isApproveSuccess
  } = useWriteContract()

  // Enhanced approval logging
  console.log('✅ Approval Status:', {
    isApproving,
    isApproveSuccess,
    approveError: approveError?.message,
    approveData: approveData?.toString(),
    approveErrorDetails: approveError
  })

  // Helper function with debug
  const needsApproval = (amount: bigint) => {
    const currentAllowance = BigInt(allowance?.toString() || '0');
    const needs = currentAllowance < amount;
    console.log('🔍 Needs Approval Check:', {
      amount: amount.toString(),
      currentAllowance: currentAllowance.toString(),
      needs,
      allowanceRaw: allowance
    });
    return needs;
  };

  // Enhanced approve function with debug
  const approveWithDebug = (args: any) => {
    console.log('🚀 Approve function called with args:', args);
    console.log('📋 Approve contract details:', {
      address: CONTRACTS.CHESS_TOKEN,
      abi: CHESS_TOKEN_ABI,
      functionName: 'approve'
    });
    
    try {
      const result = approve({
        address: CONTRACTS.CHESS_TOKEN as `0x${string}`,
        abi: CHESS_TOKEN_ABI,
        functionName: 'approve',
        args,
      });
      console.log('✅ Approve call successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Approve call failed:', error);
      throw error;
    }
  };

  return {
    // Read data
    balance: balance || BigInt(0),
    allowance: allowance || BigInt(0),
    
    // Write functions
    approve: approveWithDebug,
    
    // Loading states
    isApproving,
    isApproveSuccess,
    approveError,
    
    // Transaction hash
    approveHash: approveData,
    
    // Helper functions
    needsApproval,
    
    // Debug info
    balanceError,
    allowanceError,
    balanceLoading,
    allowanceLoading
  }
} 