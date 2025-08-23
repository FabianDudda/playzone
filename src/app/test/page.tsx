'use client'

import { useState } from 'react'
import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { database } from '@/lib/supabase/database'
import { PlaceWithCourts } from '@/lib/supabase/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin, TestTube, MapIcon, Loader2, Save, Trash2, Filter } from 'lucide-react'
import AdminGuard from '@/components/auth/admin-guard'

export default function TestPage() {
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [isSavingAddresses, setIsSavingAddresses] = useState(false)
  const [isDeletingPlaces, setIsDeletingPlaces] = useState(false)
  const [geocodingPlace, setGeocodingPlace] = useState<string | null>(null)
  const [savingPlace, setSavingPlace] = useState<string | null>(null)
  const [deletingPlace, setDeletingPlace] = useState<string | null>(null)
  const [geocodingResults, setGeocodingResults] = useState<string | null>(null)
  const [enrichedPlaces, setEnrichedPlaces] = useState<PlaceWithCourts[]>([])
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set())
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)
  const [selectedCity, setSelectedCity] = useState<string>('all')
  const [selectedAddressStatus, setSelectedAddressStatus] = useState<string>('all')
  const queryClient = useQueryClient()

  const { data: places = [], isLoading, error } = useQuery({
    queryKey: ['test-places'],
    queryFn: () => database.courts.getAllCourts(),
  })

  // Use enriched places if available, otherwise use original places
  const allPlaces = enrichedPlaces.length > 0 ? enrichedPlaces : places
  
  // Get unique cities for filter dropdown
  const uniqueCities = React.useMemo(() => {
    const cities = allPlaces
      .map(place => place.city)
      .filter(Boolean) // Remove null/undefined cities
      .filter((city, index, array) => array.indexOf(city) === index) // Remove duplicates
      .sort() // Sort alphabetically
    return cities
  }, [allPlaces])
  
  // Apply city and address status filters
  const displayPlaces = React.useMemo(() => {
    let filtered = allPlaces
    
    // Apply city filter
    if (selectedCity !== 'all') {
      filtered = filtered.filter(place => place.city === selectedCity)
    }
    
    // Apply address status filter
    if (selectedAddressStatus === 'enriched') {
      filtered = filtered.filter(place => place.street && place.city)
    } else if (selectedAddressStatus === 'coordinates-only') {
      filtered = filtered.filter(place => !(place.street && place.city))
    }
    
    return filtered
  }, [allPlaces, selectedCity, selectedAddressStatus])

  // Helper function to check if place has any address data
  const hasAddressData = (place: PlaceWithCourts) => {
    return !!(place.street || place.city || place.district || place.state || place.country || place.county || place.postcode)
  }

  // Selection helper functions
  const getSelectedPlacesData = () => {
    return displayPlaces.filter(place => selectedPlaces.has(place.id))
  }

  const handleSelectAll = () => {
    if (selectedPlaces.size === displayPlaces.length) {
      setSelectedPlaces(new Set())
    } else {
      setSelectedPlaces(new Set(displayPlaces.map(place => place.id)))
    }
    setLastSelectedIndex(null)
  }

  const handlePlaceSelect = (placeId: string, event: React.MouseEvent, placeIndex: number) => {
    setSelectedPlaces(prev => {
      const newSelected = new Set(prev)
      
      if (event.shiftKey && lastSelectedIndex !== null) {
        // Range selection
        const start = Math.min(lastSelectedIndex, placeIndex)
        const end = Math.max(lastSelectedIndex, placeIndex)
        
        for (let i = start; i <= end; i++) {
          if (i < displayPlaces.length) {
            newSelected.add(displayPlaces[i].id)
          }
        }
      } else {
        // Single selection
        if (newSelected.has(placeId)) {
          newSelected.delete(placeId)
        } else {
          newSelected.add(placeId)
        }
      }
      
      return newSelected
    })
    
    setLastSelectedIndex(placeIndex)
  }

  const handleBulkGeocode = async () => {
    const selectedPlacesData = getSelectedPlacesData()
    if (selectedPlacesData.length === 0) return
    
    setIsGeocoding(true)
    setGeocodingResults(null)
    
    try {
      let successCount = 0
      let errorCount = 0
      
      // Process each selected place individually for real-time feedback
      for (let i = 0; i < selectedPlacesData.length; i++) {
        const place = selectedPlacesData[i]
        
        try {
          // Fetch address for this place
          const response = await fetch('/api/geocode/lookup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              latitude: place.latitude,
              longitude: place.longitude,
              language: 'de'
            }),
          })
          
          if (response.ok) {
            const result = await response.json()
            
            // Update the place with address data (preserve existing district)
            const enrichedPlace = {
              ...place,
              street: result.address.street || null,
              house_number: result.address.house_number || null,
              city: result.address.city || null,
              district: result.address.district || place.district || null,
              county: result.address.county || null,
              state: result.address.state || null,
              country: result.address.country || null,
              postcode: result.address.postcode || null,
            }
            
            // Update enriched places array
            setEnrichedPlaces(prev => {
              const existing = prev.find(p => p.id === place.id)
              if (existing) {
                // Update existing enriched place
                return prev.map(p => p.id === place.id ? enrichedPlace : p)
              } else {
                // Add new enriched place
                return [...prev, enrichedPlace]
              }
            })
            
            successCount++
            
            // Update UI with progress
            setGeocodingResults(`🔄 Processing... ${i + 1}/${selectedPlacesData.length} (${successCount} successful)`)
            
          } else {
            console.error(`Failed to geocode place ${place.id}:`, response.status)
            errorCount++
          }
        } catch (error) {
          console.error(`Error geocoding place ${place.id}:`, error)
          errorCount++
        }
        
        // Add a small delay to respect rate limits
        if (i < selectedPlacesData.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1100)) // 1.1 second delay
        }
      }
      
      setGeocodingResults(`✅ Completed! ${successCount} places enriched${errorCount > 0 ? `, ${errorCount} errors` : ''}`)
      
    } catch (error) {
      setGeocodingResults(`❌ Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGeocoding(false)
    }
  }

  const handleSaveAddresses = async () => {
    // Generate unique operation ID for tracking
    const operationId = `save-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    console.log(`🚀 [${operationId}] Starting handleSaveAddresses...`)
    
    const selectedPlacesData = getSelectedPlacesData()
    console.log(`📊 [${operationId}] Selected places: ${selectedPlacesData.length}`, selectedPlacesData.map(p => ({ id: p.id, name: p.name, street: p.street, city: p.city })))
    
    if (selectedPlacesData.length === 0) {
      console.log(`❌ [${operationId}] No places selected, returning early`)
      return
    }
    
    setIsSavingAddresses(true)
    setGeocodingResults(null)
    
    try {
      // Filter only selected places that have enriched address data
      const placesToUpdate = selectedPlacesData.filter(place => hasAddressData(place))
      console.log(`📋 [${operationId}] Places to update (with address data): ${placesToUpdate.length}`, placesToUpdate.map(p => ({ id: p.id, name: p.name, street: p.street, city: p.city })))
      
      if (placesToUpdate.length === 0) {
        console.log(`❌ [${operationId}] No places have address data`)
        setGeocodingResults('❌ No enriched addresses to save')
        return
      }
      
      let successCount = 0
      let errorCount = 0
      const failedPlaces: string[] = []
      const succeededPlaces: string[] = []
      const BATCH_SIZE = 10 // Process in batches of 10
      const DELAY_MS = 300 // Delay between operations to prevent overwhelming the database
      
      console.log(`📦 [${operationId}] Processing ${placesToUpdate.length} places in batches of ${BATCH_SIZE}`)
      
      // Process places in batches
      for (let batchStart = 0; batchStart < placesToUpdate.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, placesToUpdate.length)
        const currentBatch = placesToUpdate.slice(batchStart, batchEnd)
        const batchNumber = Math.floor(batchStart / BATCH_SIZE) + 1
        const totalBatches = Math.ceil(placesToUpdate.length / BATCH_SIZE)
        
        console.log(`🔄 [${operationId}] Starting batch ${batchNumber}/${totalBatches} with ${currentBatch.length} places`)
        console.log(`📝 [${operationId}] Batch ${batchNumber} places:`, currentBatch.map(p => ({ id: p.id, name: p.name })))
        
        // Process each place in the current batch
        for (let i = 0; i < currentBatch.length; i++) {
          const place = currentBatch[i]
          const overallIndex = batchStart + i
          
          console.log(`🔍 [${operationId}] Processing place ${overallIndex + 1}/${placesToUpdate.length}: ${place.name} (${place.id})`)
          
          // Retry logic for database operations
          let retryCount = 0
          const maxRetries = 3
          let success = false
          
          while (!success && retryCount < maxRetries) {
            try {
              console.log(`🔄 [${operationId}] Starting retry loop iteration for ${place.id}, attempt ${retryCount + 1}`)
              console.log(`💾 [${operationId}] Attempt ${retryCount + 1}/${maxRetries} to save place ${place.id}`)
              console.log(`📝 [${operationId}] Update data for ${place.id}:`, {
                street: place.street,
                house_number: place.house_number,
                city: place.city,
                district: place.district,
                county: place.county,
                state: place.state,
                country: place.country,
                postcode: place.postcode,
              })
              
              // Update the place with address data in database with timeout
              const startTime = Date.now()
              console.log(`🚀 [${operationId}] About to call database.courts.updateCourt for ${place.id}`)
              
              // Test if the database module is accessible
              console.log(`🔍 [${operationId}] Database module check:`, typeof database?.courts?.updateCourt)
              
              // Create a timeout promise
              const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                  console.error(`⏰ [${operationId}] TIMEOUT: Database operation for ${place.id} exceeded 30 seconds`)
                  reject(new Error('Database operation timeout after 30 seconds'))
                }, 30000)
              })
              
              let updateResult
              try {
                // Race the database call against the timeout
                updateResult = await Promise.race([
                  database.courts.updateCourt(place.id, {
                    street: place.street,
                    house_number: place.house_number,
                    city: place.city,
                    district: place.district,
                    county: place.county,
                    state: place.state,
                    country: place.country,
                    postcode: place.postcode,
                  }),
                  timeoutPromise
                ]) as any
              } catch (raceError) {
                console.error(`🏁 [${operationId}] Promise.race failed for ${place.id}:`, raceError)
                throw raceError
              }
              
              const { data, error } = updateResult
              
              const endTime = Date.now()
              const duration = endTime - startTime
              console.log(`🎯 [${operationId}] Database call completed for ${place.id}`)
              
              console.log(`⏱️ [${operationId}] Database operation took ${duration}ms for place ${place.id}`)
              console.log(`🔄 [${operationId}] Database response for ${place.id}:`, { data: data ? 'received' : 'null', error: error || 'none' })
              
              if (error) {
                console.error(`🚨 [${operationId}] Database error details for ${place.id}:`, error)
                throw new Error(`Database error: ${error.message || JSON.stringify(error)}`)
              } else {
                successCount++
                succeededPlaces.push(place.id)
                success = true
                console.log(`✅ [${operationId}] Successfully saved place ${place.id} (${place.name}) - database returned:`, data ? 'data received' : 'no data')
              }
              
            } catch (error) {
              retryCount++
              console.error(`❌ [${operationId}] Attempt ${retryCount} failed for place ${place.id}:`, error)
              console.error(`🔍 [${operationId}] Error type:`, typeof error)
              console.error(`🔍 [${operationId}] Error name:`, error?.constructor?.name)
              console.error(`🔍 [${operationId}] Error stack:`, (error as Error)?.stack)
              
              if (retryCount >= maxRetries) {
                errorCount++
                failedPlaces.push(place.id)
                console.error(`💥 [${operationId}] Failed to save addresses for place ${place.id} after ${maxRetries} attempts:`, error)
              } else {
                // Wait before retry with exponential backoff
                const retryDelay = 500 * retryCount
                console.log(`⏳ [${operationId}] Waiting ${retryDelay}ms before retry ${retryCount + 1} for place ${place.id}`)
                await new Promise(resolve => setTimeout(resolve, retryDelay))
              }
            }
          }
          
          // Update UI with progress
          setGeocodingResults(
            `💾 Saving batch ${batchNumber}/${totalBatches}... ${overallIndex + 1}/${placesToUpdate.length} (${successCount} successful, ${errorCount} failed)`
          )
          
          // Add delay between operations to prevent overwhelming the database
          if (overallIndex < placesToUpdate.length - 1) {
            console.log(`⏳ [${operationId}] Waiting ${DELAY_MS}ms before next operation`)
            await new Promise(resolve => setTimeout(resolve, DELAY_MS))
          }
        }
        
        console.log(`✅ [${operationId}] Completed batch ${batchNumber}/${totalBatches}. Success: ${successCount}, Errors: ${errorCount}`)
        
        // NOTE: Removed per-batch query invalidation to prevent race conditions
        // Query will be invalidated once at the end of the entire operation
      }
      
      console.log(`📊 [${operationId}] Final results: ${successCount} succeeded, ${errorCount} failed`)
      console.log(`✅ [${operationId}] Succeeded places:`, succeededPlaces)
      if (failedPlaces.length > 0) {
        console.log(`❌ [${operationId}] Failed places:`, failedPlaces)
      }
      
      // Only invalidate queries and update state AFTER all operations are complete
      if (successCount > 0) {
        console.log(`🔄 [${operationId}] Invalidating queries for ${successCount} successful updates`)
        await queryClient.invalidateQueries({ queryKey: ['test-places'] })
        
        // Only remove successfully saved places from enriched places array
        const successfullyUpdatedPlaces = placesToUpdate.filter(p => succeededPlaces.includes(p.id))
        console.log(`🧹 [${operationId}] Removing ${successfullyUpdatedPlaces.length} successfully saved places from enriched state`)
        setEnrichedPlaces(prev => prev.filter(p => !successfullyUpdatedPlaces.some(saved => saved.id === p.id)))
        
        // Clear selection only for successfully saved places
        setSelectedPlaces(prev => {
          const newSelected = new Set(prev)
          successfullyUpdatedPlaces.forEach(place => newSelected.delete(place.id))
          return newSelected
        })
      }
      
      setGeocodingResults(`✅ Addresses saved! ${successCount} places updated${errorCount > 0 ? `, ${errorCount} errors` : ''}`)
      
    } catch (error) {
      console.error(`💥 [${operationId}] Critical error in handleSaveAddresses:`, error)
      setGeocodingResults(`❌ Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      console.log(`🏁 [${operationId}] Finished handleSaveAddresses`)
      setIsSavingAddresses(false)
    }
  }

  const handleBulkDelete = async () => {
    const selectedPlacesData = getSelectedPlacesData()
    if (selectedPlacesData.length === 0) return

    // Confirmation dialog
    const confirmed = window.confirm(
      `⚠️ Are you sure you want to delete ${selectedPlacesData.length} place${selectedPlacesData.length !== 1 ? 's' : ''} and all their associated courts?\n\n` +
      `This action cannot be undone!\n\n` +
      `Places to delete:\n${selectedPlacesData.map(p => `• ${p.name}`).join('\n')}`
    )

    if (!confirmed) return

    // Generate unique operation ID for tracking
    const operationId = `delete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    console.log(`🗑️ [${operationId}] Starting handleBulkDelete for ${selectedPlacesData.length} places...`)

    setIsDeletingPlaces(true)
    setGeocodingResults(null)

    try {
      let successCount = 0
      let errorCount = 0
      const failedPlaces: string[] = []
      const succeededPlaces: string[] = []
      const BATCH_SIZE = 5 // Smaller batches for delete operations
      const DELAY_MS = 500 // Longer delay for delete operations

      console.log(`📦 [${operationId}] Processing ${selectedPlacesData.length} places in batches of ${BATCH_SIZE}`)

      // Process places in batches
      for (let batchStart = 0; batchStart < selectedPlacesData.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, selectedPlacesData.length)
        const currentBatch = selectedPlacesData.slice(batchStart, batchEnd)
        const batchNumber = Math.floor(batchStart / BATCH_SIZE) + 1
        const totalBatches = Math.ceil(selectedPlacesData.length / BATCH_SIZE)

        console.log(`🔄 [${operationId}] Starting batch ${batchNumber}/${totalBatches} with ${currentBatch.length} places`)

        // Process each place in the current batch
        for (let i = 0; i < currentBatch.length; i++) {
          const place = currentBatch[i]
          const overallIndex = batchStart + i

          console.log(`🗑️ [${operationId}] Deleting place ${overallIndex + 1}/${selectedPlacesData.length}: ${place.name} (${place.id})`)

          // Retry logic for database operations
          let retryCount = 0
          const maxRetries = 3
          let success = false

          while (!success && retryCount < maxRetries) {
            try {
              console.log(`🔄 [${operationId}] Attempt ${retryCount + 1}/${maxRetries} to delete place ${place.id}`)

              // Step 1: Delete all associated courts first (to respect foreign key constraints)
              if (place.courts && place.courts.length > 0) {
                console.log(`🏟️ [${operationId}] Deleting ${place.courts.length} courts for place ${place.id}`)
                
                for (const court of place.courts) {
                  const courtDeleteResult = await database.courts.deleteCourt(court.id)
                  if (courtDeleteResult.error) {
                    console.error(`❌ [${operationId}] Failed to delete court ${court.id}:`, courtDeleteResult.error)
                    throw new Error(`Failed to delete court ${court.id}: ${courtDeleteResult.error.message}`)
                  }
                  console.log(`✅ [${operationId}] Successfully deleted court ${court.id}`)
                }
              }

              // Step 2: Delete the place itself
              console.log(`🏠 [${operationId}] Deleting place ${place.id}`)
              const placeDeleteResult = await database.courts.deleteCourt(place.id)

              if (placeDeleteResult.error) {
                console.error(`❌ [${operationId}] Failed to delete place ${place.id}:`, placeDeleteResult.error)
                throw new Error(`Failed to delete place: ${placeDeleteResult.error.message}`)
              }

              successCount++
              succeededPlaces.push(place.id)
              success = true
              console.log(`✅ [${operationId}] Successfully deleted place ${place.id} (${place.name})`)

            } catch (error) {
              retryCount++
              console.error(`❌ [${operationId}] Attempt ${retryCount} failed for place ${place.id}:`, error)

              if (retryCount >= maxRetries) {
                errorCount++
                failedPlaces.push(place.id)
                console.error(`💥 [${operationId}] Failed to delete place ${place.id} after ${maxRetries} attempts:`, error)
              } else {
                // Wait before retry with exponential backoff
                const retryDelay = 1000 * retryCount
                console.log(`⏳ [${operationId}] Waiting ${retryDelay}ms before retry ${retryCount + 1} for place ${place.id}`)
                await new Promise(resolve => setTimeout(resolve, retryDelay))
              }
            }
          }

          // Update UI with progress
          setGeocodingResults(
            `🗑️ Deleting batch ${batchNumber}/${totalBatches}... ${overallIndex + 1}/${selectedPlacesData.length} (${successCount} deleted, ${errorCount} failed)`
          )

          // Add delay between operations
          if (overallIndex < selectedPlacesData.length - 1) {
            console.log(`⏳ [${operationId}] Waiting ${DELAY_MS}ms before next operation`)
            await new Promise(resolve => setTimeout(resolve, DELAY_MS))
          }
        }

        console.log(`✅ [${operationId}] Completed batch ${batchNumber}/${totalBatches}. Success: ${successCount}, Errors: ${errorCount}`)
      }

      console.log(`📊 [${operationId}] Final results: ${successCount} deleted, ${errorCount} failed`)
      console.log(`✅ [${operationId}] Deleted places:`, succeededPlaces)
      if (failedPlaces.length > 0) {
        console.log(`❌ [${operationId}] Failed places:`, failedPlaces)
      }

      // Update UI state after successful deletions
      if (successCount > 0) {
        console.log(`🔄 [${operationId}] Invalidating queries for ${successCount} successful deletions`)
        await queryClient.invalidateQueries({ queryKey: ['test-places'] })

        // Remove successfully deleted places from enriched places array
        setEnrichedPlaces(prev => prev.filter(p => !succeededPlaces.includes(p.id)))

        // Clear selection for successfully deleted places
        setSelectedPlaces(prev => {
          const newSelected = new Set(prev)
          succeededPlaces.forEach(placeId => newSelected.delete(placeId))
          return newSelected
        })
      }

      setGeocodingResults(`✅ Deletion complete! ${successCount} places deleted${errorCount > 0 ? `, ${errorCount} errors` : ''}`)

    } catch (error) {
      console.error(`💥 [${operationId}] Critical error in handleBulkDelete:`, error)
      setGeocodingResults(`❌ Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      console.log(`🏁 [${operationId}] Finished handleBulkDelete`)
      setIsDeletingPlaces(false)
    }
  }

  const handleSingleGeocode = async (place: PlaceWithCourts) => {
    setGeocodingPlace(place.id)
    setGeocodingResults(null)
    
    try {
      // Fetch address for this place
      const response = await fetch('/api/geocode/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: place.latitude,
          longitude: place.longitude,
          language: 'de'
        }),
      })
      
      if (response.ok) {
        const result = await response.json()
        
        // Update the place with address data (preserve existing district)
        const enrichedPlace = {
          ...place,
          street: result.address.street || null,
          house_number: result.address.house_number || null,
          city: result.address.city || null,
          district: result.address.district || place.district || null,
          county: result.address.county || null,
          state: result.address.state || null,
          country: result.address.country || null,
          postcode: result.address.postcode || null,
        }
        
        // Update enriched places array
        setEnrichedPlaces(prev => {
          const existing = prev.find(p => p.id === place.id)
          if (existing) {
            // Update existing enriched place
            return prev.map(p => p.id === place.id ? enrichedPlace : p)
          } else {
            // Add new enriched place
            return [...prev, enrichedPlace]
          }
        })
        
        setGeocodingResults(`✅ Address enriched for ${place.name}`)
      } else {
        console.error(`Failed to geocode place ${place.id}:`, response.status)
        setGeocodingResults(`❌ Failed to enrich address for ${place.name}`)
      }
    } catch (error) {
      console.error(`Error geocoding place ${place.id}:`, error)
      setGeocodingResults(`❌ Error enriching address for ${place.name}`)
    } finally {
      setGeocodingPlace(null)
    }
  }

  const handleSingleSaveAddress = async (place: PlaceWithCourts) => {
    if (!hasAddressData(place)) return
    
    setSavingPlace(place.id)
    setGeocodingResults(null)
    
    try {
      // Update the place with address data in database
      const { error } = await database.courts.updateCourt(place.id, {
        street: place.street,
        house_number: place.house_number,
        city: place.city,
        district: place.district,
        county: place.county,
        state: place.state,
        country: place.country,
        postcode: place.postcode,
      })
      
      if (error) {
        console.error(`Failed to save addresses for place ${place.id}:`, error)
        setGeocodingResults(`❌ Failed to save address for ${place.name}`)
      } else {
        // Invalidate and refetch the query to get updated data from database
        await queryClient.invalidateQueries({ queryKey: ['test-places'] })
        
        // Remove this place from enriched places since it's now saved to database
        setEnrichedPlaces(prev => prev.filter(p => p.id !== place.id))
        
        setGeocodingResults(`✅ Address saved for ${place.name}`)
      }
    } catch (error) {
      console.error(`Error saving addresses for place ${place.id}:`, error)
      setGeocodingResults(`❌ Error saving address for ${place.name}`)
    } finally {
      setSavingPlace(null)
    }
  }

  const handleSingleDelete = async (place: PlaceWithCourts) => {
    // Confirmation dialog
    const confirmed = window.confirm(
      `⚠️ Are you sure you want to delete "${place.name}" and all its associated courts?\n\n` +
      `This action cannot be undone!`
    )

    if (!confirmed) return

    setDeletingPlace(place.id)
    setGeocodingResults(null)

    try {
      console.log(`🗑️ Starting deletion of place: ${place.name} (${place.id})`)

      // Step 1: Delete all associated courts first (to respect foreign key constraints)
      if (place.courts && place.courts.length > 0) {
        console.log(`🏟️ Deleting ${place.courts.length} courts for place ${place.id}`)
        
        for (const court of place.courts) {
          const courtDeleteResult = await database.courts.deleteCourt(court.id)
          if (courtDeleteResult.error) {
            console.error(`❌ Failed to delete court ${court.id}:`, courtDeleteResult.error)
            throw new Error(`Failed to delete court ${court.id}: ${courtDeleteResult.error.message}`)
          }
          console.log(`✅ Successfully deleted court ${court.id}`)
        }
      }

      // Step 2: Delete the place itself
      console.log(`🏠 Deleting place ${place.id}`)
      const placeDeleteResult = await database.courts.deleteCourt(place.id)

      if (placeDeleteResult.error) {
        console.error(`❌ Failed to delete place ${place.id}:`, placeDeleteResult.error)
        setGeocodingResults(`❌ Failed to delete ${place.name}`)
        return
      }

      // Success - update UI
      console.log(`✅ Successfully deleted place ${place.id} (${place.name})`)
      
      // Invalidate and refetch the query to get updated data from database
      await queryClient.invalidateQueries({ queryKey: ['test-places'] })
      
      // Remove this place from enriched places since it's now deleted from database
      setEnrichedPlaces(prev => prev.filter(p => p.id !== place.id))
      
      // Remove from selection
      setSelectedPlaces(prev => {
        const newSelected = new Set(prev)
        newSelected.delete(place.id)
        return newSelected
      })
      
      setGeocodingResults(`✅ Successfully deleted ${place.name}`)

    } catch (error) {
      console.error(`❌ Error deleting place ${place.id}:`, error)
      setGeocodingResults(`❌ Error deleting ${place.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setDeletingPlace(null)
    }
  }

  const handleDebugData = () => {
    console.log('Original places data:', places)
    console.log('Display places data (enriched):', displayPlaces)
    // Check if any place has address data
    const enrichedPlaces = displayPlaces.filter(p => p.street || p.city)
    console.log(`Places with address data: ${enrichedPlaces.length}/${displayPlaces.length}`)
    setGeocodingResults(`🔍 Debug: ${enrichedPlaces.length}/${displayPlaces.length} places have address data. Check browser console for details.`)
  }

  if (isLoading) {
    return (
      <div className="container px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <TestTube className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Test Page</h1>
        </div>
        <div className="text-center py-8">Loading places...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <TestTube className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Test Page</h1>
        </div>
        <div className="text-center py-8 text-red-500">
          Error loading places: {(error as Error).message}
        </div>
      </div>
    )
  }

  return (
    <AdminGuard>
      <div className="container px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <TestTube className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Test Page - All Places</h1>
      </div>
      
      <div className="mb-6 space-y-4">
        {/* Data Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold text-primary">{displayPlaces.length}</div>
            <div className="text-sm text-muted-foreground">
              {selectedCity === 'all' ? 'Total Places' : 'Filtered Places'}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {displayPlaces.reduce((sum, place) => sum + (place.courts?.length || 0), 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Courts</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {displayPlaces.filter(p => p.street && p.city).length}
            </div>
            <div className="text-sm text-muted-foreground">With Addresses</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {displayPlaces.filter(p => p.image_url).length}
            </div>
            <div className="text-sm text-muted-foreground">With Images</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {uniqueCities.length}
            </div>
            <div className="text-sm text-muted-foreground">Unique Cities</div>
          </Card>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectedPlaces.size === displayPlaces.length && displayPlaces.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Select All ({selectedPlaces.size}/{displayPlaces.length})
              </label>
            </div>
            
            {/* City Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by city" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All Cities ({allPlaces.length})
                  </SelectItem>
                  {uniqueCities.map(city => {
                    const count = allPlaces.filter(place => place.city === city).length
                    return (
                      <SelectItem key={city || 'unknown'} value={city || 'unknown'}>
                        {city} ({count})
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            
            {/* Address Status Filter */}
            <div className="flex items-center gap-2">
              <Select value={selectedAddressStatus} onValueChange={setSelectedAddressStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by address status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All Places ({allPlaces.length})
                  </SelectItem>
                  <SelectItem value="enriched">
                    ✅ Enriched ({allPlaces.filter(place => place.street && place.city).length})
                  </SelectItem>
                  <SelectItem value="coordinates-only">
                    📍 Coordinates Only ({allPlaces.filter(place => !(place.street && place.city)).length})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <p className="text-muted-foreground">
              {selectedCity === 'all' ? 'All cities' : `City: ${selectedCity}`}
              {selectedAddressStatus !== 'all' && ` • ${selectedAddressStatus === 'enriched' ? 'Enriched addresses' : 'Coordinates only'}`}
              {enrichedPlaces.length > 0 && ` • ${enrichedPlaces.length} places enriched`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleDebugData}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              🔍 Debug Data
            </Button>
            <Button 
              onClick={handleBulkDelete}
              disabled={isDeletingPlaces || selectedPlaces.size === 0}
              variant="destructive"
              size="sm"
              className="flex items-center gap-2"
            >
              {isDeletingPlaces ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Places ({selectedPlaces.size})
                </>
              )}
            </Button>
            <Button 
              onClick={handleSaveAddresses}
              disabled={isSavingAddresses || selectedPlaces.size === 0 || getSelectedPlacesData().filter(p => hasAddressData(p)).length === 0}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isSavingAddresses ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Set Addresses ({getSelectedPlacesData().filter(p => hasAddressData(p)).length})
                </>
              )}
            </Button>
            <Button 
              onClick={handleBulkGeocode}
              disabled={isGeocoding || selectedPlaces.size === 0}
              className="flex items-center gap-2"
            >
              {isGeocoding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Geocoding...
                </>
              ) : (
                <>
                  <MapIcon className="h-4 w-4" />
                  Enrich Addresses ({selectedPlaces.size})
                </>
              )}
            </Button>
          </div>
        </div>
        
        {geocodingResults && (
          <div className="p-3 rounded-md bg-muted">
            <p className="text-sm">{geocodingResults}</p>
          </div>
        )}
      </div>

      {displayPlaces.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No places found</h3>
            <p className="text-muted-foreground">
              No places are currently available in the database.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {displayPlaces.map((place: PlaceWithCourts, index: number) => {
            // Get unique sports from the courts array, fallback to legacy sports array
            const availableSports = place.courts?.length > 0 
              ? [...new Set(place.courts.map(court => court.sport))]
              : (place.sports || [])

            return (
              <Card key={place.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        onClick={(event) => {
                          if (event.shiftKey && lastSelectedIndex !== null) {
                            // Range selection
                            const start = Math.min(lastSelectedIndex, index)
                            const end = Math.max(lastSelectedIndex, index)
                            
                            setSelectedPlaces(prev => {
                              const newSelected = new Set(prev)
                              for (let i = start; i <= end; i++) {
                                if (i < displayPlaces.length) {
                                  newSelected.add(displayPlaces[i].id)
                                }
                              }
                              return newSelected
                            })
                          }
                        }}
                      >
                        <Checkbox
                          checked={selectedPlaces.has(place.id)}
                          onCheckedChange={(checked) => {
                            setSelectedPlaces(prev => {
                              const newSelected = new Set(prev)
                              if (checked) {
                                newSelected.add(place.id)
                              } else {
                                newSelected.delete(place.id)
                              }
                              return newSelected
                            })
                            setLastSelectedIndex(index)
                          }}
                        />
                      </div>
                      <span>{place.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <Button
                          onClick={() => handleSingleDelete(place)}
                          disabled={deletingPlace === place.id}
                          variant="destructive"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          title="Delete place and all courts"
                        >
                          {deletingPlace === place.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          onClick={() => handleSingleSaveAddress(place)}
                          disabled={!hasAddressData(place) || savingPlace === place.id}
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                        >
                          {savingPlace === place.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          onClick={() => handleSingleGeocode(place)}
                          disabled={geocodingPlace === place.id || Boolean(place.street && place.city)}
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                        >
                          {geocodingPlace === place.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <MapIcon className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <Badge variant="outline">
                        {place.courts?.length || 0} court{(place.courts?.length || 0) !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    📍 {place.latitude}, {place.longitude}
                    {place.district && ` • ${place.district}`}
                    {place.neighborhood && ` • ${place.neighborhood}`}
                  </CardDescription>
                  {(place.street || place.city || place.country) && (
                    <CardDescription className="mt-1">
                      🏠 {[
                        place.house_number && place.street ? `${place.street} ${place.house_number}` : place.street,
                        place.city,
                        place.state,
                        place.country
                      ].filter(Boolean).join(', ')}
                      {place.postcode && ` (${place.postcode})`}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Available Sports */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Available Sports:</h4>
                      <div className="flex flex-wrap gap-1">
                        {availableSports.length > 0 ? (
                          availableSports.map((sport) => (
                            <Badge key={sport} variant="secondary" className="text-xs">
                              {sport}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No sports specified</span>
                        )}
                      </div>
                    </div>

                    {/* Individual Courts */}
                    {place.courts && place.courts.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Court Details:</h4>
                        <div className="space-y-2">
                          {place.courts.map((court, index) => (
                            <div key={court.id} className="text-sm bg-muted/50 p-2 rounded">
                              <div className="font-medium">
                                Court {index + 1}: {court.sport}
                              </div>
                              <div className="text-muted-foreground">
                                Quantity: {court.quantity}
                              </div>
                              {court.surface && (
                                <div className="text-muted-foreground">
                                  Surface: {court.surface}
                                </div>
                              )}
                              {court.notes && (
                                <div className="text-muted-foreground">
                                  Notes: {court.notes}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Place Details */}
                    {place.description && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Description:</h4>
                        <p className="text-sm text-muted-foreground">{place.description}</p>
                      </div>
                    )}

                    {/* Address Details */}
                    {(place.street || place.city || place.district || place.country) && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Address Details:</h4>
                        <div className="text-sm text-muted-foreground space-y-1">
                          {place.street && <div>Street: {place.street}{place.house_number && ` ${place.house_number}`}</div>}
                          {place.city && <div>City: {place.city}</div>}
                          {place.district && <div>District: {place.district}</div>}
                          {place.county && <div>County: {place.county}</div>}
                          {place.state && <div>State: {place.state}</div>}
                          {place.country && <div>Country: {place.country}</div>}
                          {place.postcode && <div>Postal Code: {place.postcode}</div>}
                        </div>
                      </div>
                    )}

                    {/* Image */}
                    {place.image_url && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Court Image:</h4>
                        <div className="relative w-full h-48 rounded-md overflow-hidden bg-muted">
                          <img 
                            src={place.image_url} 
                            alt={place.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              target.parentElement!.innerHTML = `
                                <div class="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                                  ❌ Image failed to load
                                </div>
                              `
                            }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          URL: <a href={place.image_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{place.image_url}</a>
                        </div>
                      </div>
                    )}

   
                    {/* Complete Metadata */}
                    <div className="pt-2 border-t">
                      <h4 className="text-sm font-medium mb-2">Complete Metadata:</h4>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div><span className="font-medium">ID:</span> {place.id}</div>
                        <div><span className="font-medium">Source:</span> {place.source || 'unknown'}</div>
                        {place.source_id && <div><span className="font-medium">Source ID:</span> {place.source_id}</div>}
                        {place.features && place.features.length > 0 && (
                          <div><span className="font-medium">Features:</span> {place.features.join(', ')}</div>
                        )}
                        <div><span className="font-medium">Added By:</span> {place.added_by_user}</div>
                        <div><span className="font-medium">Created:</span> {new Date(place.created_at).toLocaleString()}</div>
                        {place.import_date && (
                          <div><span className="font-medium">Import Date:</span> {new Date(place.import_date).toLocaleString()}</div>
                        )}
                        <div><span className="font-medium">Coordinates:</span> {place.latitude}, {place.longitude}</div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Address Status:</span>
                          {(place.street && place.city) ? (
                            <Badge variant="default" className="text-xs">✅ Enriched</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">📍 Coordinates Only</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Image Status:</span>
                          {place.image_url ? (
                            <Badge variant="default" className="text-xs">📸 Has Image</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">📷 No Image</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Raw JSON Data (Collapsible) */}
                    <details className="pt-2 border-t">
                      <summary className="text-sm font-medium cursor-pointer hover:text-primary">
                        🔍 Raw JSON Data (Click to expand)
                      </summary>
                      <div className="mt-2 p-3 bg-muted rounded-md">
                        <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words">
                          {JSON.stringify(place, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      </div>
    </AdminGuard>
  )
}