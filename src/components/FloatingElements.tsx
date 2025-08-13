"use client"

import { useEffect, useState } from "react"

interface FloatingElement {
  id: number
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  color: string
}

export default function FloatingElements() {
  const [elements, setElements] = useState<FloatingElement[]>([])

  useEffect(() => {
    // Generate floating elements
    const newElements: FloatingElement[] = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      speed: Math.random() * 20 + 10,
      opacity: Math.random() * 0.3 + 0.1,
      color: Math.random() > 0.5 ? 'purple' : 'cyan'
    }))
    setElements(newElements)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -1 }}>
      {elements.map((element) => (
        <div
          key={element.id}
          className={`absolute rounded-full blur-sm animate-float-${element.id % 3}`}
          style={{
            left: `${element.x}%`,
            top: `${element.y}%`,
            width: `${element.size}px`,
            height: `${element.size}px`,
            background: element.color === 'purple' 
              ? `radial-gradient(circle, rgba(168, 85, 247, ${element.opacity}) 0%, transparent 70%)`
              : `radial-gradient(circle, rgba(34, 211, 238, ${element.opacity}) 0%, transparent 70%)`,
            animationDuration: `${element.speed}s`,
            animationDelay: `${Math.random() * 5}s`
          }}
        />
      ))}
      
      {/* Custom CSS for floating animations */}
      <style jsx>{`
        @keyframes float-0 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes float-1 {
          0%, 100% { transform: translateX(0px) rotate(0deg); }
          50% { transform: translateX(20px) rotate(-180deg); }
        }
        @keyframes float-2 {
          0%, 100% { transform: translate(0px, 0px) rotate(0deg); }
          33% { transform: translate(15px, -15px) rotate(120deg); }
          66% { transform: translate(-15px, 15px) rotate(240deg); }
        }
        .animate-float-0 { animation: float-0 linear infinite; }
        .animate-float-1 { animation: float-1 linear infinite; }
        .animate-float-2 { animation: float-2 linear infinite; }
      `}</style>
    </div>
  )
}