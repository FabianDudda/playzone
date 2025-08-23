/**
 * Performance and Memory Monitoring Utilities
 * For tracking map performance and detecting memory issues
 */

export interface PerformanceMetrics {
  timestamp: number
  markerCount: number
  poolSize: number
  iconCacheSize: number
  memoryUsage?: number
  renderTime?: number
  filterTime?: number
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private maxMetricsHistory = 100

  /**
   * Record performance metrics
   */
  recordMetrics(metrics: Partial<PerformanceMetrics>): void {
    const fullMetrics: PerformanceMetrics = {
      timestamp: Date.now(),
      markerCount: 0,
      poolSize: 0,
      iconCacheSize: 0,
      ...metrics
    }

    // Add memory usage if available
    if (performance.memory) {
      fullMetrics.memoryUsage = performance.memory.usedJSHeapSize
    }

    this.metrics.push(fullMetrics)

    // Keep only recent metrics to prevent memory leaks
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory)
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    current: PerformanceMetrics | null
    averages: {
      markerCount: number
      poolSize: number
      iconCacheSize: number
      memoryUsage?: number
      renderTime?: number
      filterTime?: number
    }
    memoryTrend: 'increasing' | 'stable' | 'decreasing' | 'unknown'
  } {
    if (this.metrics.length === 0) {
      return {
        current: null,
        averages: {
          markerCount: 0,
          poolSize: 0,
          iconCacheSize: 0
        },
        memoryTrend: 'unknown'
      }
    }

    const current = this.metrics[this.metrics.length - 1]
    const recentMetrics = this.metrics.slice(-10) // Last 10 measurements

    const averages = {
      markerCount: this.average(recentMetrics, 'markerCount'),
      poolSize: this.average(recentMetrics, 'poolSize'),
      iconCacheSize: this.average(recentMetrics, 'iconCacheSize'),
      memoryUsage: this.average(recentMetrics, 'memoryUsage'),
      renderTime: this.average(recentMetrics, 'renderTime'),
      filterTime: this.average(recentMetrics, 'filterTime')
    }

    const memoryTrend = this.getMemoryTrend()

    return { current, averages, memoryTrend }
  }

  /**
   * Calculate average for a metric
   */
  private average(metrics: PerformanceMetrics[], key: keyof PerformanceMetrics): number {
    const values = metrics
      .map(m => m[key])
      .filter((v): v is number => typeof v === 'number')
    
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
  }

  /**
   * Determine memory usage trend
   */
  private getMemoryTrend(): 'increasing' | 'stable' | 'decreasing' | 'unknown' {
    const memoryValues = this.metrics
      .slice(-10)
      .map(m => m.memoryUsage)
      .filter((v): v is number => typeof v === 'number')

    if (memoryValues.length < 3) return 'unknown'

    const first = memoryValues[0]
    const last = memoryValues[memoryValues.length - 1]
    const diff = last - first
    const threshold = first * 0.1 // 10% threshold

    if (diff > threshold) return 'increasing'
    if (diff < -threshold) return 'decreasing'
    return 'stable'
  }

  /**
   * Check for potential memory leaks
   */
  detectMemoryLeaks(): {
    hasLeak: boolean
    severity: 'low' | 'medium' | 'high'
    recommendations: string[]
  } {
    const stats = this.getStats()
    const recommendations: string[] = []
    let severity: 'low' | 'medium' | 'high' = 'low'
    let hasLeak = false

    // Check memory trend
    if (stats.memoryTrend === 'increasing') {
      hasLeak = true
      recommendations.push('Memory usage is continuously increasing')
      
      if (stats.current?.memoryUsage && stats.current.memoryUsage > 50 * 1024 * 1024) { // 50MB
        severity = 'high'
        recommendations.push('Memory usage exceeds 50MB - consider clearing caches')
      }
    }

    // Check pool size growth
    if (stats.averages.poolSize > 1000) {
      hasLeak = true
      severity = severity === 'high' ? 'high' : 'medium'
      recommendations.push('Marker pool is very large - optimize pool management')
    }

    // Check icon cache size
    if (stats.averages.iconCacheSize > 500) {
      hasLeak = true
      recommendations.push('Icon cache is very large - consider clearing cache')
    }

    return { hasLeak, severity, recommendations }
  }

  /**
   * Clear metrics history
   */
  clearMetrics(): void {
    this.metrics = []
  }

  /**
   * Export metrics for debugging
   */
  exportMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }
}

/**
 * Measure execution time of a function
 */
export function measureTime<T>(name: string, fn: () => T): T {
  const startTime = performance.now()
  const result = fn()
  const endTime = performance.now()
  
  console.log(`⏱️ ${name}: ${(endTime - startTime).toFixed(2)}ms`)
  return result
}

/**
 * Measure async execution time
 */
export async function measureTimeAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const startTime = performance.now()
  const result = await fn()
  const endTime = performance.now()
  
  console.log(`⏱️ ${name}: ${(endTime - startTime).toFixed(2)}ms`)
  return result
}

/**
 * Memory usage utility
 */
export function getMemoryUsage(): {
  used: number
  total: number
  percentage: number
} | null {
  if (!performance.memory) return null

  const { usedJSHeapSize, totalJSHeapSize } = performance.memory
  
  return {
    used: usedJSHeapSize,
    total: totalJSHeapSize,
    percentage: (usedJSHeapSize / totalJSHeapSize) * 100
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor()

/**
 * Development-only performance logging
 */
export function logPerformanceMetrics(): void {
  if (process.env.NODE_ENV !== 'development') return

  const stats = performanceMonitor.getStats()
  const leakDetection = performanceMonitor.detectMemoryLeaks()

  console.group('🏃 Map Performance Metrics')
  console.log('Current:', stats.current)
  console.log('Averages:', stats.averages)
  console.log('Memory Trend:', stats.memoryTrend)
  
  if (leakDetection.hasLeak) {
    console.group(`⚠️ Potential Memory Issues (${leakDetection.severity})`)
    leakDetection.recommendations.forEach(rec => console.warn(rec))
    console.groupEnd()
  }
  
  console.groupEnd()
}