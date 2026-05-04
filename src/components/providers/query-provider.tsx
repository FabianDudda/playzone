'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'

const ReactQueryDevtools = process.env.NODE_ENV === 'development'
  ? dynamic(() => import('@tanstack/react-query-devtools').then(m => ({ default: m.ReactQueryDevtools })), { ssr: false })
  : () => null

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  useEffect(() => {
    const persister = createSyncStoragePersister({ storage: window.localStorage })
    persistQueryClient({
      queryClient,
      persister,
      maxAge: 30 * 60 * 1000, // 30 minutes
      // Only persist the lightweight places query
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => query.queryKey[0] === 'places-lightweight',
      },
    })
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  )
}