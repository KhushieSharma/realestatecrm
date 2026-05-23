'use server';

import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/supabase/database';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Follow-up form schema
const followUpFormSchema = z.object({
  leadId: z.string().uuid('Invalid lead'),
  followupType: z.enum(['call', 'whatsapp', 'sms', 'email', 'meeting']),
  subject: z.string().optional(), // For email
  body: z.string().min(1, 'Message body is required'),
  scheduledFor: z.date(),
  // For saving as template
  isTemplate: z.boolean().default(false),
  templateName: z.string().optional(),
});

export async function createFollowUp(prevState: any, formData: FormData) {
  // Validate form data
  const validatedFields = followUpFormSchema.safeParse({
    leadId: formData.get('leadId'),
    followupType: formData.get('followupType'),
    subject: formData.get('subject'),
    body: formData.get('body'),
    scheduledFor: formData.get('scheduledFor') ? new Date(formData.get('scheduledFor') as string) : undefined,
    isTemplate: formData.get('isTemplate') === 'on',
    templateName: formData.get('templateName'),
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

    // Verify lead belongs to organization
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', validatedFields.data.leadId)
      .eq('organization_id', organizationId)
      .single();

    if (leadError || !lead) {
      return { error: 'Lead not found or access denied' };
    }

    // If saving as template, update organization settings
    if (validatedFields.data.isTemplate && validatedFields.data.templateName) {
      // Get current organization settings
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', organizationId)
        .single();

      if (orgError) throw orgError;

      const settings = orgData.settings || {};
      const templates = settings.followup_templates || [];

      // Check if template with same name already exists
      const existingIndex = templates.findIndex((t: any) => t.name === validatedFields.data.templateName);
      const newTemplate = {
        id: crypto.randomUUID(),
        name: validatedFields.data.templateName,
        followupType: validatedFields.data.followupType,
        subject: validatedFields.data.subject,
        body: validatedFields.data.body,
      };

      if (existingIndex >= 0) {
        templates[existingIndex] = newTemplate;
      } else {
        templates.push(newTemplate);
      }

      // Update organization settings
      const { error: settingsError } = await supabase
        .from('organizations')
        .update({
          settings: {
            ...settings,
            followup_templates: templates,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId);

      if (settingsError) throw settingsError;
    }

    // Create the follow-up
    const { data: followUp, error: followUpError } = await supabase
      .from('followups')
      .insert({
        lead_id: validatedFields.data.leadId,
        organization_id: organizationId,
        assigned_to: user.id, // Assign to current user by default
        title: validatedFields.data.templateName || `Follow-up: ${validatedFields.data.followupType}`,
        description: validatedFields.data.body,
        followup_type: validatedFields.data.followupType,
        status: 'pending',
        scheduled_for: validatedFields.data.scheduledFor.toISOString(),
      })
      .select()
      .single();

    if (followUpError) throw followUpError;

    // Create initial activity log
    await supabase
      .from('activities')
      .insert({
        lead_id: validatedFields.data.leadId,
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'followup',
        description: `Follow-up scheduled: ${validatedFields.data.followupType}`,
        metadata: {
          followUpId: followUp.id,
          scheduledFor: validatedFields.data.scheduledFor.toISOString(),
        },
      });

    // Revalidate the follow-ups page and redirect
    revalidatePath('/(dashboard)/followups');
    redirect(`/ (dashboard)/followups/${followUp.id}`);
  } catch (error: any) {
    console.error('Error creating follow-up:', error);
    return {
      error: error.message || 'Failed to create follow-up',
    };
  }
}

export async function getFollowUps(
  organizationId: string,
  filters: {
    status?: string;
    followupType?: string;
    assignedTo?: string;
    leadId?: string;
    fromDate?: string;
    toDate?: string;
  } = {}
) {
  try {
    const supabase = getSupabaseServerClient();

    let query = supabase
      .from('followups')
      .select(`
        *,
        leads(full_name, phone),
        profiles!followups_assigned_to_fkey(full_name, avatar_url)
      `)
      .eq('organization_id', organizationId)
      .order('scheduled_for', { ascending: true });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.followupType) {
      query = query.eq('followup_type', filters.followupType);
    }

    if (filters.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }

    if (filters.leadId) {
      query = query.eq('lead_id', filters.leadId);
    }

    if (filters.fromDate) {
      query = query.gte('scheduled_for', filters.fromDate);
    }

    if (filters.toDate) {
      query = query.lte('scheduled_for', filters.toDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching follow-ups:', error);
    return [];
  }
}

export async function getFollowUpById(followUpId: string) {
  try {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('followups')
      .select(`
        *,
        leads(full_name, phone, email),
        profiles!followups_assigned_to_fkey(full_name, avatar_url),
        profiles!followups_lead_id_fkey(full_name as lead_full_name)
      `)
      .eq('id', followUpId)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching follow-up by ID:', error);
    return null;
  }
}

export async function updateFollowUp(
  followUpId: string,
  updates: Partial<{
    title: string;
    description: string;
    followup_type: 'call' | 'whatsapp' | 'sms' | 'email' | 'meeting';
    status: 'pending' | 'completed' | 'snoozed' | 'cancelled';
    scheduled_for: string;
    assigned_to: string;
  }>
) {
  try {
    const supabase = getSupabaseServerClient();

    // Get current user and organization for verification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    const organizationId = profile.organization_id;

    // Verify follow-up belongs to organization
    const { data: followUp, error: followUpError } = await supabase
      .from('followups')
      .select('id')
      .eq('id', followUpId)
      .eq('organization_id', organizationId)
      .single();

    if (followUpError || !followUp) {
      return { error: 'Follow-up not found or access denied' };
    }

    // Update follow-up
    const { data: updatedFollowUp, error: updateError } = await supabase
      .from('followups')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', followUpId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Create activity log for update
    await supabase
      .from('activities')
      .insert({
        lead_id: updatedFollowUp.lead_id,
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'followup',
        description: `Follow-up updated: ${updates.status || 'no status change'}`,
        metadata: {
          followUpId: followUpId,
          changes: updates,
        },
      });

    revalidatePath(`/ (dashboard)/followups/${followUpId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating follow-up:', error);
    return {
      error: error.message || 'Failed to update follow-up',
    };
  }
}

export async function deleteFollowUp(followUpId: string) {
  try {
    const supabase = getSupabaseServerClient();

    // Get current user and organization for verification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    const organizationId = profile.organization_id;

    // Verify follow-up belongs to organization
    const { data: followUp, error: followUpError } = await supabase
      .from('followups')
      .select('id, lead_id')
      .eq('id', followUpId)
      .eq('organization_id', organizationId)
      .single();

    if (followUpError || !followUp) {
      return { error: 'Follow-up not found or access denied' };
    }

    // Delete follow-up
    const { error: deleteError } = await supabase
      .from('followups')
      .delete()
      .eq('id', followUpId);

    if (deleteError) throw deleteError;

    // Create activity log for deletion
    await supabase
      .from('activities')
      .insert({
        lead_id: followUp.lead_id,
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'followup',
        description: 'Follow-up deleted',
        metadata: {
          followUpId: followUpId,
        },
      });

    revalidatePath('/(dashboard)/followups');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting follow-up:', error);
    return {
      error: error.message || 'Failed to delete follow-up',
    };
  }
}

export async function getTemplates(organizationId: string) {
  try {
    const supabase = getSupabaseServerClient();

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', organizationId)
      .single();

    if (orgError) throw orgError;

    const settings = orgData.settings || {};
    return settings.followup_templates || [];
  } catch (error) {
    console.error('Error fetching templates:', error);
    return [];
  }
}

export async function updateTemplate(
  organizationId: string,
  templateId: string,
  updates: Partial<{
    name: string;
    followupType: 'call' | 'whatsapp' | 'sms' | 'email' | 'meeting';
    subject: string;
    body: string;
  }>
) {
  try {
    const supabase = getSupabaseServerClient();

    // Get current user and organization for verification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    const organizationIdFromProfile = profile.organization_id;
    if (organizationIdFromProfile !== organizationId) {
      return { error: 'Organization mismatch' };
    }

    // Get current organization settings
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', organizationId)
      .single();

    if (orgError) throw orgError;

    const settings = orgData.settings || {};
    let templates = settings.followup_templates || [];

    // Find template index
    const templateIndex = templates.findIndex((t: any) => t.id === templateId);
    if (templateIndex === -1) {
      return { error: 'Template not found' };
    }

    // Update template
    templates[templateIndex] = {
      ...templates[templateIndex],
      ...updates,
    };

    // Update organization settings
    const { error: settingsError } = await supabase
      .from('organizations')
      .update({
        settings: {
          ...settings,
          followup_templates: templates,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId);

    if (settingsError) throw settingsError;

    revalidatePath('/(dashboard)/followups/new');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating template:', error);
    return {
      error: error.message || 'Failed to update template',
    };
  }
}

export async function deleteTemplate(organizationId: string, templateId: string) {
  try {
    const supabase = getSupabaseServerClient();

    // Get current user and organization for verification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    const organizationIdFromProfile = profile.organization_id;
    if (organizationIdFromProfile !== organizationId) {
      return { error: 'Organization mismatch' };
    }

    // Get current organization settings
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', organizationId)
      .single();

    if (orgError) throw orgError;

    const settings = orgData.settings || {};
    let templates = settings.followup_templates || [];

    // Remove template
    templates = templates.filter((t: any) => t.id !== templateId);

    // Update organization settings
    const { error: settingsError } = await supabase
      .from('organizations')
      .update({
        settings: {
          ...settings,
          followup_templates: templates,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId);

    if (settingsError) throw settingsError;

    revalidatePath('/(dashboard)/followups/new');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting template:', error);
    return {
      error: error.message || 'Failed to delete template',
    };
  }
}

// Server action to check for due follow-ups and create notifications
export async function checkForDueFollowUps() {
  try {
    const supabase = getSupabaseServerClient();

    // Get current user and organization
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

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

    // Find follow-ups that are due (scheduled_for <= now) and pending and reminder not sent
    const now = new Date().toISOString();
    const { data: dueFollowUps, error: followUpsError } = await supabase
      .from('followups')
      .select('id, lead_id, title, scheduled_for')
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .eq('reminder_sent', false);

    if (followUpsError) throw followUpsError;

    // For each due follow-up, create a notification and mark reminder_sent as true
    for (const followUp of dueFollowUps) {
      // Create notification
      await supabase
        .from('notifications')
        .insert({
          organization_id: organizationId,
          user_id: user.id, // Notify the assigned user? For now, notify current user
          title: 'Follow-up Due',
          message: `Follow-up "${followUp.title}" is due now.`,
          type: 'followup_due',
          related_lead_id: followUp.lead_id,
          action_url: `/ (dashboard)/followups/${followUp.id}`,
          is_read: false,
          is_clicked: false,
        });

      // Mark follow-up reminder as sent
      await supabase
        .from('followups')
        .update({
          reminder_sent: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', followUp.id);
    }

    return { success: true, count: dueFollowUps.length };
  } catch (error: any) {
    console.error('Error checking for due follow-ups:', error);
    return {
      error: error.message || 'Failed to check for due follow-ups',
    };
  }
}