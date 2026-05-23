'use server';

import { getSupabaseServerClient } from '@/lib/supabase/database';
import { revalidatePath } from 'next/cache';

export async function getNotifications(
  organizationId: string,
  filters: {
    isRead?: boolean;
    type?: string;
    fromDate?: string;
    toDate?: string;
  } = {}
) {
  try {
    const supabase = getSupabaseServerClient();

    let query = supabase
      .from('notifications')
      .select(`
        *,
        leads!notifications_related_lead_id_fkey(full_name),
        profiles!notifications_user_id_fkey(full_name, avatar_url)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (filters.isRead !== undefined) {
      query = query.eq('is_read', filters.isRead);
    }

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.fromDate) {
      query = query.gte('created_at', filters.fromDate);
    }

    if (filters.toDate) {
      query = query.lte('created_at', filters.toDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

export async function getUnreadNotificationsCount(organizationId: string) {
  try {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('is_read', false);

    if (error) throw error;

    return data?.length || 0;
  } catch (error) {
    console.error('Error fetching unread notifications count:', error);
    return 0;
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const supabase = getSupabaseServerClient();

    // Get current user and organization for verification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    const organizationId = profile.organization_id;

    // Verify notification belongs to organization
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .select('id')
      .eq('id', notificationId)
      .eq('organization_id', organizationId)
      .single();

    if (notificationError || !notification) {
      return { error: 'Notification not found or access denied' };
    }

    // Update notification
    const { data: updatedNotification, error: updateError } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .select()
      .single();

    if (updateError) throw updateError;

    revalidatePath('/(dashboard)/notifications');
    return { success: true };
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return {
      error: error.message || 'Failed to mark notification as read',
    };
  }
}

export async function markAllNotificationsAsRead(organizationId: string) {
  try {
    const supabase = getSupabaseServerClient();

    // Get current user and organization for verification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    // Verify organization matches
    if (profile.organization_id !== organizationId) {
      return { error: 'Organization mismatch' };
    }

    // Update all unread notifications for the organization
    const { error: updateError } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('is_read', false);

    if (updateError) throw updateError;

    revalidatePath('/(dashboard)/notifications');
    return { success: true };
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    return {
      error: error.message || 'Failed to mark all notifications as read',
    };
  }
}

export async function deleteNotification(notificationId: string) {
  try {
    const supabase = getSupabaseServerClient();

    // Get current user and organization for verification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    const organizationId = profile.organization_id;

    // Verify notification belongs to organization
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .select('id')
      .eq('id', notificationId)
      .eq('organization_id', organizationId)
      .single();

    if (notificationError || !notification) {
      return { error: 'Notification not found or access denied' };
    }

    // Delete notification
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (deleteError) throw deleteError;

    revalidatePath('/(dashboard)/notifications');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    return {
      error: error.message || 'Failed to delete notification',
    };
  }
}