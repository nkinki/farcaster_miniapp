"use client"

import { useState } from 'react'

interface LotteryButtonProps {
  onClick: () => void
}

export default function LotteryButton({ onClick }: LotteryButtonProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: isHovered ? 'rgba(255, 193, 7, 0.9)' : 'rgba(255, 193, 7, 0.7)',
        color: '#000',
        border: 'none',
        borderRadius: '50px',
        padding: '12px 20px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: isHovered 
          ? '0 8px 25px rgba(255, 193, 7, 0.4)' 
          : '0 4px 15px rgba(255, 193, 7, 0.3)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        minWidth: '120px',
        justifyContent: 'center'
      }}
    >
      <span style={{ fontSize: '18px' }}>🎰</span>
      <span>LOTTÓ</span>
    </button>
  )
}
