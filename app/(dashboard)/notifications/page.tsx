import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/database';

export default async function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    isRead: 'all', // 'all', 'read', 'unread'
    type: 'all',
  });
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Get current user and organization
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      const organizationId = profile.organization_id;
      if (!organizationId) {
        setError('User must be associated with an organization');
        setLoading(false);
        return;
      }

      // Fetch notifications with filters
      let query = supabase
        .from('notifications')
        .select(`
          *,
          leads!notifications_related_lead_id_fkey(full_name),
          profiles!notifications_user_id_fkey(full_name, avatar_url)
        `)
        .eq('organization_id', organizationId);

      if (filters.isRead === 'read') {
        query = query.eq('is_read', true);
      } else if (filters.isRead === 'unread') {
        query = query.eq('is_read', false);
      }

      if (filters.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }

      const { data: notificationsData, error: notificationsError } = await query
        .order('created_at', { ascending: false });

      if (notificationsError) throw notificationsError;

      // Fetch unread count
      const { data: countData, error: countError } = await supabase
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('is_read', false);

      let count = 0;
      if (!countError && countData) {
        count = countData.length;
      }

      setNotifications(notificationsData || []);
      setUnreadCount(count);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      // Call the server action
      // Note: In a real app, you'd use useFormState or similar
      // For now, we'll update optimistically and refetch
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
      // Rollback optimistic update would go here
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      // Update optimistically
      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          is_read: true,
        }))
      );
      setUnreadCount(0);
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
      // Rollback optimistic update would go here
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="animate-spin rounded-full border-4 border-t-indigo-600 border-b-indigo-600 h-12 w-12"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 mb-6">
        <p className="font-medium">{error}</p>
      </div>
    );
  }

  // Filter options
  const readOptions = [
    { value: 'all', label: 'All' },
    { value: 'read', label: 'Read' },
    { value: 'unread', label: 'Unread' },
  ];

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'lead_assigned', label: 'Lead Assigned' },
    { value: 'missed_call', label: 'Missed Call' },
    { value: 'followup_due', label: 'Follow-up Due' },
    { value: 'site_visit', label: 'Site Visit' },
    { value: 'property_shared', label: 'Property Shared' },
    { value: 'attendance_issue', label: 'Attendance Issue' },
    { value: 'social_post_due', label: 'Social Post Due' },
    { value: 'system', label: 'System' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center px-2.5 rounded-full bg-red-500 text-xs font-medium text-white">
              {unreadCount}
            </span>
          )}
        </h1>
        <Link
          href="/(dashboard)/"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-gray-500"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Filters */}
      <div className="grid gap-4 md:grid-cols-[120px_120px_1fr]">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filters.isRead}
            onChange={(e) => handleFilterChange('isRead', e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            {readOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            {typeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 flex md:justify-end">
          <button
            onClick={() => {
              setFilters({
                isRead: 'all',
                type: 'all',
              });
            }}
            className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-indigo-500"
          >
            Reset Filters
          </button>
          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-blue-500"
          >
            Mark All as Read
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.length > 0 ? (
          notifications.map((notification: any) => (
            <div
              key={notification.id}
              className={`p-4 border-l-4 ${
                notification.is_read ? 'border-gray-200 bg-gray-50' : 'border-indigo-500 bg-white'
              } rounded-md shadow-sm hover:bg-gray-50 transition-colors`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-medium text-gray-900">
                      {notification.title}
                    </h3>
                    <p className="text-xs text-gray-500 ml-4">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                  <p className="mt-2 text-gray-700">{notification.message}</p>
                  {notification.leads?.full_name && (
                    <p className="mt-1 text-xs text-gray-500">
                      Related to lead: {notification.leads.full_name}
                    </p>
                  )}
                </div>
                <div className="ml-4 flex-shrink-0">
                  {!notification.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="text-indigo-600 hover:text-indigo-500"
                    >
                      Mark as Read
                    </button>
                  )}
                  {notification.action_url && (
                    <Link
                      href={notification.action_url}
                      className="mt-2 block text-sm font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      Go to Item
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">
              No notifications found matching your filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}