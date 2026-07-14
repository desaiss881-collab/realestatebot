import { createBrowserClient } from '@supabase/ssr'

function resolveEnv(candidates: string[]) {
  for (const name of candidates) {
    const value = process.env[name as keyof NodeJS.ProcessEnv]
    if (value) return value
  }
  return undefined
}

export function createClient() {
  const url = resolveEnv(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_test_SUPABASE_URL', 'test_SUPABASE_URL', 'TEST_SUPABASE_URL'])
  const anon = resolveEnv([
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_test_SUPABASE_ANON_KEY',
    'test_SUPABASE_ANON_KEY',
    'TEST_SUPABASE_ANON_KEY',
  ])

  if (!url || !anon) {
    throw new Error('@supabase/ssr: Your project URL and API key are required to create a Supabase client!')
  }

  return createBrowserClient(url, anon)
}