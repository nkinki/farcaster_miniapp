"use client"

import React from "react"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { FiCreditCard, FiLogOut } from "react-icons/fi"

export default function ConnectWallet() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-300">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </div>
        <button
          onClick={() => disconnect()}
          className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          <FiLogOut size={16} />
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect({ connector })}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <FiCreditCard size={16} />
          {isPending ? "Connecting..." : `Connect ${connector.name}`}
        </button>
      ))}
    </div>
  )
} 