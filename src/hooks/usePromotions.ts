"use client"

import { useState, useEffect } from 'react'

interface Promotion {
  id: number
  fid: number
  username: string
  display_name: string | null
  cast_url: string
  share_text: string | null
  reward_per_share: number
  total_budget: number
  shares_count: number
  remaining_budget: number
  status: string
  created_at: string
  updated_at: string
}

interface UsePromotionsOptions {
  limit?: number
  offset?: number
  status?: string
}

export function usePromotions(options: UsePromotionsOptions = {}) {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const { limit = 100, offset = 0, status = 'active' } = options

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString(),
          status
        })

        const response = await fetch(`/api/promotions?${params}`)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        setPromotions(data.promotions)
        setTotal(data.total)
      } catch (err) {
        console.error('Error fetching promotions:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch promotions')
      } finally {
        setLoading(false)
      }
    }

    fetchPromotions()
  }, [limit, offset, status])

  return {
    promotions,
    loading,
    error,
    total,
    refetch: () => {
      setLoading(true)
      // This will trigger the useEffect again
    }
  }
}

// Hook for getting a specific promotion by ID
export function usePromotion(id: number | undefined) {
  const [promotion, setPromotion] = useState<Promotion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPromotion = async () => {
      if (!id) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/promotions/${id}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Promotion not found')
            return
          }
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        setPromotion(data.promotion)
      } catch (err) {
        console.error('Error fetching promotion:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch promotion')
      } finally {
        setLoading(false)
      }
    }

    fetchPromotion()
  }, [id])

  return {
    promotion,
    loading,
    error
  }
} 