"use client"

import { useState, useEffect } from "react"
import { FiAlertCircle } from "react-icons/fi"
import { useFarcasterPromo, useCampaignExists } from "@/hooks/useFarcasterPromo"
import { useChessToken } from "@/hooks/useChessToken"
import { usePromotion } from "@/hooks/usePromotions"
import { useAccount, useSimulateContract } from "wagmi"
import FARCASTER_PROMO_ABI from "../../abis/FarcasterPromo.json"
import CHESS_TOKEN_ABI from "../../abis/ChessToken.json"
import { CONTRACTS } from "@/config/contracts"

// TypeScript declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
  }
}

interface PaymentFormProps {
  promotionId: string
  onPaymentComplete: (amount: number, hash: string) => void
  onCancel: () => void
  // New props for new campaign creation
  newCampaignData?: {
    castUrl: string
    shareText: string
    rewardPerShare: number
    totalBudget: number
    user: {
      fid: number
      username: string
      displayName: string
    }
  }
}

export default function PaymentForm({ promotionId, onPaymentComplete, onCancel, newCampaignData }: PaymentFormProps) {
  const [rewardPerShare, setRewardPerShare] = useState<number>(newCampaignData?.rewardPerShare || 10000) // Default 10k
  const [error, setError] = useState<string>("")
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false)
  const [isSavingToDb, setIsSavingToDb] = useState(false)

  // Wagmi hooks
  const { address, isConnected } = useAccount()
  const { fundCampaign, isFundingCampaign, fundCampaignHash, createCampaign, isCreatingCampaign: isCreatingCampaignFromHook, createCampaignHash: createCampaignData } = useFarcasterPromo()
  const { 
    balance, 
    allowance, 
    approve, 
    isApproving, 
    needsApproval, 
    isApproveSuccess, 
    approveError,
    balanceError,
    allowanceError,
    balanceLoading,
    allowanceLoading
  } = useChessToken()

  // Debug logging for PaymentForm
  console.log('🎯 PaymentForm Debug:', {
    address,
    isConnected,
    balance: balance?.toString(),
    allowance: allowance?.toString(),
    balanceError: balanceError?.message,
    allowanceError: allowanceError?.message,
    balanceLoading,
    allowanceLoading,
    isApproving,
    isApproveSuccess,
    approveError: approveError?.message,
    userAgent: navigator.userAgent,
    isFarcasterApp: navigator.userAgent.includes('Farcaster') || window.location.hostname.includes('farcaster')
  })

  // Neon DB promotion data (only for existing campaigns)
  const { promotion, loading: promotionLoading, error: promotionError } = usePromotion(
    promotionId === 'new' ? undefined : Number(promotionId)
  )

  // Blockchain campaign check (for compatibility)
  const { exists: campaignExists, campaign: blockchainCampaign, error: campaignError, isLoading: campaignLoading } = useCampaignExists(
    promotionId === 'new' ? undefined : BigInt(promotionId)
  )

  // Add timeout for loading state
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  
  useEffect(() => {
    if (campaignLoading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true)
      }, 10000) // 10 seconds timeout
      
      return () => clearTimeout(timer)
    } else {
      setLoadingTimeout(false)
    }
  }, [campaignLoading])

  // Simulate campaign creation for new campaigns
  const { data: createSimulationData, error: createSimulationError } = useSimulateContract({
    address: CONTRACTS.FarcasterPromo as `0x${string}`,
    abi: FARCASTER_PROMO_ABI,
    functionName: 'createCampaign',
    args: newCampaignData ? [
      newCampaignData.castUrl.startsWith('http') ? newCampaignData.castUrl : `https://warpcast.com/~/conversations/${newCampaignData.castUrl}`,
      newCampaignData.shareText || 'Share this promotion!',
      BigInt(newCampaignData.rewardPerShare) * BigInt(10 ** 18), // Proper BigInt conversion
      BigInt(newCampaignData.totalBudget) * BigInt(10 ** 18), // Proper BigInt conversion
      true // divisible
    ] : promotion ? [
      promotion.cast_url.startsWith('http') ? promotion.cast_url : `https://warpcast.com/~/conversations/${promotion.cast_url}`,
      promotion.share_text || 'Share this promotion!',
      BigInt(rewardPerShare) * BigInt(10 ** 18), // Proper BigInt conversion
      BigInt(promotion.total_budget) * BigInt(10 ** 18), // Proper BigInt conversion
      true // divisible
    ] : undefined,
    query: {
      enabled: isConnected && !!address && (!!newCampaignData || (!!promotion && !campaignExists && !campaignLoading)),
    },
  })

  // Debug simulation status
  console.log('Simulation debug:', {
    isConnected,
    address,
    newCampaignData: !!newCampaignData,
    promotion: !!promotion,
    campaignExists,
    campaignLoading,
    enabled: isConnected && !!address && (!!newCampaignData || (!!promotion && !campaignExists && !campaignLoading)),
    simulationData: !!createSimulationData,
    simulationError: createSimulationError?.message
  })

  const handleRewardPerShareChange = (value: number) => {
    setRewardPerShare(value)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`
    return num.toString()
  }

  const handleCreateCampaign = async () => {
    if (!isConnected) {
      setError("Please connect your wallet first")
      return
    }

    // For new campaigns, validate newCampaignData
    if (promotionId === 'new') {
      if (!newCampaignData) {
        setError("New campaign data is missing")
        return
      }
    } else {
      // For existing campaigns, validate promotion
      if (!promotion) {
        setError(`Promotion ${promotionId} does not exist in database`)
        return
      }

      if (promotion.status !== 'active') {
        setError(`Promotion ${promotionId} is not active (status: ${promotion.status})`)
        return
      }
    }

    // Check minimum values
    const rewardPerShareValue = promotionId === 'new' ? (newCampaignData?.rewardPerShare || 0) : rewardPerShare
    const totalBudgetValue = promotionId === 'new' ? (newCampaignData?.totalBudget || 0) : (promotion?.total_budget || 0)
    
    if (rewardPerShareValue <= 0) {
      setError("Reward per share must be greater than 0")
      return
    }
    
    if (totalBudgetValue <= 0) {
      setError("Total budget must be greater than 0")
      return
    }
    
    if (rewardPerShareValue > totalBudgetValue) {
      setError("Reward per share cannot be greater than total budget")
      return
    }

    // Note: createCampaign doesn't require CHESS approval - it only creates the campaign
    // CHESS transfer happens later with fundCampaign

    setError("")

    try {
      setIsCreatingCampaign(true)
      
      const campaignData = promotionId === 'new' ? newCampaignData! : promotion!
      console.log('Creating blockchain campaign for:', campaignData)
      
      // Debug: Log the exact parameters being sent to the contract
      const args = promotionId === 'new' ? [
        newCampaignData!.castUrl.startsWith('http') ? newCampaignData!.castUrl : `https://warpcast.com/~/conversations/${newCampaignData!.castUrl}`,
        newCampaignData!.shareText || 'Share this promotion!',
        BigInt(newCampaignData!.rewardPerShare) * BigInt(10 ** 18),
        BigInt(newCampaignData!.totalBudget) * BigInt(10 ** 18),
        true
      ] : [
        promotion!.cast_url.startsWith('http') ? promotion!.cast_url : `https://warpcast.com/~/conversations/${promotion!.cast_url}`,
        promotion!.share_text || 'Share this promotion!',
        BigInt(rewardPerShare) * BigInt(10 ** 18),
        BigInt(promotion!.total_budget) * BigInt(10 ** 18),
        true
      ]
      
      console.log('Contract call parameters:', {
        castUrl: args[0],
        shareText: args[1],
        rewardPerShare: args[2].toString(),
        totalBudget: args[3].toString(),
        divisible: args[4]
      })
      
      // Try to use simulation if available, otherwise create directly
      if (createSimulationData?.request) {
        console.log('Creating campaign with simulation request...')
        createCampaign(createSimulationData.request)
      } else {
        console.log('Creating campaign directly without simulation...')
        createCampaign({
          address: CONTRACTS.FarcasterPromo as `0x${string}`,
          abi: FARCASTER_PROMO_ABI,
          functionName: 'createCampaign',
          args: args
        })
      }
    } catch (err) {
      console.error('Error creating blockchain campaign:', err)
      setError(err instanceof Error ? err.message : 'Failed to create campaign')
      setIsCreatingCampaign(false)
    }
  }

  // Handle successful campaign creation
  useEffect(() => {
    if (createCampaignData) {
      console.log('Campaign created successfully on blockchain:', createCampaignData)
      
      // If this is a new campaign, save to Neon DB
      if (promotionId === 'new' && newCampaignData) {
        saveNewCampaignToDb(createCampaignData)
      } else {
        setIsCreatingCampaign(false)
        // Refresh campaign status after creation
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
    }
  }, [createCampaignData, promotionId, newCampaignData])

  // Handle approval success
  useEffect(() => {
    if (isApproveSuccess) {
      console.log('CHESS token approval successful!')
      // Refresh allowance data
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    }
  }, [isApproveSuccess])

  // Handle approval error
  useEffect(() => {
    if (approveError) {
      console.error('CHESS token approval failed:', approveError)
      setError(`Approval failed: ${approveError.message}`)
    }
  }, [approveError])

  // Save new campaign to Neon DB after successful blockchain creation
  const saveNewCampaignToDb = async (blockchainHash: string) => {
    if (!newCampaignData) return

    try {
      setIsSavingToDb(true)
      console.log('Saving new campaign to Neon DB:', newCampaignData)

      const response = await fetch('/api/promotions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fid: newCampaignData.user.fid,
          username: newCampaignData.user.username,
          displayName: newCampaignData.user.displayName,
          castUrl: newCampaignData.castUrl,
          shareText: newCampaignData.shareText || undefined,
          rewardPerShare: newCampaignData.rewardPerShare,
          totalBudget: newCampaignData.totalBudget,
          blockchainHash: blockchainHash // Store the blockchain transaction hash
        })
      });

      if (response.ok) {
        const data = await response.json()
        console.log('Campaign saved to Neon DB successfully:', data)
        
        // Call onPaymentComplete with the blockchain hash
        onPaymentComplete(newCampaignData.totalBudget, blockchainHash)
        
        // Reset form
        setIsCreatingCampaign(false)
        setIsSavingToDb(false)
      } else {
        const errorData = await response.json()
        console.error('Failed to save to Neon DB:', errorData)
        setError(`Campaign created on blockchain but failed to save to database: ${errorData.error || 'Unknown error'}`)
        setIsCreatingCampaign(false)
        setIsSavingToDb(false)
      }
    } catch (error) {
      console.error('Error saving to Neon DB:', error)
      setError(`Campaign created on blockchain but failed to save to database: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsCreatingCampaign(false)
      setIsSavingToDb(false)
    }
  }

  const checkAndSwitchToBase = async () => {
    if (!window.ethereum) {
      setError("MetaMask not found. Please install MetaMask.")
      return
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }], // Base network chainId (8453 in hex)
      });
      console.log('Switched to Base network successfully.');
      // Optionally, refresh allowance or other data if needed
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      if (error.code === 4902) { // Chain not added
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x2105', // Base network chainId (8453 in hex)
                chainName: 'Base',
                nativeCurrency: {
                  name: 'Base',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://mainnet.base.org'],
                blockExplorerUrls: ['https://basescan.org'],
              },
            ],
          });
          console.log('Base network added and switched successfully.');
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } catch (addError: any) {
          console.error('Failed to add Base network:', addError);
          setError(`Failed to add Base network: ${addError.message}`);
        }
      } else {
        console.error('Failed to switch to Base network:', error);
        setError(`Failed to switch to Base network: ${error.message}`);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4">
        {/* Wallet Status */}
        <div className="mb-4 p-3 bg-gray-800 rounded-lg text-sm">
          <p><strong>Wallet Status:</strong></p>
          <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
          <p>Address: {address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 'Not connected'}</p>
          <p>Contract: {CONTRACTS.FarcasterPromo.substring(0, 6)}...{CONTRACTS.FarcasterPromo.substring(CONTRACTS.FarcasterPromo.length - 4)}</p>
          
          {/* Debug Panel */}
          <div className="mt-3 p-2 bg-red-900 bg-opacity-50 rounded border border-red-500">
            <p className="text-red-300 font-bold text-xs">🔧 DEBUG INFO:</p>
            <p className="text-red-200 text-xs">Balance: {balanceLoading ? 'Loading...' : balanceError ? `Error: ${balanceError.message}` : balance?.toString() || '0'}</p>
            <p className="text-red-200 text-xs">Allowance: {allowanceLoading ? 'Loading...' : allowanceError ? `Error: ${allowanceError.message}` : allowance?.toString() || '0'}</p>
            <p className="text-red-200 text-xs">Needs Approval: {needsApproval(BigInt(10000) * BigInt(10 ** 18)) ? 'Yes' : 'No'}</p>
            <p className="text-red-200 text-xs">CHESS Token: {CONTRACTS.CHESS_TOKEN.substring(0, 6)}...{CONTRACTS.CHESS_TOKEN.substring(CONTRACTS.CHESS_TOKEN.length - 4)}</p>
            <p className="text-red-200 text-xs">Approving: {isApproving ? 'Yes' : 'No'}</p>
            <p className="text-red-200 text-xs">Approve Success: {isApproveSuccess ? 'Yes' : 'No'}</p>
            {approveError && <p className="text-red-400 text-xs">Approve Error: {approveError.message}</p>}
            
            <button
              onClick={() => {
                console.log('🔍 FULL DEBUG DUMP:', {
                  address,
                  isConnected,
                  balance: balance?.toString(),
                  allowance: allowance?.toString(),
                  balanceError: balanceError?.message,
                  allowanceError: allowanceError?.message,
                  balanceLoading,
                  allowanceLoading,
                  isApproving,
                  isApproveSuccess,
                  approveError: approveError?.message,
                  contracts: CONTRACTS,
                  promotion,
                  promotionId,
                  newCampaignData
                });
              }}
              className="mt-2 px-2 py-1 bg-red-700 hover:bg-red-600 text-white text-xs rounded"
            >
              📋 Log Full Debug
            </button>
          </div>
          
          {/* Farcaster Miniapp Wallet Status */}
          {!isConnected && (
            <div className="mt-2 space-y-2">
              <div className="p-3 bg-yellow-900 bg-opacity-50 rounded border border-yellow-500">
                <p className="text-yellow-300 font-bold text-sm">📱 Farcaster Miniapp</p>
                <p className="text-yellow-200 text-xs">Wallet should connect automatically</p>
                <p className="text-yellow-200 text-xs">If not connected, try refreshing the app</p>
              </div>
              
                          <button
              onClick={() => {
                console.log('🔄 Attempting to refresh wallet connection...');
                // Force wallet refresh
                window.location.reload();
              }}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              🔄 Refresh Wallet Connection
            </button>
            
            <button
              onClick={() => {
                console.log('🧪 Testing wallet connection...');
                console.log('Wallet status:', {
                  isConnected,
                  address,
                  balance: balance?.toString(),
                  allowance: allowance?.toString()
                });
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              🧪 Test Wallet Connection
            </button>
            </div>
          )}

          {/* Farcaster Miniapp Network Info */}
          {isConnected && (
            <div className="mt-2">
              <div className="p-2 bg-green-900 bg-opacity-50 rounded border border-green-500">
                <p className="text-green-300 font-bold text-xs">✅ Wallet Connected</p>
                <p className="text-green-200 text-xs">Farcaster Miniapp Wallet</p>
                <p className="text-green-200 text-xs">Network: Base (automatic)</p>
              </div>
            </div>
          )}
          
          {/* CHESS Token Balance - Only show for funding, not creation */}
          {promotionId !== 'new' && (
            <>
              <p>CHESS Balance: {balance ? `${(Number(balance) / 1e18).toFixed(2)}` : '0'} $CHESS</p>
              {promotion && (
                <p>Required: {formatNumber(Number(promotion.total_budget))} $CHESS</p>
              )}
              {promotion && (
                <p>Approved: {needsApproval(BigInt(promotion.total_budget) * BigInt(10 ** 18)) ? 'No' : 'Yes'}</p>
              )}
            </>
          )}
          
          {/* Approval Success/Error Status - Only for funding */}
          {promotionId !== 'new' && isApproveSuccess && (
            <p className="text-green-400">✓ Approval successful!</p>
          )}
          {promotionId !== 'new' && approveError && (
            <p className="text-red-400">✗ Approval failed: {approveError.message}</p>
          )}
          
          {campaignLoading ? (
            <span className="text-yellow-400">Checking campaign...</span>
          ) : campaignExists ? (
            <span className="text-green-400">Campaign {promotionId} exists ✓</span>
          ) : (
            <span className="text-red-400">Campaign {promotionId} not found ✗</span>
          )}
          <br />
          {createSimulationData && (
            <span className="text-blue-400">Create Gas: {createSimulationData.request.gas?.toString()}</span>
          )}
          {!createSimulationData && promotionId === 'new' && newCampaignData && (
            <span className="text-orange-400">Simulation not ready - use manual create</span>
          )}
          <br />
          {isApproving && <span className="text-yellow-400">Approving...</span>}
          <br />
        </div>

        {/* Campaign Creation Notice */}
        {promotionId === 'new' && !newCampaignData && (
          <div className="flex items-center gap-2 text-red-400 mb-4 p-3 bg-red-900 bg-opacity-20 rounded-lg">
            <FiAlertCircle />
            <div className="text-sm">
              <p>New campaign data is missing.</p>
              <p className="text-xs mt-1">Please try again or contact support.</p>
            </div>
          </div>
        )}

        {promotionId !== 'new' && !promotion && !promotionLoading && (
          <div className="flex items-center gap-2 text-yellow-400 mb-4 p-3 bg-yellow-900 bg-opacity-20 rounded-lg">
            <FiAlertCircle />
            <div className="text-sm">
              <p>Promotion {promotionId} does not exist in database.</p>
              <p className="text-xs mt-1">Check if the promotion was created correctly in Neon DB.</p>
            </div>
          </div>
        )}

        {promotionId !== 'new' && promotion && promotion.status !== 'active' && (
          <div className="flex items-center gap-2 text-orange-400 mb-4 p-3 bg-orange-900 bg-opacity-20 rounded-lg">
            <FiAlertCircle />
            <div className="text-sm">
              <p>Promotion {promotionId} is not active.</p>
              <p className="text-xs mt-1">Current status: {promotion.status}</p>
            </div>
          </div>
        )}

        {promotionId !== 'new' && !campaignExists && !campaignLoading && promotion && promotion.status === 'active' && (
          <div className="flex items-center gap-2 text-blue-400 mb-4 p-3 bg-blue-900 bg-opacity-20 rounded-lg">
            <FiAlertCircle />
            <div className="text-sm">
              <p>Promotion exists in DB but not on blockchain.</p>
              <p className="text-xs mt-1">Create the blockchain campaign to enable funding.</p>
            </div>
          </div>
        )}

        {/* Campaign Creation Form */}
        {((promotionId === 'new' && newCampaignData) || (promotionId !== 'new' && !campaignExists && promotion && promotion.status === 'active')) && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {promotionId === 'new' ? 'Create New Campaign' : 'Create Blockchain Campaign'}
            </h3>
            
            {campaignLoading && !loadingTimeout && (
              <div className="mb-4 p-3 bg-blue-900 bg-opacity-20 rounded-lg">
                <p className="text-blue-400 text-sm">Checking blockchain campaign status...</p>
              </div>
            )}
            
            {loadingTimeout && (
              <div className="mb-4 p-3 bg-yellow-900 bg-opacity-20 rounded-lg">
                <p className="text-yellow-400 text-sm">Loading timeout. You can still create the campaign.</p>
              </div>
            )}
            
            {/* Reward Per Share Buttons - only for existing campaigns */}
            {promotionId !== 'new' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reward Per Share: {formatNumber(rewardPerShare)} $CHESS
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleRewardPerShareChange(1000)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      rewardPerShare === 1000
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    1K $CHESS
                  </button>
                  <button
                    onClick={() => handleRewardPerShareChange(5000)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      rewardPerShare === 5000
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    5K $CHESS
                  </button>
                  <button
                    onClick={() => handleRewardPerShareChange(10000)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      rewardPerShare === 10000
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    10K $CHESS
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Amount users receive for each share (divisible)
                </p>
              </div>
            )}

            {/* Campaign Summary */}
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Campaign Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Cast URL:</span>
                  <span className="text-white truncate max-w-[200px]">
                    {promotionId === 'new' 
                      ? (newCampaignData?.castUrl.startsWith('http') ? newCampaignData.castUrl : `https://warpcast.com/~/conversations/${newCampaignData?.castUrl}`)
                      : (promotion?.cast_url.startsWith('http') ? promotion.cast_url : `https://warpcast.com/~/conversations/${promotion?.cast_url}`)
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Share Text:</span>
                  <span className="text-white">"{promotionId === 'new' ? (newCampaignData?.shareText || 'Share this promotion!') : (promotion?.share_text || 'Share this promotion!')}"</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Reward Per Share:</span>
                  <span className="text-green-400">{formatNumber(promotionId === 'new' ? (newCampaignData?.rewardPerShare || 0) : rewardPerShare)} $CHESS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Budget:</span>
                  <span className="text-blue-400">{formatNumber(promotionId === 'new' ? (newCampaignData?.totalBudget || 0) : (promotion?.total_budget || 0))} $CHESS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Divisible:</span>
                  <span className="text-green-400">Yes ✓</span>
                </div>
              </div>
            </div>

            {/* Create Campaign Button */}
            <button
              onClick={handleCreateCampaign}
              disabled={isCreatingCampaign || isCreatingCampaignFromHook || isSavingToDb}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {isCreatingCampaign || isCreatingCampaignFromHook ? 'Creating Campaign...' : 
               isSavingToDb ? 'Saving to Database...' : 
               promotionId === 'new' ? 'Create New Campaign' : 'Create Blockchain Campaign'}
            </button>

            {/* Test Button - Only for new campaigns */}
            {promotionId === 'new' && newCampaignData && (
              <button
                onClick={() => {
                  // Test with minimal values
                  const testArgs = [
                    'https://warpcast.com/~/conversations/test',
                    'Test campaign',
                    BigInt(1), // 1 wei reward per share
                    BigInt(1000), // 1000 wei total budget
                    true
                  ]
                  console.log('Testing with minimal values:', testArgs)
                  createCampaign({
                    address: CONTRACTS.FarcasterPromo as `0x${string}`,
                    abi: FARCASTER_PROMO_ABI,
                    functionName: 'createCampaign',
                    args: testArgs
                  })
                }}
                disabled={isCreatingCampaign || isCreatingCampaignFromHook}
                className="w-full mt-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Test with Minimal Values
              </button>
            )}

            {/* Manual Create Button - Bypass simulation */}
            {promotionId === 'new' && newCampaignData && (
              <button
                onClick={() => {
                  console.log('Manual campaign creation with data:', newCampaignData)
                  const args = [
                    newCampaignData.castUrl.startsWith('http') ? newCampaignData.castUrl : `https://warpcast.com/~/conversations/${newCampaignData.castUrl}`,
                    newCampaignData.shareText || 'Share this promotion!',
                    BigInt(newCampaignData.rewardPerShare) * BigInt(10 ** 18),
                    BigInt(newCampaignData.totalBudget) * BigInt(10 ** 18),
                    true
                  ]
                  console.log('Manual create args:', args)
                  createCampaign({
                    address: CONTRACTS.FarcasterPromo as `0x${string}`,
                    abi: FARCASTER_PROMO_ABI,
                    functionName: 'createCampaign',
                    args: args
                  })
                }}
                disabled={isCreatingCampaign || isCreatingCampaignFromHook}
                className="w-full mt-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Create Campaign (Manual)
              </button>
            )}

            {/* Note about CHESS funding */}
            <div className="mt-4 p-3 bg-blue-900 bg-opacity-20 rounded-lg">
              <p className="text-xs text-blue-400">
                <strong>Note:</strong> Campaign creation is free. CHESS token funding will be available after campaign creation.
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 mb-4 p-3 bg-red-900 bg-opacity-20 rounded-lg">
            <FiAlertCircle />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
          {campaignExists && promotion && (
            <>
              {/* Approval Button for Funding */}
              {needsApproval(BigInt(10000) * BigInt(10 ** 18)) && (
                <button
                  onClick={() => {
                    console.log('🎯 Approve button clicked');
                    console.log('📋 Approve parameters:', {
                      spender: CONTRACTS.FarcasterPromo,
                      amount: BigInt(10000) * BigInt(10 ** 18)
                    });
                    
                    approve([
                      CONTRACTS.FarcasterPromo as `0x${string}`,
                      BigInt(10000) * BigInt(10 ** 18)  // 10K CHESS allowance
                    ]);
                  }}
                  disabled={isApproving}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  {isApproving ? 'Approving...' : 'Approve CHESS'}
                </button>
              )}
              
              {/* Fund Campaign Button */}
              {!needsApproval(BigInt(promotion.total_budget) * BigInt(10 ** 18)) && (
                <button
                  onClick={() => onPaymentComplete(promotion.total_budget, '')}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Fund Campaign
                </button>
              )}
            </>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-4 p-3 bg-yellow-900 bg-opacity-20 rounded-lg">
          <p className="text-xs text-yellow-400">
            <strong>Security Notice:</strong> This transaction creates a campaign on the blockchain. 
            Make sure all details are correct before proceeding.
          </p>
        </div>
      </div>
    </div>
  )
} 