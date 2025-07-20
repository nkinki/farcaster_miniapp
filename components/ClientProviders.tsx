'use client'

import React from 'react'

interface ClientProvidersProps {
  children: React.ReactNode
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {children}
    </div>
  )
} 