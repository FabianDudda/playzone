import { useRef, useCallback } from 'react'

/**
 * Custom hook for debouncing function calls
 * Prevents excessive updates during rapid user interactions
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  return useCallback((...args: Parameters<T>) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay])
}

/**
 * Debounce function for non-hook usage
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }
}

/**
 * Advanced debounce hook with immediate execution option
 */
export function useAdvancedDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: {
    leading?: boolean // Execute immediately on first call
    trailing?: boolean // Execute after delay (default: true)
    maxWait?: number // Maximum time to wait before execution
  } = {}
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastCallTimeRef = useRef<number>(0)
  const lastArgsRef = useRef<Parameters<T> | null>(null)

  const {
    leading = false,
    trailing = true,
    maxWait
  } = options

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now()
    const timeSinceLastCall = now - lastCallTimeRef.current

    lastArgsRef.current = args
    lastCallTimeRef.current = now

    // Execute immediately if leading edge and first call
    if (leading && !timeoutRef.current) {
      callback(...args)
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set up trailing execution
    if (trailing) {
      timeoutRef.current = setTimeout(() => {
        if (lastArgsRef.current) {
          callback(...lastArgsRef.current)
        }
        timeoutRef.current = null
        if (maxTimeoutRef.current) {
          clearTimeout(maxTimeoutRef.current)
          maxTimeoutRef.current = null
        }
      }, delay)
    }

    // Set up max wait execution
    if (maxWait && !maxTimeoutRef.current) {
      maxTimeoutRef.current = setTimeout(() => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        if (lastArgsRef.current) {
          callback(...lastArgsRef.current)
        }
        maxTimeoutRef.current = null
      }, maxWait)
    }
  }, [callback, delay, leading, trailing, maxWait])
}

// For useDebouncedValue hook
import React from 'react'

/**
 * Hook for debouncing state values
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}