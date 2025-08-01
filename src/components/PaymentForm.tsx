"use client"

import React, { useState, useEffect } from "react"
import { FiDollarSign, FiCreditCard, FiCheck, FiAlertCircle } from "react-icons/fi"
import { CONTRACTS } from "@/config/contracts"
import { useFarcasterPromo, useCampaignExists } from "@/hooks/useFarcasterPromo"
import { useChessToken } from "@/hooks/useChessToken"
import { usePromotion } from "@/hooks/usePromotions"
import { useAccount, useSimulateContract } from "wagmi"
import FARCASTER_PROMO_ABI from "../../abis/FarcasterPromo.json"

interface PaymentFormProps {
  promotionId: string
  onPaymentComplete: (amount: number, txHash: string) => void
  onCancel: () => void
}

const PAYMENT_OPTIONS = [
  { value: 10000, label: "10K $CHESS" },
  { value: 100000, label: "100K $CHESS" },
  { value: 500000, label: "500K $CHESS" },
  { value: 1000000, label: "1M $CHESS" },
  { value: 5000000, label: "5M $CHESS" },
  { value: 10000000, label: "10M $CHESS" },
]

export default function PaymentForm({ promotionId, onPaymentComplete, onCancel }: PaymentFormProps) {
  const [selectedAmount, setSelectedAmount] = useState<number>(10000)
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
  
  const finalAmount = selectedAmount

  // Simulate contract call for gas estimation
  const { data: simulationData, error: simulationError } = useSimulateContract({
    address: CONTRACTS.FarcasterPromo as `0x${string}`,
    abi: FARCASTER_PROMO_ABI,
    functionName: 'fundCampaign',
    args: [BigInt(promotionId), BigInt(finalAmount)],
    query: {
      enabled: isConnected && finalAmount > 0,
    },
  })

  // Simulate campaign creation
  const { data: createSimulationData, error: createSimulationError } = useSimulateContract({
    address: CONTRACTS.FarcasterPromo as `0x${string}`,
    abi: FARCASTER_PROMO_ABI,
    functionName: 'createCampaign',
    args: promotion ? [
      promotion.cast_url,
      promotion.share_text || '',
      BigInt(promotion.reward_per_share),
      BigInt(promotion.total_budget),
      true // divisible
    ] : undefined,
    query: {
      enabled: isConnected && !!promotion && !campaignExists,
    },
  })

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount)
  }

  const formatNumber = (num: number | bigint): string => {
    const numValue = typeof num === 'bigint' ? Number(num) : num
    if (numValue >= 1000000) {
      return `${(numValue / 1000000).toFixed(1)}M`
    } else if (numValue >= 1000) {
      return `${(numValue / 1000).toFixed(1)}K`
    }
    return numValue.toString()
  }

  const handlePayment = async () => {
    if (!isConnected) {
      setError("Please connect your wallet first")
      return
    }

    if (selectedAmount <= 0) {
      setError("Please select a valid amount")
      return
    }

    if (BigInt(selectedAmount) > balance) {
      setError("Insufficient CHESS balance")
      return
    }

    // Check if promotion exists in Neon DB
    if (!promotion) {
      setError(`Promotion ${promotionId} does not exist in database`)
      return
    }

    // Check if promotion is active
    if (promotion.status !== 'active') {
      setError(`Promotion ${promotionId} is not active (status: ${promotion.status})`)
      return
    }

    // Check if enough budget remains
    if (selectedAmount > promotion.remaining_budget) {
      setError(`Insufficient budget. Remaining: ${promotion.remaining_budget}, Requested: ${selectedAmount}`)
      return
    }

    setError("")

    try {
      const amount = BigInt(finalAmount)

      console.log('PaymentForm debug:', {
        amount: amount.toString(),
        allowance: allowance.toString(),
        needsApproval: needsApproval(amount),
        farcasterPromoAddress: CONTRACTS.FarcasterPromo,
        simulationError: simulationError?.message,
        simulationData: simulationData,
        gasEstimate: simulationData?.request?.gas?.toString(),
        promotion,
        campaignExists,
        campaignId: promotionId,
      })

      // Check for simulation errors first
      if (simulationError) {
        if (simulationError.message.includes("insufficient funds")) {
          setError("Insufficient ETH for gas fees.")
        } else {
          setError(`Transaction simulation failed: ${simulationError.message}`)
        }
        return
      }

      // Check if approval is needed
      if (needsApproval(amount)) {
        console.log('Approval needed, calling approve...')
        approve([CONTRACTS.FarcasterPromo, amount])
        return
      }

      // Use simulation request directly
      if (simulationData?.request) {
        console.log('No approval needed, calling fundCampaign with simulation request...')
        fundCampaign(simulationData.request)
      } else {
        setError("Transaction simulation not ready")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed")
    }
  }

  // Handle successful approval
  useEffect(() => {
    if (isApproving) {
      console.log('Approval in progress...')
    }
  }, [isApproving])

  // Handle successful funding
  useEffect(() => {
    if (fundCampaignHash) {
      onPaymentComplete(selectedAmount, fundCampaignHash)
    }
  }, [fundCampaignHash, selectedAmount, onPaymentComplete])

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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FiDollarSign className="text-purple-400" />
            Fund Campaign
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Wallet Status */}
        <div className="mb-6 p-3 bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <FiDollarSign className="text-blue-400" />
            <span className="text-gray-300">
              {isConnected ? "Wallet Connected" : "Wallet Not Connected"}
            </span>
          </div>
          {isConnected && (
            <div className="mt-2 text-xs text-gray-400">
              Address: {address?.slice(0, 6)}...{address?.slice(-4)}
              <br />
              Balance: {formatNumber(balance)} CHESS
              <br />
              Allowance: {formatNumber(allowance)} CHESS
              <br />
              {simulationData?.request?.gas && (
                <>
                  Gas Estimate: {simulationData.request.gas.toString()}
                  <br />
                </>
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
              <button
                onClick={() => {
                  console.log('Debug info:', {
                    balance: balance.toString(),
                    allowance: allowance.toString(),
                    selectedAmount,
                    farcasterPromoAddress: CONTRACTS.FarcasterPromo,
                    simulationData,
                    gasEstimate: simulationData?.request?.gas?.toString(),
                    promotion,
                    campaignExists,
                    campaignId: promotionId,
                    blockchainCampaign,
                    campaignError,
                  })
                }}
                className="text-xs text-blue-400 hover:text-blue-300 mt-1"
              >
                Debug Info
              </button>
            </div>
          )}
          {!isConnected && (
            <div className="mt-2 text-xs text-red-400">
              Please connect your wallet to fund campaigns
            </div>
          )}
        </div>

        {/* Debug Info */}
        <div className="mt-4 p-3 bg-gray-800 rounded-lg">
          <div className="text-xs text-gray-400">
            <p><strong>Debug Info:</strong></p>
            <p>Promotion ID: {promotionId}</p>
            <p>Promotion Exists: {promotion ? 'Yes' : 'No'}</p>
            <p>Promotion Loading: {promotionLoading ? 'Yes' : 'No'}</p>
            {promotion && (
              <>
                <p>Promotion Status: {promotion.status}</p>
                <p>Promotion Username: {promotion.username}</p>
                <p>Remaining Budget: {promotion.remaining_budget}</p>
                <p>Total Budget: {promotion.total_budget}</p>
                <p>Reward Per Share: {promotion.reward_per_share}</p>
                <p>Cast URL: {promotion.cast_url?.substring(0, 50)}...</p>
              </>
            )}
            {promotionError && (
              <p className="text-red-400">Promotion Error: {promotionError}</p>
            )}
            <p>Blockchain Campaign Exists: {campaignExists ? 'Yes' : 'No'}</p>
            <p>Blockchain Campaign Loading: {campaignLoading ? 'Yes' : 'No'}</p>
            <p>Creating Campaign: {isCreatingCampaign || isCreatingCampaignFromHook ? 'Yes' : 'No'}</p>
            {createCampaignData && (
              <p className="text-green-400">Campaign Created: {createCampaignData}</p>
            )}
            {createSimulationData && (
              <p className="text-green-400">Create Simulation: {createSimulationData.request.gas?.toString()} gas</p>
            )}
            {createSimulationError && (
              <p className="text-red-400">Create Simulation Error: {createSimulationError.message}</p>
            )}
            {campaignError && (
              <p className="text-red-400">Blockchain Error: {campaignError.message}</p>
            )}
            <button
              onClick={async () => {
                try {
                  console.log('Testing API endpoint...')
                  const response = await fetch(`/api/promotions/${promotionId}`)
                  const data = await response.json()
                  console.log('API Response:', { status: response.status, data })
                  alert(`API Status: ${response.status}\nData: ${JSON.stringify(data, null, 2)}`)
                } catch (err) {
                  console.error('API Test Error:', err)
                  alert(`API Test Error: ${err}`)
                }
              }}
              className="text-xs text-green-400 hover:text-green-300 mt-2 bg-green-900 px-2 py-1 rounded"
            >
              Test API Endpoint
            </button>
          </div>
        </div>

        {/* Payment Options */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-purple-200 mb-3">
            Select Amount
          </label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {PAYMENT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAmountSelect(option.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  selectedAmount === option.value
                    ? "bg-purple-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>


        </div>

        {/* Payment Summary */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Campaign Budget:</span>
            <span className="text-green-400 font-semibold">
              {formatNumber(finalAmount)} $CHESS
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 mb-4 p-3 bg-red-900 bg-opacity-20 rounded-lg">
            <FiAlertCircle />
            <span className="text-sm">{error}</span>
          </div>
        )}

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
              <p className="text-xs mt-1">You need to create the blockchain campaign first.</p>
              <button
                onClick={async () => {
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
                }}
                disabled={isCreatingCampaign || isCreatingCampaignFromHook}
                className="text-xs text-blue-300 hover:text-blue-200 mt-2 bg-blue-800 px-2 py-1 rounded disabled:opacity-50"
              >
                {isCreatingCampaign || isCreatingCampaignFromHook ? 'Creating...' : 'Create Blockchain Campaign'}
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isApproving || isFundingCampaign}
            className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            disabled={isApproving || isFundingCampaign || finalAmount <= 0}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition flex items-center justify-center gap-2"
          >
            {isApproving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Approving CHESS...
              </>
            ) : isFundingCampaign ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Funding Campaign...
              </>
            ) : (
              <>
                <FiCreditCard />
                Pay {formatNumber(finalAmount)} $CHESS
              </>
            )}
          </button>
        </div>

        {/* Security Notice */}
        <div className="mt-4 p-3 bg-blue-900 bg-opacity-20 rounded-lg">
          <div className="flex items-start gap-2">
            <FiCheck className="text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-300">
              <p className="font-semibold mb-1">Secure Payment</p>
              <p>Your payment will be processed through our smart contract. No funds are held by the platform.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 