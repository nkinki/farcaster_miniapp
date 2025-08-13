"use client"

import { useState, useEffect } from "react"
import { FiZap } from "react-icons/fi"

interface AnimatedLogoProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export default function AnimatedLogo({ size = "md", className = "" }: AnimatedLogoProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([])

  useEffect(() => {
    // Generate random particles for the logo effect
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2
    }))
    setParticles(newParticles)
  }, [])

  const sizeClasses = {
    sm: "w-8 h-8 text-lg",
    md: "w-12 h-12 text-xl",
    lg: "w-16 h-16 text-2xl"
  }

  return (
    <div 
      className={`relative ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Logo */}
      <div 
        className={`
          ${sizeClasses[size]} 
          bg-gradient-to-r from-purple-500 to-cyan-500 
          rounded-xl flex items-center justify-center 
          transition-all duration-300 cursor-pointer
          ${isHovered ? 'shadow-2xl shadow-purple-500/50 scale-110' : 'shadow-lg shadow-purple-500/25'}
        `}
      >
        <FiZap 
          className={`text-white transition-all duration-300 ${isHovered ? 'rotate-12 scale-110' : ''}`} 
        />
      </div>

      {/* Animated Particles */}
      {isHovered && particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-1 h-1 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full animate-ping"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: '1s'
          }}
        />
      ))}

      {/* Glow Effect */}
      <div 
        className={`
          absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500 
          rounded-xl blur-md opacity-0 transition-opacity duration-300
          ${isHovered ? 'opacity-30' : ''}
        `}
        style={{ zIndex: -1 }}
      />
    </div>
  )
}