"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"

export default function DiamondCard() {
    const cardRef = useRef<HTMLDivElement>(null)
    const [rotate, setRotate] = useState({ x: 0, y: 0 })
    const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 })

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return

        const rect = cardRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        // Calculate rotation (-15 to 15 degrees)
        const rotateX = ((y / rect.height) - 0.5) * -30
        const rotateY = ((x / rect.width) - 0.5) * 30

        setRotate({ x: rotateX, y: rotateY })

        // Calculate glare position
        const glareX = (x / rect.width) * 100
        const glareY = (y / rect.height) * 100
        setGlare({ x: glareX, y: glareY, opacity: 0.6 })
    }

    const handleMouseLeave = () => {
        setRotate({ x: 0, y: 0 })
        setGlare(prev => ({ ...prev, opacity: 0 }))
    }

    // Mobile tilt support
    useEffect(() => {
        const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
            if (e.beta === null || e.gamma === null) return

            // Limit to reasonable tilt ranges
            const rotateX = Math.max(-20, Math.min(20, (e.beta - 45)))
            const rotateY = Math.max(-20, Math.min(20, e.gamma))

            setRotate({ x: rotateX, y: rotateY })
            setGlare({
                x: (rotateY + 20) * 2.5,
                y: (rotateX + 20) * 2.5,
                opacity: 0.4
            })
        }

        window.addEventListener('deviceorientation', handleDeviceOrientation)
        return () => window.removeEventListener('deviceorientation', handleDeviceOrientation)
    }, [])

    return (
        <div className="perspective-1000 w-full flex justify-center py-8">
            <div
                ref={cardRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                    transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
                    transition: rotate.x === 0 ? "transform 0.5s ease-out" : "none"
                }}
                className="relative w-full max-w-[320px] aspect-[1/1] rounded-2xl overflow-hidden shadow-2xl cursor-pointer preserve-3d border border-cyan-500/30 ring-1 ring-white/10"
            >
                {/* Main Card Image */}
                <Image
                    src="/diamond-vip.png"
                    alt="AppRank Diamond VIP"
                    layout="fill"
                    objectFit="cover"
                    className="pointer-events-none"
                />

                {/* Glare/Shine Effect */}
                <div
                    style={{
                        background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity}) 0%, transparent 60%)`,
                        transition: glare.opacity === 0 ? "opacity 0.5s ease-out" : "none"
                    }}
                    className="absolute inset-0 pointer-events-none z-10"
                />

                {/* Holographic Overlays */}
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-purple-500/10 mix-blend-overlay pointer-events-none" />
            </div>
        </div>
    )
}
