'use server';

import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/supabase/database';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Lead form schema
const leadFormSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(10, 'Phone number is required'),
  email: z.string().email('Invalid email address').optional(),
  propertyType: z.enum(['Apartment', 'Villa', 'Plot', 'Commercial', 'Rental']).optional(),
  budgetMin: z.number().min(0, 'Budget minimum must be positive').optional(),
  budgetMax: z.number().min(0, 'Budget maximum must be positive').optional(),
  preferredLocation: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

// Helper function to get or create lead source
async function getOrCreateLeadSource(supabase: any, sourceName: string, organizationId: string) {
  // Try to find existing source
  const { data: existingSource } = await supabase
    .from('lead_sources')
    .select('id')
    .eq('name', sourceName)
    .eq('organization_id', organizationId)
    .single();

  if (existingSource) {
    return existingSource.id;
  }

  // Create new source if not found
  const { data: newSource, error } = await supabase
    .from('lead_sources')
    .insert({
      name: sourceName,
      organization_id: organizationId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating lead source:', error);
    throw error;
  }

  return newSource.id;
}

export async function createLead(prevState: any, formData: FormData) {
  // Validate form data
  const validatedFields = leadFormSchema.safeParse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    propertyType: formData.get('propertyType'),
    budgetMin: formData.get('budgetMin') ? parseFloat(formData.get('budgetMin') as string) : undefined,
    budgetMax: formData.get('budgetMax') ? parseFloat(formData.get('budgetMax') as string) : undefined,
    preferredLocation: formData.get('preferredLocation'),
    source: formData.get('source'),
    notes: formData.get('notes'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const supabase = getSupabaseServerClient();

    // Get current user and organization
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    // Get user's profile to get organization ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    const organizationId = profile.organization_id;
    if (!organizationId) {
      return { error: 'User must be associated with an organization' };
    }

    // Get or create lead source
    let sourceId = null;
    if (validatedFields.data.source) {
      sourceId = await getOrCreateLeadSource(supabase, validatedFields.data.source, organizationId);
    }

    // Create the lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        full_name: validatedFields.data.fullName,
        phone: validatedFields.data.phone,
        email: validatedFields.data.email,
        property_type: validatedFields.data.propertyType,
        budget_min: validatedFields.data.budgetMin,
        budget_max: validatedFields.data.budgetMax,
        preferred_location: validatedFields.data.preferredLocation,
        source_id: sourceId,
        notes: validatedFields.data.notes,
        organization_id: organizationId,
        // Initially unassigned - will be assigned via webhook or manually
        status: 'New',
        temperature: 'Cold',
      })
      .select()
      .single();

    if (leadError) throw leadError;

    // Create initial activity log
    await supabase
      .from('activities')
      .insert({
        lead_id: lead.id,
        organization_id: organizationId,
        activity_type: 'note',
        description: 'Lead created',
        metadata: {
          createdBy: user.id,
          source: validatedFields.data.source || 'Manual Entry',
        },
      });

    // Revalidate the leads page and redirect
    revalidatePath('/(dashboard)/leads');
    redirect(`/ (dashboard)/leads/${lead.id}`);
  } catch (error: any) {
    console.error('Error creating lead:', error);
    return {
      error: error.message || 'Failed to create lead',
    };
  }
}