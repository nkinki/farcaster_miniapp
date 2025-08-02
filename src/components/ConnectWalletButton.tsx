"use client"

import { useAccount, useConnect, useDisconnect } from "wagmi"
import { Button } from "@/components/ui/button" // Assuming shadcn/ui Button

export function ConnectWalletButton() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, status, error } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-300">
        <span>Wallet: ✅ Connected</span>
        <span className="text-xs text-gray-400">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <Button onClick={() => disconnect()} variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <span className="text-sm text-gray-300">Wallet: ❌ Not Connected</span>
      {connectors.map((connector) => (
        <Button
          key={connector.uid}
          onClick={() => connect({ connector })}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm"
          disabled={status === "pending"}
        >
          {connector.name}
          {status === "pending" && " (connecting)"}
        </Button>
      ))}
      {error && <div className="text-red-400 text-xs mt-1">{error.message}</div>}
    </div>
  )
}
