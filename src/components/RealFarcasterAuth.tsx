'use client'

import React from 'react'
import { Demo } from '@farcaster/auth-kit'

export const RealFarcasterAuth: React.FC = () => {
  return (
    <div className="flex justify-center items-center p-4">
      <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30">
        <h3 className="text-white text-lg font-bold mb-4 text-center">
          🔐 Real Farcaster Login
        </h3>
        <Demo />
      </div>
    </div>
  )
} 