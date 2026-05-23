import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/database';

export default async function PropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  useEffect(() => {
    fetchProperties();
  }, [searchTerm, statusFilter, typeFilter, priceMin, priceMax]);

  async function fetchProperties() {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Start with base query
      let query = supabase
        .from('properties')
        .select(`
          *,
          profiles!properties_owner_id_fkey(full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('availability_status', statusFilter);
      }

      if (typeFilter && typeFilter !== 'all') {
        query = query.eq('property_type', typeFilter);
      }

      if (priceMin) {
        query = query.gte('price', parseFloat(priceMin));
      }

      if (priceMax) {
        query = query.lte('price', parseFloat(priceMax));
      }

      const { data, error } = await query;

      if (error) throw error;

      setProperties(data || []);
    } catch (err: any) {
      console.error('Error fetching properties:', err);
      setError(err.message || 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value);
  };

  const handlePriceMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPriceMin(e.target.value);
  };

  const handlePriceMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPriceMax(e.target.value);
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

  // TODO: Fetch filters data (status options, type options)
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'Available', label: 'Available' },
    { value: 'Hold', label: 'Hold' },
    { value: 'Sold', label: 'Sold' },
    { value: 'Rented', label: 'Rented' }
  ];

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'Apartment', label: 'Apartment' },
    { value: 'Villa', label: 'Villa' },
    { value: 'Plot', label: 'Plot' },
    { value: 'Commercial', label: 'Commercial' },
    { value: 'Rental', label: 'Rental' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
        <Link
          href="/(dashboard)/properties/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-indigo-500"
        >
          + Add Property
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={typeFilter}
            onChange={handleTypeChange}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            {typeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
          <input
            type="number"
            placeholder="Min price"
            value={priceMin}
            onChange={handlePriceMinChange}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
          <input
            type="number"
            placeholder="Max price"
            value={priceMax}
            onChange={handlePriceMaxChange}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search properties..."
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
              setTypeFilter('all');
              setPriceMin('');
              setPriceMax('');
            }}
            className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-indigo-500"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Properties Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Property
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
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
            {properties.length > 0 ? (
              properties.map((property: any) => (
                <tr key={property.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      {property.profiles?.avatar_url ? (
                        <img
                          src={property.profiles.avatar_url}
                          alt={`${property.profiles.full_name} avatar`}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          {property.profiles?.full_name?.charAt(0) ?? '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 break-words">
                        <p className="text-sm font-medium text-gray-900">{property.title}</p>
                        {property.owner_id && property.profiles ? (
                          <p className="text-xs text-gray-500">Owner: {property.profiles.full_name}</p>
                        ) : (
                          <p className="text-xs text-gray-500">No owner assigned</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <p>{property.location}</p>
                      {property.address && <p className="text-xs text-gray-500">{property.address}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <p>{property.property_type}</p>
                      {property.bedrooms !== null && property.bathrooms !== null && (
                        <p className="text-xs text-gray-500">
                          {property.bedrooms} bed | {property.bathrooms} bath
                        )
                      )}
                      {property.size && (
                        <p className="text-xs text-gray-500">
                          {property.size} sq ft
                        )
                      )}
                      {property.floor && (
                        <p className="text-xs text-gray-500">
                          Floor {property.floor}
                        )
                      )}
                      {property.furnishing_status && (
                        <p className="text-xs text-gray-500">
                          {property.furnishing_status}
                        )
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <p>${property.price?.toLocaleString()}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${statusToColorClass(property.availability_status)}`}
                    >
                      {property.availability_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/(dashboard)/properties/${property.id}`}
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
                  No properties found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Helper functions for status colors
function statusToColorClass(status: string): string {
  switch (status) {
    case 'Available': return 'bg-emerald-100 text-emerald-800';
    case 'Hold': return 'bg-yellow-100 text-yellow-800';
    case 'Sold': return 'bg-red-100 text-red-800';
    case 'Rented': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}