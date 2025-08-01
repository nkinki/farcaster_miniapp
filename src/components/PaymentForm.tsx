"use client"

import { useState, useEffect } from "react"
import { FiAlertCircle } from "react-icons/fi"
import { useFarcasterPromo, useCampaignExists } from "@/hooks/useFarcasterPromo"
import { useChessToken } from "@/hooks/useChessToken"
import { usePromotion } from "@/hooks/usePromotions"
import { useAccount, useSimulateContract } from "wagmi"
import FARCASTER_PROMO_ABI from "../../abis/FarcasterPromo.json"
import { CONTRACTS } from "@/config/contracts"

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
  const { balance, allowance, approve, isApproving, needsApproval, isApproveSuccess, approveError } = useChessToken()

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
      enabled: isConnected && (!!newCampaignData || (!!promotion && !campaignExists && !campaignLoading)),
    },
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

    // Check CHESS balance
    const requiredAmount = BigInt((promotionId === 'new' ? (newCampaignData?.totalBudget || 0) : (promotion?.total_budget || 0))) * BigInt(10 ** 18)
    if (balance < requiredAmount) {
      setError(`Insufficient CHESS balance. Required: ${formatNumber(Number(requiredAmount) / 1e18)}, Available: ${formatNumber(Number(balance) / 1e18)}`)
      return
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

    // Check approval
    if (needsApproval(requiredAmount)) {
      setError("Please approve CHESS token spending first")
      return
    }

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
      
      // Check for simulation errors first
      if (createSimulationError) {
        console.error('Simulation error details:', {
          message: createSimulationError.message,
          cause: createSimulationError.cause,
          name: createSimulationError.name,
          stack: createSimulationError.stack
        })
        
        if (createSimulationError.message.includes("insufficient funds")) {
          setError("Insufficient ETH for gas fees.")
        } else if (createSimulationError.message.includes("Execution reverted")) {
          setError(`Contract execution reverted. This might be due to insufficient CHESS balance, invalid parameters, or contract restrictions. Error: ${createSimulationError.message}`)
        } else {
          setError(`Campaign creation simulation failed: ${createSimulationError.message}`)
        }
        setIsCreatingCampaign(false)
        return
      }
      
      // Use simulation request directly
      if (createSimulationData?.request) {
        console.log('Creating campaign with simulation request...')
        createCampaign(createSimulationData.request)
      } else {
        setError("Campaign creation simulation not ready")
        setIsCreatingCampaign(false)
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4">
        {/* Wallet Status */}
        <div className="mb-4 p-3 bg-gray-800 rounded-lg text-sm">
          <p><strong>Wallet Status:</strong></p>
          <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
          <p>Address: {address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 'Not connected'}</p>
          <p>Contract: {CONTRACTS.FarcasterPromo.substring(0, 6)}...{CONTRACTS.FarcasterPromo.substring(CONTRACTS.FarcasterPromo.length - 4)}</p>
          
          {/* CHESS Token Balance */}
          <p>CHESS Balance: {balance ? `${(Number(balance) / 1e18).toFixed(2)}` : '0'} $CHESS</p>
          
          {/* Required Amount */}
          {((promotionId === 'new' && newCampaignData) || (promotionId !== 'new' && promotion)) && (
            <p>Required: {formatNumber(Number(promotionId === 'new' ? (newCampaignData?.totalBudget || 0) : (promotion?.total_budget || 0)))} $CHESS</p>
          )}
          
          {/* Approval Status */}
          {((promotionId === 'new' && newCampaignData) || (promotionId !== 'new' && promotion)) && (
            <p>Approved: {needsApproval(BigInt((promotionId === 'new' ? (newCampaignData?.totalBudget || 0) : (promotion?.total_budget || 0))) * BigInt(10 ** 18)) ? 'No' : 'Yes'}</p>
          )}
          
          {/* Approval Success/Error Status */}
          {isApproveSuccess && (
            <p className="text-green-400">✓ Approval successful!</p>
          )}
          {approveError && (
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

            {/* Approval Button - Show if approval is needed */}
            {((promotionId === 'new' && newCampaignData) || (promotionId !== 'new' && promotion)) && 
             needsApproval(BigInt((promotionId === 'new' ? (newCampaignData?.totalBudget || 0) : (promotion?.total_budget || 0))) * BigInt(10 ** 18)) && (
              <button
                onClick={() => approve({
                  address: CONTRACTS.CHESS_TOKEN as `0x${string}`,
                  abi: [
                    {
                      "inputs": [
                        {"internalType": "address", "name": "spender", "type": "address"},
                        {"internalType": "uint256", "name": "amount", "type": "uint256"}
                      ],
                      "name": "approve",
                      "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
                      "stateMutability": "nonpayable",
                      "type": "function"
                    }
                  ],
                  functionName: 'approve',
                  args: [
                    CONTRACTS.FarcasterPromo as `0x${string}`,
                    BigInt((promotionId === 'new' ? (newCampaignData?.totalBudget || 0) : (promotion?.total_budget || 0))) * BigInt(10 ** 18)
                  ],
                  gas: BigInt(50000) // Explicit gas limit for approval
                })}
                disabled={isApproving}
                className="w-full mt-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {isApproving ? 'Approving...' : 'Approve CHESS Token'}
              </button>
            )}

            {/* Retry Approval Button - Show if approval failed */}
            {approveError && (
              <button
                onClick={() => {
                  setError("") // Clear previous error
                  approve({
                    address: CONTRACTS.CHESS_TOKEN as `0x${string}`,
                    abi: [
                      {
                        "inputs": [
                          {"internalType": "address", "name": "spender", "type": "address"},
                          {"internalType": "uint256", "name": "amount", "type": "uint256"}
                        ],
                        "name": "approve",
                        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
                        "stateMutability": "nonpayable",
                        "type": "function"
                      }
                    ],
                    functionName: 'approve',
                    args: [
                      CONTRACTS.FarcasterPromo as `0x${string}`,
                      BigInt((promotionId === 'new' ? (newCampaignData?.totalBudget || 0) : (promotion?.total_budget || 0))) * BigInt(10 ** 18)
                    ],
                    gas: BigInt(50000) // Explicit gas limit for approval
                  })
                }}
                disabled={isApproving}
                className="w-full mt-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {isApproving ? 'Retrying...' : 'Retry Approval'}
              </button>
            )}
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
          {campaignExists && (
            <button
              onClick={() => onPaymentComplete(0, '')}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Fund Campaign
            </button>
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