"use client"

import React, { useState, useEffect } from "react"
import { FiDollarSign, FiCreditCard, FiCheck, FiAlertCircle } from "react-icons/fi"
import { CONTRACTS } from "@/config/contracts"
import { useFarcasterPromo } from "@/hooks/useFarcasterPromo"
import { useChessToken } from "@/hooks/useChessToken"
import { useAccount } from "wagmi"

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
  
  // Wagmi hooks
  const { address, isConnected } = useAccount()
  const { fundCampaign, isFundingCampaign, fundCampaignHash } = useFarcasterPromo()
  const { balance, allowance, approve, isApproving, needsApproval } = useChessToken()

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

    setError("")

    try {
      const amount = BigInt(finalAmount)
      
      // Check if approval is needed
      if (needsApproval(amount)) {
        // Approve CHESS tokens
        approve([CONTRACTS.FarcasterPromo, amount])
        return
      }

      // Fund campaign (ETH fee will be handled by smart contract)
      fundCampaign([BigInt(promotionId), amount])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed")
    }
  }

  // Handle successful funding
  useEffect(() => {
    if (fundCampaignHash) {
      onPaymentComplete(selectedAmount, fundCampaignHash)
    }
  }, [fundCampaignHash, selectedAmount, onPaymentComplete])

  const finalAmount = selectedAmount

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
            </div>
          )}
          {!isConnected && (
            <div className="mt-2 text-xs text-red-400">
              Please connect your wallet to fund campaigns
            </div>
          )}
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