"use client"

import { useState, useEffect } from 'react'
import { LotteryStats, LotteryTicket } from '@/types/lottery'
import Link from 'next/link'

export default function LotteryPage() {
  const [stats, setStats] = useState<LotteryStats | null>(null)
  const [activeTickets, setActiveTickets] = useState<LotteryTicket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [statsRes, ticketsRes] = await Promise.all([
        fetch('/api/lottery/stats'),
        fetch('/api/lottery/buy-ticket')
      ])
      
      const statsData = await statsRes.json()
      const ticketsData = await ticketsRes.json()
      
      if (statsData.success) setStats(statsData.stats)
      if (ticketsData.success) setActiveTickets(ticketsData.tickets)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🎰</div>
          <div>Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4 text-blue-400 hover:text-blue-300">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
            🎰 $CHESS Lottó
          </h1>
          <p className="text-xl text-gray-300 mt-2">
            Egy szám, minden vagy semmi!
          </p>
        </div>

        {/* Jackpot Display */}
        {stats && (
          <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-500 rounded-2xl p-8 mb-8 text-center">
            <div className="text-yellow-400 text-lg font-semibold mb-2">JACKPOT</div>
            <div className="text-5xl font-bold text-yellow-300 mb-2">
              {stats.totalJackpot.toLocaleString()} $CHESS
            </div>
            <div className="text-gray-300">
              Következő húzás: {new Date(stats.nextDrawTime).toLocaleString()}
            </div>
          </div>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <div className="text-3xl mb-2">🎫</div>
            <div className="text-2xl font-bold text-blue-400">
              {stats?.totalTickets || 0}
            </div>
            <div className="text-gray-400">Összes Sorsjegy</div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-2xl font-bold text-green-400">
              {stats?.activeTickets || 0}
            </div>
            <div className="text-gray-400">Aktív Sorsjegyek</div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-2xl font-bold text-yellow-400">
              #{stats?.lastDrawNumber || 0}
            </div>
            <div className="text-gray-400">Utolsó Húzás</div>
          </div>
        </div>

        {/* How to Play */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-yellow-400 mb-4">🎯 Hogyan Játszol?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-4xl mb-2">1️⃣</div>
              <div className="font-semibold text-lg mb-2">Válassz Számot</div>
              <div className="text-gray-400">1-100 között</div>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">2️⃣</div>
              <div className="font-semibold text-lg mb-2">Vásárold a Sorsjegyet</div>
              <div className="text-gray-400">20,000 $CHESS</div>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">3️⃣</div>
              <div className="font-semibold text-lg mb-2">Várd a Húzást</div>
              <div className="text-gray-400">Minden este 20:00</div>
            </div>
          </div>
        </div>

        {/* Active Tickets */}
        {activeTickets.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-blue-400 mb-4">
              🎫 Aktív Sorsjegyek ({activeTickets.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {activeTickets.slice(0, 24).map((ticket, index) => (
                <div key={index} className="bg-gray-700 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-yellow-400">#{ticket.number}</div>
                  <div className="text-xs text-gray-400 truncate">{ticket.playerName}</div>
                </div>
              ))}
              {activeTickets.length > 24 && (
                <div className="bg-gray-700 rounded-lg p-3 text-center flex items-center justify-center">
                  <div className="text-sm text-gray-400">
                    +{activeTickets.length - 24} több
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Coming Soon Message */}
        <div className="text-center mt-12 p-8 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl border border-purple-500/30">
          <div className="text-4xl mb-4">🚀</div>
          <h3 className="text-2xl font-bold text-purple-300 mb-2">
            Hamarosan Elérhető!
          </h3>
          <p className="text-gray-300 mb-4">
            A lottó rendszer fejlesztés alatt áll. Hamarosan vásárolhatsz sorsjegyeket és részt vehetsz a napi húzásokban!
          </p>
          <div className="text-sm text-gray-400">
            Várható megjelenés: Következő hét
          </div>
        </div>
      </div>
    </div>
  )
}
