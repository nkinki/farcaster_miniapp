"use client"

import { useEffect, useState } from 'react'
import { useConnect, useAccount } from 'wagmi'

export function useAutoConnect() {
  const { connect, connectors } = useConnect()
  const { isConnected, address } = useAccount()
  const [isAutoConnecting, setIsAutoConnecting] = useState(false)

  useEffect(() => {
    console.log('useAutoConnect: isConnected =', isConnected)
    console.log('useAutoConnect: address =', address)
    console.log('useAutoConnect: connectors =', connectors.map(c => c.name))
    
    // Auto-connect to the first available connector if not already connected
    if (!isConnected && connectors.length > 0 && !isAutoConnecting) {
      setIsAutoConnecting(true)
      
      // Try injected connector first (MetaMask)
      const injectedConnector = connectors.find(connector => connector.name === 'Injected')
      if (injectedConnector) {
        console.log('useAutoConnect: Trying to connect with Injected connector')
        connect({ connector: injectedConnector })
      } else {
        // Fallback to first available connector
        console.log('useAutoConnect: Trying to connect with first available connector')
        connect({ connector: connectors[0] })
      }
    }
  }, [isConnected, connectors, connect, isAutoConnecting])

  // Reset auto-connecting flag when connection changes
  useEffect(() => {
    if (isConnected) {
      setIsAutoConnecting(false)
    }
  }, [isConnected])

  return { isConnected, address, isAutoConnecting }
}