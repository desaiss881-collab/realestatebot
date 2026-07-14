import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function resolveEnv(candidates: string[]) {
  for (const name of candidates) {
    const value = process.env[name as keyof NodeJS.ProcessEnv]
    if (value) return value
  }
  return undefined
}

function getRequiredEnv(primary: string, fallbacks: string[] = []) {
  const value = resolveEnv([primary, ...fallbacks])
  if (!value) {
    throw new Error(`${primary} (or fallback) is required.`)
  }
  return value
}

function createSupabaseAdminClient() {
  const url = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL', ['test_SUPABASE_URL', 'TEST_SUPABASE_URL'])
  const key = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY', [
    'test_SUPABASE_SERVICE_ROLE_KEY',
    'TEST_SUPABASE_SERVICE_ROLE_KEY',
  ])

  return createClient(url, key)
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = createSupabaseAdminClient()
    const value = Reflect.get(client, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
})