import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/database';

export default async function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [temperatureFilter, setTemperatureFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  useEffect(() => {
    fetchLeads();
  }, [searchTerm, statusFilter, temperatureFilter, sourceFilter]);

  async function fetchLeads() {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Start with base query
      let query = supabase
        .from('leads')
        .select(`
          *,
          profiles!leads_assigned_agent_id_fkey(full_name, avatar_url),
          lead_sources(name)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (temperatureFilter && temperatureFilter !== 'all') {
        query = query.eq('temperature', temperatureFilter);
      }

      if (sourceFilter && sourceFilter !== 'all') {
        query = query.eq('source_id', sourceFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLeads(data || []);
    } catch (err: any) {
      console.error('Error fetching leads:', err);
      setError(err.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  const handleTemperatureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTemperatureFilter(e.target.value);
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSourceFilter(e.target.value);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
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

  // TODO: Fetch filters data (status options, temperature options, sources)
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'New', label: 'New' },
    { value: 'Contacted', label: 'Contacted' },
    { value: 'Interested', label: 'Interested' },
    { value: 'Site Visit Scheduled', label: 'Site Visit Scheduled' },
    { value: 'Negotiation', label: 'Negotiation' },
    { value: 'Won', label: 'Won' },
    { value: 'Lost', label: 'Lost' },
    { value: 'Not Responding', label: 'Not Responding' }
  ];

  const temperatureOptions = [
    { value: 'all', label: 'All Temperatures' },
    { value: 'Cold', label: 'Cold' },
    { value: 'Warm', label: 'Warm' },
    { value: 'Hot', label: 'Hot' }
  ];

  const sourceOptions = [
    { value: 'all', label: 'All Sources' },
    // These would normally come from database
    { value: '36acre', label: '36 Acre' },
    { value: 'magicbricks', label: 'MagicBricks' },
    { value: 'housing', label: 'Housing.com' },
    { value: 'facebook', label: 'Facebook Ads' },
    { value: 'instagram', label: 'Instagram Ads' },
    { value: 'website', label: 'Website Forms' },
    { value: 'referral', label: 'Referral' },
    { value: 'manual', label: 'Manual Entry' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <Link
          href="/(dashboard)/leads/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-indigo-500"
        >
          + Add Lead
        </Link>
      </div>

      {/* Filters */}
      <div className="grid gap-4 md:grid-cols-[200px_200px_200px_200px_1fr]">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={handleStatusChange}
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
          <select
            value={temperatureFilter}
            onChange={handleTemperatureChange}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            {temperatureOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
          <select
            value={sourceFilter}
            onChange={handleSourceChange}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            {sourceOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="block w-full pl-10 pr-3 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="md:col-span-2 flex md:justify-end">
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setTemperatureFilter('all');
              setSourceFilter('all');
            }}
            className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-indigo-500"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lead
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact Info
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Property Interest
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Temperature
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.length > 0 ? (
              leads.map((lead: any) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      {lead.profiles?.avatar_url ? (
                        <img
                          src={lead.profiles.avatar_url}
                          alt={`${lead.profiles.full_name} avatar`}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          {lead.profiles?.full_name?.charAt(0) ?? '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 break-words">
                        <p className="text-sm font-medium text-gray-900">{lead.full_name}</p>
                        {lead.assigned_agent_id && lead.profiles ? (
                          <p className="text-xs text-gray-500">Assigned to: {lead.profiles.full_name}</p>
                        ) : (
                          <p className="text-xs text-gray-500">Unassigned</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <p>{lead.phone}</p>
                      {lead.email && <p className="text-xs text-gray-500">{lead.email}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {lead.property_type && <p>{lead.property_type}</p>}
                      {lead.preferred_location && <p className="text-xs text-gray-500">{lead.preferred_location}</p>}
                      {lead.budget_min !== null && lead.budget_max !== null && (
                        <p className="text-xs text-gray-500">
                          Budget: ${lead.budget_min.toLocaleString()} - ${lead.budget_max.toLocaleString()}
                        )
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${statusToColorClass(lead.status)}`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${temperatureToColorClass(lead.temperature)}`}
                    >
                      {lead.temperature}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/(dashboard)/leads/${lead.id}`}
                      className="text-indigo-600 hover:text-indigo-500"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-6 py-4 text-center text-gray-500" colSpan="6">
                  No leads found matching your filters.
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