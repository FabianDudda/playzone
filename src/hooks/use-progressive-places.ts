'use client'

import { useState, useEffect } from 'react'
import { database } from '@/lib/supabase/database'
import { PlaceMarker } from '@/lib/supabase/types'

const BATCH_SIZE = 1000
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes, matching old React Query staleTime

// Module-level cache — survives component unmount/remount (navigation), cleared on page refresh
let cache: { places: PlaceMarker[]; timestamp: number } | null = null

function isCacheFresh(): boolean {
  return !!(cache && Date.now() - cache.timestamp < CACHE_TTL)
}

export function useProgressivePlaces(enabled: boolean) {
  const [places, setPlaces] = useState<PlaceMarker[]>(() => isCacheFresh() ? cache!.places : [])
  const [isInitialLoading, setIsInitialLoading] = useState(() => !isCacheFresh())
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  useEffect(() => {
    if (!enabled) return
    if (isCacheFresh()) return // Serve from cache — no fetch needed

    // Local variable per effect invocation — each cleanup only cancels its own load,
    // not the next one. This prevents the shared-ref race condition in React Strict Mode.
    let aborted = false
    setPlaces([])
    setIsInitialLoading(true)
    setIsLoadingMore(false)

    async function load() {
      try {
        const firstBatch = await database.courts.getAllPlacesLightweightBatch(0, BATCH_SIZE - 1)
        if (aborted) return

        let allPlaces = firstBatch
        setPlaces(allPlaces)
        setIsInitialLoading(false)

        if (firstBatch.length < BATCH_SIZE) {
          if (!aborted) cache = { places: allPlaces, timestamp: Date.now() }
          return
        }

        setIsLoadingMore(true)
        let start = BATCH_SIZE

        while (true) {
          if (aborted) break
          const batch = await database.courts.getAllPlacesLightweightBatch(start, start + BATCH_SIZE - 1)
          if (aborted) break
          if (!batch.length) break
          allPlaces = [...allPlaces, ...batch]
          setPlaces(allPlaces)
          if (batch.length < BATCH_SIZE) break
          start += BATCH_SIZE
        }

        // Only cache the complete dataset — partial loads are not cached
        if (!aborted) {
          cache = { places: allPlaces, timestamp: Date.now() }
        }
      } catch (err) {
        console.error('[Map] Failed to load places:', err)
      } finally {
        if (!aborted) {
          setIsInitialLoading(false)
          setIsLoadingMore(false)
        }
      }
    }

    load()

    return () => {
      aborted = true
    }
  }, [enabled])

  return { places, isInitialLoading, isLoadingMore }
}
