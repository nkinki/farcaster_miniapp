"use client"

import { useState, useEffect, useCallback } from "react"
import { mapPromotionsToPromoCasts } from "@/utils/promotionMapper"
import type { PromoCast, Promotion } from "@/types/promotions"

interface UsePromotionsWithCommentsParams {
  limit?: number
  offset?: number
  status?: string
}

interface UsePromotionsWithCommentsReturn {
  promotions: PromoCast[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function usePromotionsWithComments({ limit = 20, offset = 0, status }: UsePromotionsWithCommentsParams = {}): UsePromotionsWithCommentsReturn {
  const [promotions, setPromotions] = useState<PromoCast[]>([])
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

      const response = await fetch(`/api/promotions-with-comments?${params}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      console.log(`🔍 Promotions with Comments API Response:`, data)
      console.log(`🔍 Promotions with Comments count:`, data.promotions?.length || 0)

      // Explicit típusmegadás, hogy Promotion[]-ként kezelje
      const promotionsArray: Promotion[] = Array.isArray(data.promotions) ? data.promotions : []

      console.log(`🔍 Promotions with Comments array:`, promotionsArray)

      const mappedPromotions = mapPromotionsToPromoCasts(promotionsArray)
      console.log(`🔍 Mapped promotions with comments:`, mappedPromotions)
      setPromotions(mappedPromotions)
    } catch (err: any) {
      console.error("Error fetching promotions with comments:", err)
      setError(err.message || "Failed to fetch promotions with comments")
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
