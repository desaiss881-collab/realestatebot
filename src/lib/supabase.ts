import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // NEXT_PUBLIC_* vars must be accessed as literals so Next.js inlines them at build time
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createBrowserClient(url, anon)
}