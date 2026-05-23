import { notFound } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/database';

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [lead, setLead] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [propertyShares, setPropertyShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeadData();
  }, [params.id]);

  async function fetchLeadData() {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Fetch lead with related data
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select(`
          *,
          profiles!leads_assigned_agent_id_fkey(full_name, avatar_url, role),
          lead_sources(name)
        `)
        .eq('id', params.id)
        .single();

      if (leadError) throw leadError;

      if (!leadData) {
        notFound();
      }

      setLead(leadData);

      // Fetch activities for this lead
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select(`
          *,
          profiles!activities_user_id_fkey(full_name, avatar_url)
        `)
        .eq('lead_id', params.id)
        .order('created_at', { ascending: false });

      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);

      // Fetch property shares for this lead
      const { data: sharesData, error: sharesError } = await supabase
        .from('lead_property_shares')
        .select(`
          *,
          properties(title, location, price),
          profiles!lead_property_shares_shared_by_fkey(full_name)
        `)
        .eq('lead_id', params.id)
        .order('shared_at', { ascending: false });

      if (sharesError) throw sharesError;
      setPropertyShares(sharesData || []);
    } catch (err: any) {
      console.error('Error fetching lead data:', err);
      setError(err.message || 'Failed to load lead data');
    } finally {
      setLoading(false);
    }
  }

  // Helper function to format date
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="animate-spin rounded-full border-4 border-t-indigo-600 border-b-indigo-600 h-12 w-12"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4">
        <p className="font-medium">{error}</p>
      </div>
    );
  }

  if (!lead) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {lead.full_name}
        </h1>
        <div className="flex items-center space-x-3">
          <Link
            href={`/(dashboard)/leads/${lead.id}/edit`}
            className="px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-600 hover:bg-indigo-50"
          >
            Edit
          </Link>
          <Link
            href="/(dashboard)/leads"
            className="px-3 py-1 border border-transparent text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50"
          >
            Back to Leads
          </Link>
        </div>
      </div>

      {/* Lead Overview Card */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Lead Overview</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Phone</p>
              <p className="text-base font-medium text-gray-900">{lead.phone}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="text-base font-medium text-gray-900">
                {lead.email || 'Not provided'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Lead Source</p>
              <p className="text-base font-medium text-gray-900">
                {lead.lead_sources?.name || 'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Assigned Agent</p>
              <p className="text-base font-medium text-gray-900">
                {lead.profiles?.full_name || 'Unassigned'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Property Type</p>
              <p className="text-base font-medium text-gray-900">
                {lead.property_type || 'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Preferred Location</p>
              <p className="text-base font-medium text-gray-900">
                {lead.preferred_location || 'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Budget Range</p>
              <p className="text-base font-medium text-gray-900">
                {lead.budget_min !== null && lead.budget_max !== null
                  ? `$${lead.budget_min.toLocaleString()} - $${lead.budget_max.toLocaleString()}`
                  : 'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <span
                className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full
                  ${statusToColorClass(lead.status)}`}
              >
                {lead.status}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Temperature</p>
              <span
                className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full
                  ${temperatureToColorClass(lead.temperature)}`}
              >
                {lead.temperature}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Created Date</p>
              <p className="text-base font-medium text-gray-900">
                {formatDate(lead.created_at)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Last Contacted</p>
              <p className="text-base font-medium text-gray-900">
                {lead.last_contacted ? formatDate(lead.last_contacted) : 'Never'}
              </p>
            </div>
          </div>

          {lead.notes && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-500 mb-2">Notes</p>
              <p className="text-sm text-gray-700">{lead.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Activities Timeline */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Activity Timeline</h2>
        </div>
        <div className="px-6 py-4">
          {activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity: any) => (
                <div key={activity.id} className="border-l-2 border-indigo-500 pl-4">
                  <div className="flex items-start space-x-3">
                    {activity.profiles?.avatar_url ? (
                      <img
                        src={activity.profiles.avatar_url}
                        alt={`${activity.profiles.full_name} avatar`}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                        {activity.profiles?.full_name?.charAt(0) ?? '?'}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="flex items-center space-x-2 text-sm font-medium text-gray-900">
                        {activity.profiles?.full_name || 'Unknown User'}
                        <span className="text-xs text-gray-500">
                          {activity.activity_type.replace('_', ' ').toUpperCase()}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-gray-700">{activity.description}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDate(activity.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No activities recorded for this lead yet.
            </p>
          )}
        </div>
      </div>

      {/* Property Shares */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Property Shares</h2>
        </div>
        <div className="px-6 py-4">
          {propertyShares.length > 0 ? (
            <div className="space-y-4">
              {propertyShares.map((share: any) => (
                <div key={share.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    {share.profiles?.avatar_url ? (
                      <img
                        src={share.profiles.avatar_url}
                        alt={`${share.profiles.full_name} avatar`}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                        {share.profiles?.full_name?.charAt(0) ?? '?'}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Shared {share.properties.title}
                      </p>
                      <p className="mt-1 text-sm text-gray-700">
                        {share.properties.location} •
                        {share.properties.price ? `$${share.properties.price.toLocaleString()}` : 'Price not specified'}
                      </p>
                      {share.message_text && (
                        <p className="mt-2 text-sm text-gray-600 italic">
                          "{share.message_text}"
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Shared via {share.shared_via} on {formatDate(share.shared_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No properties have been shared with this lead yet.
            </p>
          )}
        </div>
      </div>

      {/* Follow-ups */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Follow-ups</h2>
        </div>
        <div className="px-6 py-4">
          {/* Follow-ups would be fetched here */}
          <p className="text-center text-gray-500 py-8">
            Follow-ups section - to be implemented
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper functions for status/temperature colors
function statusToColorClass(status: string): string {
  switch (status) {
    case 'New': return 'bg-indigo-100 text-indigo-800';
    case 'Contacted': return 'bg-blue-100 text-blue-800';
    case 'Interested': return 'bg-green-100 text-green-800';
    case 'Site Visit Scheduled': return 'bg-yellow-100 text-yellow-800';
    case 'Negotiation': return 'bg-purple-100 text-purple-800';
    case 'Won': return 'bg-emerald-100 text-emerald-800';
    case 'Lost': return 'bg-red-100 text-red-800';
    case 'Not Responding': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function temperatureToColorClass(temperature: string): string {
  switch (temperature) {
    case 'Hot': return 'bg-red-100 text-red-800';
    case 'Warm': return 'bg-yellow-100 text-yellow-800';
    case 'Cold': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}