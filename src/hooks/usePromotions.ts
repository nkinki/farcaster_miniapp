"use client"

import { useState, useEffect, useCallback } from "react"
import { mapPromotionsToPromoCasts } from "@/utils/promotionMapper"
// FROM NOW ON, ONLY IMPORT TYPES FROM HERE
import type { PromoCast, Promotion } from "@/types/promotions"

interface UsePromotionsParams {
  limit?: number
  offset?: number
  status?: string
}

interface UsePromotionsReturn {
  promotions: PromoCast[] // Return type PromoCast[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function usePromotions({ limit = 20, offset = 0, status }: UsePromotionsParams = {}): UsePromotionsReturn {
  const [promotions, setPromotions] = useState<PromoCast[]>([]) // State PromoCast[]
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPromotions = useCallback(async () => {
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

      console.log(`🔍 API Response:`, data)
      console.log(`🔍 Promotions count:`, data.promotions?.length || 0)

      // Explicit type definition to treat as Promotion[]
      const promotionsArray: Promotion[] = Array.isArray(data.promotions) ? data.promotions : []

      console.log(`🔍 Promotions array:`, promotionsArray)

      const mappedPromotions = mapPromotionsToPromoCasts(promotionsArray)
      console.log(`🔍 Mapped promotions:`, mappedPromotions)
      setPromotions(mappedPromotions)
    } catch (err: any) {
      console.error("Error fetching promotions:", err)
      setError(err.message || "Failed to fetch promotions")
      setPromotions([])
    } finally {
      setLoading(false)
    }
  }, [limit, offset, status]);

  useEffect(() => {
    fetchPromotions()
  }, [fetchPromotions])

  const refetch = useCallback(() => {
    fetchPromotions()
  }, [fetchPromotions])

  return {
    promotions,
    loading,
    error,
    refetch,
  }
}
