// EstateFlow CRM Database Utilities
// Reusable database query helpers and type definitions

import { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from './client'

/**
 * Create a server-side Supabase client for API routes and server actions
 * Re-exported from client module for convenience
 */
export const getSupabaseServerClient = createServerClient

/* ==========================================================================
   TYPE DEFINITIONS (based on schema)
   ========================================================================== */

export interface Organization {
  id: string
  name: string
  subscription_plan: string
  settings: Json
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  organization_id: string | null
  full_name: string
  phone: string | null
  role: 'admin' | 'sales_manager' | 'sales_agent' | 'field_executive' | 'social_media_manager'
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  organization_id: string
  assigned_agent_id: string | null
  source_id: string | null
  full_name: string
  phone: string
  email: string | null
  property_type: 'Apartment' | 'Villa' | 'Plot' | 'Commercial' | 'Rental' | null
  budget_min: number | null
  budget_max: number | null
  preferred_location: string | null
  status: 'New' | 'Contacted' | 'Interested' | 'Site Visit Scheduled' | 'Negotiation' | 'Won' | 'Lost' | 'Not Responding'
  temperature: 'Cold' | 'Warm' | 'Hot'
  notes: string | null
  next_followup: string | null
  created_at: string
  last_contacted: string | null
  updated_at: string
}

export interface Property {
  id: string
  organization_id: string
  owner_id: string | null
  title: string
  location: string | null
  address: string | null
  property_type: 'Apartment' | 'Villa' | 'Plot' | 'Commercial' | 'Rental'
  price: number | null
  size: number | null
  bedrooms: number | null
  bathrooms: number | null
  floor: number | null
  furnishing_status: 'Furnished' | 'Semi-Furnished' | 'Unfurnished' | null
  availability_status: 'Available' | 'Hold' | 'Sold' | 'Rented'
  description: string | null
  amenities: string[] | null
  created_at: string
  updated_at: string
}

export interface Activity {
  id: string
  organization_id: string
  lead_id: string
  user_id: string | null
  activity_type: 'call' | 'message' | 'note' | 'followup' | 'property_share' | 'status_change' | 'assignment'
  description: string | null
  metadata: Json
  created_at: string
  updated_at: string
}

export interface Json {
  [key: string]: any
}

/* ==========================================================================
   DATABASE HELPER FUNCTIONS
   ========================================================================== */

/**
 * Get the profile for the current user
 */
export async function getProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return data
}

/**
 * Get the organization for the current user
 */
export async function getUserOrganization(
  supabase: SupabaseClient,
  userId: string
): Promise<Organization | null> {
  // Get the user's profile first to get their organization_id
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .single()

  if (profileError || !profileData) {
    console.error('Error fetching user profile:', profileError)
    return null
  }

  // If the user doesn't belong to an organization, return null
  if (!profileData.organization_id) {
    return null
  }

  // Get the organization details
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profileData.organization_id)
    .single()

  if (orgError) {
    console.error('Error fetching organization:', orgError)
    return null
  }

  return orgData
}

/**
 * Get leads for an organization with optional filtering
 */
export async function getLeads(
  supabase: SupabaseClient,
  organizationId: string,
  filters: {
    status?: Lead['status']
    temperature?: Lead['temperature']
    assignedAgentId?: string
    searchTerm?: string
  } = {}
): Promise<Lead[]> {
  let query = supabase.from('leads').select('*').eq('organization_id', organizationId)

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.temperature) {
    query = query.eq('temperature', filters.temperature)
  }

  if (filters.assignedAgentId) {
    query = query.eq('assigned_agent_id', filters.assignedAgentId)
  }

  if (filters.searchTerm) {
    const term = `%${filters.searchTerm}%`
    query = query.or(`full_name.ilike.${term},phone.ilike.${term},email.ilike.${term}`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching leads:', error)
    return []
  }

  return data
}

/**
 * Get a lead by ID
 */
export async function getLeadById(
  supabase: SupabaseClient,
  leadId: string
): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (error) {
    console.error('Error fetching lead:', error)
    return null
  }

  return data
}

/**
 * Create a new lead
 */
export async function createLead(
  supabase: SupabaseClient,
  lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>
): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('leads')
    .insert([
      {
        ...lead,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single()

  if (error) {
    console.error('Error creating lead:', error)
    return null
  }

  return data
}

/**
 * Update a lead
 */
export async function updateLead(
  supabase: SupabaseClient,
  leadId: string,
  updates: Partial<Lead>
): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('leads')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)
    .select()
    .single()

  if (error) {
    console.error('Error updating lead:', error)
    return null
  }

  return data
}

/**
 * Get activities for a lead
 */
export async function getLeadActivities(
  supabase: SupabaseClient,
  leadId: string
): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching activities:', error)
    return []
  }

  return data
}

/**
 * Create an activity
 */
export async function createActivity(
  supabase: SupabaseClient,
  activity: Omit<Activity, 'id' | 'created_at' | 'updated_at'>
): Promise<Activity | null> {
  const { data, error } = await supabase
    .from('activities')
    .insert([
      {
        ...activity,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single()

  if (error) {
    console.error('Error creating activity:', error)
    return null
  }

  return data
}

/* ==========================================================================
   SCHEMA VALIDATION HELPERS (using Zod-like validation with TypeScript)
   ========================================================================== */

/**
 * Validate lead data before inserting/updating
 * In a real app, you would use Zod or Yup, but for basic validation we'll do simple checks
 */
export function validateLeadData(data: Partial<Lead>): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Required fields
  if (!data.full_name || data.full_name.trim() === '') {
    errors.push('Full name is required')
  }

  if (!data.phone || data.phone.trim() === '') {
    errors.push('Phone number is required')
  }

  // Validate phone format (basic)
  if (data.phone && !/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(data.phone)) {
    errors.push('Invalid phone number format')
  }

  // Validate email if provided
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format')
  }

  // Validate budget
  if (data.budget_min !== null && data.budget_min < 0) {
    errors.push('Minimum budget cannot be negative')
  }

  if (data.budget_max !== null && data.budget_max < 0) {
    errors.push('Maximum budget cannot be negative')
  }

  if (
    data.budget_min !== null &&
    data.budget_max !== null &&
    data.budget_min > data.budget_max
  ) {
    errors.push('Minimum budget cannot be greater than maximum budget')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Validate property data
 */
export function validatePropertyData(data: Partial<Property>): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.title || data.title.trim() === '') {
    errors.push('Title is required')
  }

  if (data.price !== null && data.price < 0) {
    errors.push('Price cannot be negative')
  }

  if (data.size !== null && data.size < 0) {
    errors.push('Size cannot be negative')
  }

  if (data.bedrooms !== null && data.bedrooms < 0) {
    errors.push('Bedrooms cannot be negative')
  }

  if (data.bathrooms !== null && data.bathrooms < 0) {
    errors.push('Bathrooms cannot be negative')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
