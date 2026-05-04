'use client'

import { useQuery } from '@tanstack/react-query'
import { GeocodingResult } from '@/lib/supabase/types'
import { useDebouncedValue } from '@/lib/utils/debounce'

export function useGeocodingSearch(query: string) {
  const debouncedQuery = useDebouncedValue(query, 400)
  const trimmed = debouncedQuery.trim()

  const { data, isLoading } = useQuery<GeocodingResult[]>({
    queryKey: ['geocoding', trimmed],
    queryFn: async () => {
      const res = await fetch(`/api/geocoding/search?q=${encodeURIComponent(trimmed)}`)
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
    enabled: trimmed.length >= 2,
  })

  return {
    results: data ?? [],
    isLoading: isLoading && trimmed.length >= 2,
  }
}
