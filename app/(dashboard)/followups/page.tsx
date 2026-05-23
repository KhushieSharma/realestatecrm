import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/database';

export default async function FollowUpsPage() {
  const [followUps, setFollowUps] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    followupType: 'all',
    assignedTo: 'all',
    leadId: '',
    fromDate: '',
    toDate: '',
  });
  const [newFollowUp, setNewFollowUp] = useState({
    leadId: '',
    followupType: 'call',
    subject: '',
    body: '',
    scheduledFor: '',
    isTemplate: false,
    templateName: '',
  });

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
        .select('organization_id, role')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      const organizationId = profile.organization_id;
      if (!organizationId) {
        setError('User must be associated with an organization');
        setLoading(false);
        return;
      }

      // Fetch follow-ups with filters
      let query = supabase
        .from('followups')
        .select(`
          *,
          leads(full_name, phone),
          profiles!followups_assigned_to_fkey(full_name, avatar_url)
        `)
        .eq('organization_id', organizationId);

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.followupType && filters.followupType !== 'all') {
        query = query.eq('followup_type', filters.followupType);
      }

      if (filters.assignedTo && filters.assignedTo !== 'all') {
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

      const { data: followUpsData, error: followUpsError } = await query
        .order('scheduled_for', { ascending: true });

      if (followUpsError) throw followUpsError;

      // Fetch templates
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', organizationId)
        .single();

      let fetchedTemplates = [];
      if (!orgError && orgData?.settings) {
        fetchedTemplates = orgData.settings.followup_templates || [];
      }

      setFollowUps(followUpsData || []);
      setTemplates(fetchedTemplates);
    } catch (err: any) {
      console.error('Error fetching follow-ups:', err);
      setError(err.message || 'Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleNewFollowUpChange = (field: string, value: string) => {
    setNewFollowUp(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (field: string, value: string) => {
    setNewFollowUp(prev => ({ ...prev, [field]: value }));
  };

  const handleToggleTemplate = () => {
    setNewFollowUp(prev => ({ ...prev, isTemplate: !prev.isTemplate }));
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
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'snoozed', label: 'Snoozed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const followupTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'call', label: 'Call' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'sms', label: 'SMS' },
    { value: 'email', label: 'Email' },
    { value: 'meeting', label: 'Meeting' },
  ];

  // Get assigned users for filter (simplified - in real app would fetch from profiles)
  const assignedToOptions = [
    { value: 'all', label: 'All Users' },
    // Would normally fetch from database
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Follow-ups</h1>
        <div className="flex space-x-3">
          <Link
            href="/(dashboard)/followups/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-indigo-500"
          >
            + Schedule Follow-up
          </Link>
          <Link
            href="/(dashboard)/followups/new?template=true"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-green-500"
          >
            + Create Template
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="grid gap-4 md:grid-cols-[120px_120px_120px_120px_120px_1fr]">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={filters.followupType}
            onChange={(e) => handleFilterChange('followupType', e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            {followupTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
          <select
            value={filters.assignedTo}
            onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            {assignedToOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lead ID</label>
          <input
            type="text"
            placeholder="Lead ID"
            value={filters.leadId}
            onChange={(e) => handleFilterChange('leadId', e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
          <input
            type="date"
            value={filters.fromDate}
            onChange={(e) => handleFilterChange('fromDate', e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
          <input
            type="date"
            value={filters.toDate}
            onChange={(e) => handleFilterChange('toDate', e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div className="md:col-span-3 flex md:justify-end">
          <button
            onClick={() => {
              setFilters({
                status: 'all',
                followupType: 'all',
                assignedTo: 'all',
                leadId: '',
                fromDate: '',
                toDate: '',
              });
            }}
            className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-indigo-500"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Follow-ups Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Follow-up
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lead
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Scheduled
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {followUps.length > 0 ? (
              followUps.map((followUp: any) => (
                <tr key={followUp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                        {followUp.title?.charAt(0) ?? 'F'}
                      </div>
                      <div className="flex-1 min-w-0 break-words">
                        <p className="text-sm font-medium text-gray-900">{followUp.title}</p>
                        {followUp.description && (
                          <p className="text-xs text-gray-500 line-clamp-2">{followUp.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                        {followUp.leads?.full_name?.charAt(0) ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0 break-words">
                        <p className="text-sm font-medium text-gray-900">{followUp.leads?.full_name}</p>
                        <p className="text-xs text-gray-500">{followUp.leads?.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${followupTypeToColorClass(followUp.followup_type)}`}
                    >
                      {followUp.followup_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-gray-900">
                      {new Date(followUp.scheduled_for).toLocaleString()}
                    </p>
                    {followUp.reminder_sent ? (
                      <p className="text-xs text-green-500">Reminder sent</p>
                    ) : (
                      <p className="text-xs text-red-500">No reminder</p>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${followUpStatusToColorClass(followUp.status)}`}
                    >
                      {followUp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/(dashboard)/followups/${followUp.id}`}
                      className="text-indigo-600 hover:text-indigo-500"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => {
                        // In a real app, you'd show a confirmation modal
                        if (window.confirm('Are you sure you want to delete this follow-up?')) {
                          // Call delete action
                        }
                      }}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-6 py-4 text-center text-gray-500" colSpan="6">
                  No follow-ups found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Helper functions for status/temperature colors
function followUpStatusToColorClass(status: string): string {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'completed': return 'bg-emerald-100 text-emerald-800';
    case 'snoozed': return 'bg-blue-100 text-blue-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function followupTypeToColorClass(type: string): string {
  switch (type) {
    case 'call': return 'bg-indigo-100 text-indigo-800';
    case 'whatsapp': return 'bg-green-100 text-green-800';
    case 'sms': return 'bg-blue-100 text-blue-800';
    case 'email': return 'bg-purple-100 text-purple-800';
    case 'meeting': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}