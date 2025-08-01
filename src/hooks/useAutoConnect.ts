"use client"

import { useEffect } from 'react'
import { useConnect, useAccount } from 'wagmi'

export function useAutoConnect() {
  const { connect, connectors } = useConnect()
  const { isConnected } = useAccount()

  useEffect(() => {
    // Auto-connect to the first available connector if not already connected
    if (!isConnected && connectors.length > 0) {
      const injectedConnector = connectors.find(connector => connector.name === 'Injected')
      if (injectedConnector) {
        connect({ connector: injectedConnector })
      }
    }
  }, [isConnected, connectors, connect])

  return { isConnected }
} 