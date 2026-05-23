// Example usage of EstateFlow CRM Supabase utilities
// This file demonstrates how to use the Supabase client, database helpers, and auth utilities

import { getClientComponentClient, createServerClient } from './client'
import { getLeads, createLead, validateLeadData } from './database'
import { getCurrentUser, signInWithEmailPassword } from './auth'

/* ==========================================================================
   EXAMPLE: Client-side usage in React components
   ========================================================================== */

/**
 * Example: Fetch leads for the current user's organization
 */
export async function fetchUserLeadsExample() {
  try {
    // Get the Supabase client for client-side usage
    const supabase = getClientComponentClient()

    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user's organization
    // Note: In a real app, you might use getUserOrganization from database.ts
    // For this example, we'll do a simple query
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      throw new Error('User not associated with an organization')
    }

    // Fetch leads for the organization
    const leads = await getLeads(supabase, profile.organization_id, {
      status: 'New',
      limit: 10
    })

    return leads
  } catch (error) {
    console.error('Error in fetchUserLeadsExample:', error)
    return []
  }
}

/**
 * Example: Create a new lead with validation
 */
export async function createNewLeadExample(leadData: any) {
  try {
    // Validate the lead data first
    const validation = validateLeadData(leadData)
    if (!validation.isValid) {
      throw new Error(`Invalid lead data: ${validation.errors.join(', ')}`)
    }

    // Get Supabase client
    const supabase = getClientComponentClient()

    // Get current user to assign as agent
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Prepare lead data with required fields
    const leadToCreate = {
      ...leadData,
      organization_id: 'TODO: Get from user profile', // In real app, get from profile
      assigned_agent_id: user.id,
    }

    // Create the lead
    const newLead = await createLead(supabase, leadToCreate)
    return newLead
  } catch (error) {
    console.error('Error in createNewLeadExample:', error)
    return null
  }
}

/* ==========================================================================
   EXAMPLE: Server-side usage in API routes or server actions
   ========================================================================== */

/**
 * Example: Server-side function to get leads (for API routes)
 */
export async function getLeadsServerSideExample(organizationId: string) {
  try {
    // Create a server-side Supabase client
    const supabase = createServerClient()

    // Fetch leads
    const leads = await getLeads(supabase, organizationId, {
      status: 'Interested',
      temperature: 'Hot'
    })

    return leads
  } catch (error) {
    console.error('Error in getLeadsServerSideExample:', error)
    return []
  }
}

/* ==========================================================================
   EXAMPLE: Authentication flow
   ========================================================================== */

/**
 * Example: Sign in user and then fetch their data
 */
export async function signInAndFetchDataExample(email: string, password: string) {
  try {
    // Sign in the user
    const authResult = await signInWithEmailPassword(email, password)

    if ('error' in authResult) {
      throw new Error(authResult.error)
    }

    // Now fetch user's leads
    const leads = await fetchUserLeadsExample()

    return {
      user: authResult.user,
      leads
    }
  } catch (error) {
    console.error('Error in signInAndFetchDataExample:', error)
    throw error
  }
}
