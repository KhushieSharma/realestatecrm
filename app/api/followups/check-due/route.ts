import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/database';

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();

    // Find follow-ups that are due (scheduled_for <= now) and pending and reminder not sent
    const now = new Date().toISOString();
    const { data: dueFollowUps, error: followUpsError } = await supabase
      .from('followups')
      .select('id, lead_id, title, scheduled_for, assigned_to')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .eq('reminder_sent', false);

    if (followUpsError) throw followUpsError;

    // For each due follow-up, create a notification and mark reminder_sent as true
    const notificationsToCreate = [];
    const followUpsToUpdate = [];

    for (const followUp of dueFollowUps) {
      // Create notification for the assigned user
      notificationsToCreate.push({
        organization_id: followUp.organization_id, // We'd need to get this from the follow-up or lead
        user_id: followUp.assigned_to,
        title: 'Follow-up Due',
        message: `Follow-up "${followUp.title}" is due now.`,
        type: 'followup_due',
        related_lead_id: followUp.lead_id,
        action_url: `/(dashboard)/followups/${followUp.id}`,
        is_read: false,
        is_clicked: false,
      });

      // Mark follow-up reminder as sent
      followUpsToUpdate.push(followUp.id);
    }

    // Insert notifications
    if (notificationsToCreate.length > 0) {
      const { error: notificationsError } = await supabase
        .from('notifications')
        .insert(notificationsToCreate);

      if (notificationsError) throw notificationsError;
    }

    // Update follow-ups
    if (followUpsToUpdate.length > 0) {
      const { error: updateError } = await supabase
        .from('followups')
        .update({
          reminder_sent: true,
          updated_at: new Date().toISOString(),
        })
        .in('id', followUpsToUpdate);

      if (updateError) throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${dueFollowUps.length} due follow-ups`,
      count: dueFollowUps.length,
    });
  } catch (error: any) {
    console.error('Error checking for due follow-ups:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check for due follow-ups' },
      { status: 500 }
    );
  }
}