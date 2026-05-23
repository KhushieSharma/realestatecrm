// EstateFlow CRM Authentication Utilities
// Auth helpers for Supabase integration

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getClientComponentClient } from './client'

/* ==========================================================================
   AUTH HELPER FUNCTIONS
   ========================================================================== */

/**
 * Get the current user session
 */
export async function getSession(): Promise<{ user: any; session: any } | null> {
  try {
    const supabase = getClientComponentClient()
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('Error getting session:', error)
      return null
    }

    return { user: session?.user ?? null, session }
  } catch (error) {
    console.error('Exception in getSession:', error)
    return null
  }
}

/**
 * Get the current user
 */
export async function getCurrentUser(): Promise<any | null> {
  try {
    const sessionData = await getSession()
    return sessionData?.user ?? null
  } catch (error) {
    console.error('Exception in getCurrentUser:', error)
    return null
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmailPassword(
  email: string,
  password: string
): Promise<{ user: any; session: any } | { error: string }> {
  try {
    const supabase = getClientComponentClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { error: error.message }
    }

    return { user: data.user ?? null, session: data.session ?? null }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmailPassword(
  email: string,
  password: string,
  metadata?: Record<string, any>
): Promise<{ user: any; session: any } | { error: string }> {
  try {
    const supabase = getClientComponentClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })

    if (error) {
      return { error: error.message }
    }

    return { user: data.user ?? null, session: data.session ?? null }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error: string | null }> {
  try {
    const supabase = getClientComponentClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

/**
 * Reset password via email
 */
export async function resetPasswordEmail(email: string): Promise<{ error: string | null }> {
  try {
    const supabase = getClientComponentClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // You can configure redirect URL if needed
      // redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

/**
 * Update user password
 */
export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
  try {
    const supabase = getClientComponentClient()
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

/**
 * Update user email
 */
export async function updateEmail(newEmail: string): Promise<{ error: string | null }> {
  try {
    const supabase = getClientComponentClient()
    const { error } = await supabase.auth.updateUser({
      email: newEmail,
    })

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

/**
 * Send email verification link
 */
export async function sendEmailVerification(): Promise<{ error: string | null }> {
  try {
    const supabase = getClientComponentClient()
    const { error } = await supabase.auth.resend({
      type: 'email',
    })

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

/**
 * Get Supabase client instance (for use in server components or API routes)
 * This function creates a new client each time - use sparingly
 */
export function createSupabaseClient(): SupabaseClient {
  // This would typically be used in server contexts
  // For client components, use getClientComponentClient() from ./client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

/* ==========================================================================
   AUTH STATE HELPERS (for React integration)
   ========================================================================== */

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const sessionData = await getSession()
  return !!sessionData?.session
}

/**
 * Check if user has a specific role
 */
export async function hasRole(role: string): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    if (!user) return false

    // Fetch the user's profile to check role
    const supabase = getClientComponentClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching user profile for role check:', error)
      return false
    }

    return profile?.role === role
  } catch (error) {
    console.error('Exception in hasRole:', error)
    return false
  }
}

/**
 * Get user's organization ID
 */
export async function getUserOrganizationId(): Promise<string | null> {
  try {
    const user = await getCurrentUser()
    if (!user) return null

    const supabase = getClientComponentClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching user profile for org ID:', error)
      return null
    }

    return profile?.organization_id ?? null
  } catch (error) {
    console.error('Exception in getUserOrganizationId:', error)
    return null
  }
}
