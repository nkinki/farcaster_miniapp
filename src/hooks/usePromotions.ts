"use client"

import { useState, useEffect } from "react"
import { mapPromotionsToPromoCasts } from "@/utils/promotionMapper"
// MOSTANTÓL CSAK INNEN IMPORTÁLJUK A TÍPUSOKAT
import type { PromoCast, Promotion } from "@/types/promotions"

interface UsePromotionsParams {
  limit?: number
  offset?: number
  status?: string
}

interface UsePromotionsReturn {
  promotions: PromoCast[] // Visszatérési típus PromoCast[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function usePromotions({ limit = 20, offset = 0, status }: UsePromotionsParams = {}): UsePromotionsReturn {
  const [promotions, setPromotions] = useState<PromoCast[]>([]) // State PromoCast[]
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPromotions = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })

      if (status) {
        params.append("status", status)
      }

      const response = await fetch(`/api/promotions?${params}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Explicit típusmegadás, hogy Promotion[]-ként kezelje
      const promotionsArray: Promotion[] = Array.isArray(data.promotions) ? data.promotions : []

      const mappedPromotions = mapPromotionsToPromoCasts(promotionsArray)
      setPromotions(mappedPromotions)
    } catch (err: any) {
      console.error("Error fetching promotions:", err)
      setError(err.message || "Failed to fetch promotions")
      setPromotions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPromotions()
  }, [limit, offset, status])

  const refetch = () => {
    fetchPromotions()
  }

  return {
    promotions,
    loading,
    error,
    refetch,
  }
}
