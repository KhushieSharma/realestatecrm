import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/supabase/database';

// Lead webhook payload schema
const leadPayloadSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(10, 'Phone number is required'),
  email: z.string().email('Invalid email address').optional(),
  source: z.string().min(1, 'Source is required'),
  propertyType: z.enum(['Apartment', 'Villa', 'Plot', 'Commercial', 'Rental']).optional(),
  budgetMin: z.number().min(0, 'Budget minimum must be positive').optional(),
  budgetMax: z.number().min(0, 'Budget maximum must be positive').optional(),
  preferredLocation: z.string().optional(),
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

// Helper function to get available agents for round-robin assignment
async function getAvailableAgents(supabase: any, organizationId: string) {
  const { data: agents, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('organization_id', organizationId)
    .in('role', ['sales_agent', 'sales_manager'])
    .order('id'); // Order by ID for consistent round-robin

  if (error) {
    console.error('Error fetching available agents:', error);
    throw error;
  }

  return agents || [];
}

// Helper function to get the last assigned lead for round-robin logic
async function getLastAssignedAgent(supabase: any, organizationId: string) {
  const { data: lastLead, error } = await supabase
    .from('leads')
    .select('assigned_agent_id')
    .eq('organization_id', organizationId)
    .not('assigned_agent_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
    console.error('Error fetching last assigned agent:', error);
    throw error;
  }

  return lastLead?.assigned_agent_id || null;
}

export async function POST(request: Request) {
  try {
    // Verify webhook secret
    const webhookSecret = request.headers.get('x-webhook-secret');
    const expectedSecret = process.env.LEAD_WEBHOOK_SECRET;

    if (!expectedSecret || webhookSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid webhook secret' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedFields = leadPayloadSchema.safeParse(body);

    if (!validatedFields.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: validatedFields.error.format() },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // For webhook leads, we'll use a default organization
    // In a multi-tenant setup, you might determine organization from the source or API key
    // For now, we'll get the first organization (this should be improved for production)
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);

    if (orgError) throw orgError;

    if (!organizations || organizations.length === 0) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 500 }
      );
    }

    const organizationId = organizations[0].id;

    // Get or create lead source
    const sourceId = await getOrCreateLeadSource(
      supabase,
      validatedFields.data.source,
      organizationId
    );

    // Get available agents for assignment
    const availableAgents = await getAvailableAgents(supabase, organizationId);

    let assignedAgentId = null;

    if (availableAgents.length > 0) {
      // Implement round-robin assignment
      const lastAssignedAgentId = await getLastAssignedAgent(supabase, organizationId);

      let startIndex = 0;
      if (lastAssignedAgentId) {
        const lastIndex = availableAgents.findIndex(
          agent => agent.id === lastAssignedAgentId
        );
        if (lastIndex !== -1) {
          startIndex = (lastIndex + 1) % availableAgents.length;
        }
      }

      assignedAgentId = availableAgents[startIndex].id;
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
        assigned_agent_id: assignedAgentId,
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
        description: `Lead created from webhook source: ${validatedFields.data.source}`,
        metadata: {
          source: validatedFields.data.source,
          webhook: true,
        },
      });

    // TODO: Trigger instant call bridge automation here
    // This would involve calling the Twilio service to initiate the call bridge
    // For now, we'll just note that this should happen

    return NextResponse.json(
      {
        success: true,
        leadId: lead.id,
        message: 'Lead created successfully',
        assignedAgentId: assignedAgentId
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error processing lead webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}