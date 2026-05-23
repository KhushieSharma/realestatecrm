import { notFound } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/database';

export default async function FollowUpDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [followUp, setFollowUp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFollowUpData();
  }, [params.id]);

  async function fetchFollowUpData() {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Fetch follow-up with related data
      const { data: followUpData, error: followUpError } = await supabase
        .from('followups')
        .select(`
          *,
          leads(full_name, phone, email),
          profiles!followups_assigned_to_fkey(full_name, avatar_url)
        `)
        .eq('id', params.id)
        .single();

      if (followUpError) throw followUpError;

      if (!followUpData) {
        notFound();
      }

      setFollowUp(followUpData);
    } catch (err: any) {
      console.error('Error fetching follow-up data:', err);
      setError(err.message || 'Failed to load follow-up data');
    } finally {
      setLoading(false);
    }
  }

  // Helper function to format date
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  if (!followUp) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {followUp.title}
        </h1>
        <div className="flex items-center space-x-3">
          <Link
            href={`/(dashboard)/followups/${followUp.id}/edit`}
            className="px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-600 hover:bg-indigo-50"
          >
            Edit
          </Link>
          <Link
            href="/(dashboard)/followups"
            className="px-3 py-1 border border-transparent text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50"
          >
            Back to Follow-ups
          </Link>
        </div>
      </div>

      {/* Follow-up Overview Card */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Follow-up Overview</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Lead</p>
              <p className="text-base font-medium text-gray-900">
                {followUp.leads?.full_name || 'Unknown Lead'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Assigned To</p>
              <p className="text-base font-medium text-gray-900">
                {followUp.profiles?.full_name || 'Unassigned'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Type</p>
              <span
                className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full
                  ${followupTypeToColorClass(followUp.followup_type)}`}
              >
                {followUp.followup_type}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <span
                className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full
                  ${followUpStatusToColorClass(followUp.status)}`}
              >
                {followUp.status}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Scheduled For</p>
              <p className="text-base font-medium text-gray-900">
                {formatDate(followUp.scheduled_for)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Created At</p>
              <p className="text-base font-medium text-gray-900">
                {formatDate(followUp.created_at)}
              </p>
            </div>
            {followUp.completed_at && (
              <div>
                <p className="text-sm font-medium text-gray-500">Completed At</p>
                <p className="text-base font-medium text-gray-900">
                  {formatDate(followUp.completed_at)}
                </p>
              </div>
            )}
          </div>

          {followUp.description && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-500 mb-2">Description</p>
              <p className="text-sm text-gray-700">{followUp.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions Section */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Actions</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0">
            {/* Mark as Complete Button */}
            {followUp.status !== 'completed' && (
              <button
                onClick={() => {
                  // In a real app, you'd call an update action
                  alert('Mark as complete functionality would go here');
                }}
                className="w-full sm:w-auto inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-green-500"
              >
                Mark as Complete
              </button>
            )}

            {/* Snooze Button */}
            {followUp.status === 'pending' && (
              <button
                onClick={() => {
                  // In a real app, you'd call an update action
                  alert('Snooze functionality would go here');
                }}
                className="w-full sm:w-auto inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-yellow-500"
              >
                Snooze
              </button>
            )}

            {/* Cancel Button */}
            {followUp.status !== 'cancelled' && followUp.status !== 'completed' && (
              <button
                onClick={() => {
                  // In a real app, you'd call an update action
                  if (window.confirm('Are you sure you want to cancel this follow-up?')) {
                    alert('Cancel functionality would go here');
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-red-500"
              >
                Cancel
              </button>
            )}

            {/* Send Message Button (for messaging follow-ups) */}
            {(followUp.followup_type === 'whatsapp' || followUp.followup_type === 'sms' || followUp.followup_type === 'email') && (
              <button
                onClick={() => {
                  // In a real app, you'd open a messaging interface
                  alert('Send message functionality would go here');
                }}
                className="w-full sm:w-auto inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-indigo-500"
              >
                Send {followUp.followup_type === 'email' ? 'Email' : followUp.followup_type.toUpperCase()}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}

// Helper functions for status colors
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