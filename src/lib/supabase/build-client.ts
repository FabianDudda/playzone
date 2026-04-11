/**
 * Plain Supabase client for use in generateStaticParams and sitemap.
 * Does NOT use cookies() — safe to call outside request scope.
 */
import { createClient } from '@supabase/supabase-js'
import { Database } from './types'

export function createBuildClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
