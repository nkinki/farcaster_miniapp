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
}

export default function PaymentForm({ promotionId, onPaymentComplete, onCancel }: PaymentFormProps) {
  const [rewardPerShare, setRewardPerShare] = useState<number>(10000) // Default 10k
  const [error, setError] = useState<string>("")
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false)

  // Wagmi hooks
  const { address, isConnected } = useAccount()
  const { fundCampaign, isFundingCampaign, fundCampaignHash, createCampaign, isCreatingCampaign: isCreatingCampaignFromHook, createCampaignHash: createCampaignData } = useFarcasterPromo()
  const { balance, allowance, approve, isApproving, needsApproval } = useChessToken()

  // Neon DB promotion data
  const { promotion, loading: promotionLoading, error: promotionError } = usePromotion(Number(promotionId))

  // Blockchain campaign check (for compatibility)
  const { exists: campaignExists, campaign: blockchainCampaign, error: campaignError, isLoading: campaignLoading } = useCampaignExists(BigInt(promotionId))

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

  // Simulate campaign creation
  const { data: createSimulationData, error: createSimulationError } = useSimulateContract({
    address: CONTRACTS.FarcasterPromo as `0x${string}`,
    abi: FARCASTER_PROMO_ABI,
    functionName: 'createCampaign',
    args: promotion ? [
      promotion.cast_url.startsWith('http') ? promotion.cast_url : `https://warpcast.com/~/conversations/${promotion.cast_url}`,
      promotion.share_text || 'Share this promotion!',
      BigInt(rewardPerShare),
      BigInt(promotion.total_budget),
      true // divisible
    ] : undefined,
    query: {
      enabled: isConnected && !!promotion && !campaignExists && !campaignLoading,
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

    if (!promotion) {
      setError(`Promotion ${promotionId} does not exist in database`)
      return
    }

    if (promotion.status !== 'active') {
      setError(`Promotion ${promotionId} is not active (status: ${promotion.status})`)
      return
    }

    setError("")

    try {
      setIsCreatingCampaign(true)
      console.log('Creating blockchain campaign for promotion:', promotion)
      
      // Check for simulation errors first
      if (createSimulationError) {
        if (createSimulationError.message.includes("insufficient funds")) {
          setError("Insufficient ETH for gas fees.")
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
      console.log('Campaign created successfully:', createCampaignData)
      setIsCreatingCampaign(false)
      // Refresh campaign status after creation
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    }
  }, [createCampaignData])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4">
        {/* Wallet Status */}
        <div className="mb-4 p-3 bg-gray-800 rounded-lg text-sm">
          <p><strong>Wallet Status:</strong></p>
          <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
          <p>Address: {address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 'Not connected'}</p>
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
        {!promotion && !promotionLoading && (
          <div className="flex items-center gap-2 text-yellow-400 mb-4 p-3 bg-yellow-900 bg-opacity-20 rounded-lg">
            <FiAlertCircle />
            <div className="text-sm">
              <p>Promotion {promotionId} does not exist in database.</p>
              <p className="text-xs mt-1">Check if the promotion was created correctly in Neon DB.</p>
            </div>
          </div>
        )}

        {promotion && promotion.status !== 'active' && (
          <div className="flex items-center gap-2 text-orange-400 mb-4 p-3 bg-orange-900 bg-opacity-20 rounded-lg">
            <FiAlertCircle />
            <div className="text-sm">
              <p>Promotion {promotionId} is not active.</p>
              <p className="text-xs mt-1">Current status: {promotion.status}</p>
            </div>
          </div>
        )}

        {!campaignExists && !campaignLoading && promotion && promotion.status === 'active' && (
          <div className="flex items-center gap-2 text-blue-400 mb-4 p-3 bg-blue-900 bg-opacity-20 rounded-lg">
            <FiAlertCircle />
            <div className="text-sm">
              <p>Promotion exists in DB but not on blockchain.</p>
              <p className="text-xs mt-1">Create the blockchain campaign to enable funding.</p>
            </div>
          </div>
        )}

        {/* Campaign Creation Form */}
        {!campaignExists && promotion && promotion.status === 'active' && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Create Blockchain Campaign</h3>
            
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
            
            {/* Reward Per Share Buttons */}
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

            {/* Campaign Summary */}
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Campaign Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Cast URL:</span>
                  <span className="text-white truncate max-w-[200px]">
                    {promotion.cast_url.startsWith('http') ? promotion.cast_url : `https://warpcast.com/~/conversations/${promotion.cast_url}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Share Text:</span>
                  <span className="text-white">"{promotion.share_text || 'Share this promotion!'}"</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Reward Per Share:</span>
                  <span className="text-green-400">{formatNumber(rewardPerShare)} $CHESS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Budget:</span>
                  <span className="text-blue-400">{formatNumber(promotion.total_budget)} $CHESS</span>
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
              disabled={isCreatingCampaign || isCreatingCampaignFromHook}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {isCreatingCampaign || isCreatingCampaignFromHook ? 'Creating Campaign...' : 'Create Blockchain Campaign'}
            </button>
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