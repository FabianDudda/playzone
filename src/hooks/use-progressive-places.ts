'use client'

import { useState, useEffect } from 'react'
import { database } from '@/lib/supabase/database'
import { PlaceMarker } from '@/lib/supabase/types'

const BATCH_SIZE = 1000
const CACHE_TTL = 5 * 60 * 1000

// Module-level cache — survives component unmount/remount (navigation), cleared on page refresh
let cache: { places: PlaceMarker[]; timestamp: number; isComplete: boolean } | null = null

function isCacheFresh(): boolean {
  return !!(cache && Date.now() - cache.timestamp < CACHE_TTL)
}

export function useProgressivePlaces(enabled: boolean) {
  const [places, setPlaces] = useState<PlaceMarker[]>(() => cache ? cache.places : [])
  const [isInitialLoading, setIsInitialLoading] = useState(() => !cache)
  const [isLoadingMore, setIsLoadingMore] = useState(() => !!(cache && !cache.isComplete))

  useEffect(() => {
    if (!enabled) return
    if (isCacheFresh() && cache!.isComplete) return // Full cache hit — nothing to do

    let aborted = false

    async function load() {
      try {
        // If we have a fresh partial cache, resume from where we left off
        const resumeFrom = isCacheFresh() && cache ? cache.places.length : 0
        let allPlaces = resumeFrom > 0 ? cache!.places : []

        if (resumeFrom === 0) {
          setPlaces([])
          setIsInitialLoading(true)
          setIsLoadingMore(false)

          const firstBatch = await database.courts.getAllPlacesLightweightBatch(0, BATCH_SIZE - 1)
          if (aborted) return

          allPlaces = firstBatch
          setPlaces(allPlaces)
          setIsInitialLoading(false)
          // Cache after first batch so partial loads survive navigation
          cache = { places: allPlaces, timestamp: Date.now(), isComplete: false }

          if (firstBatch.length < BATCH_SIZE) {
            cache = { ...cache, isComplete: true }
            return
          }
        }

        setIsLoadingMore(true)
        let start = resumeFrom > 0 ? resumeFrom : BATCH_SIZE

        while (true) {
          if (aborted) break
          const batch = await database.courts.getAllPlacesLightweightBatch(start, start + BATCH_SIZE - 1)
          if (aborted) break
          if (!batch.length) break
          allPlaces = [...allPlaces, ...batch]
          setPlaces(allPlaces)
          // Keep cache updated each batch so any navigation mid-load still benefits
          cache = { places: allPlaces, timestamp: Date.now(), isComplete: false }
          if (batch.length < BATCH_SIZE) break
          start += BATCH_SIZE
        }

        if (!aborted) cache = { places: allPlaces, timestamp: Date.now(), isComplete: true }
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
