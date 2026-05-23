import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

// Validate Supabase environment variables
const getSupabaseEnv = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check your .env.local file.'
    )
  }

  return { url, anonKey, serviceRoleKey }
}

// Create a server-side Supabase client for API routes and server actions
export const createServerClient = () => {
  const { url, serviceRoleKey } = getSupabaseEnv()
  return createSupabaseServerClient({
    supabaseUrl: url,
    supabaseKey: serviceRoleKey,
    cookies: {
      getAll() {
        return []
      },
      setAll() {},
    },
  })
}

// Create a client-side Supabase client for components and pages (singleton)
let clientComponentClient: ReturnType<typeof createClient> | null = null

export const getClientComponentClient = () => {
  if (!clientComponentClient) {
    const { url, anonKey } = getSupabaseEnv()
    clientComponentClient = createClient(url, anonKey)
  }
  return clientComponentClient
}