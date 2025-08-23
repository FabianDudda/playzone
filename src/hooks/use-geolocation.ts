'use client'

import { useState, useEffect, useCallback } from 'react'

interface GeolocationState {
  position: { lat: number; lng: number } | null
  error: string | null
  loading: boolean
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  watch?: boolean
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    enableHighAccuracy = false,
    timeout = 5000,
    maximumAge = 0,
    watch = false
  } = options

  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    loading: true
  })

  const updatePosition = useCallback((position: GeolocationPosition) => {
    setState({
      position: {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      },
      error: null,
      loading: false
    })
  }, [])

  const updateError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = 'Unable to retrieve location'
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location access denied'
        break
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable'
        break
      case error.TIMEOUT:
        errorMessage = 'Location request timed out'
        break
    }

    setState({
      position: null,
      error: errorMessage,
      loading: false
    })
  }, [])

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState({
        position: null,
        error: 'Geolocation is not supported by this browser',
        loading: false
      })
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    const geolocationOptions: PositionOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge
    }

    navigator.geolocation.getCurrentPosition(
      updatePosition,
      updateError,
      geolocationOptions
    )
  }, [enableHighAccuracy, timeout, maximumAge, updatePosition, updateError])

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        position: null,
        error: 'Geolocation is not supported by this browser',
        loading: false
      })
      return
    }

    const geolocationOptions: PositionOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge
    }

    let watchId: number | undefined

    if (watch) {
      watchId = navigator.geolocation.watchPosition(
        updatePosition,
        updateError,
        geolocationOptions
      )
    } else {
      navigator.geolocation.getCurrentPosition(
        updatePosition,
        updateError,
        geolocationOptions
      )
    }

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [enableHighAccuracy, timeout, maximumAge, watch, updatePosition, updateError])

  return {
    ...state,
    getCurrentPosition
  }
}