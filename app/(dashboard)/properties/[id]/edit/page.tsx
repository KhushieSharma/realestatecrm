import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/database';

export default async function EditPropertyPage({ params }: { params: { id: string } }) {
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    address: '',
    property_type: 'Apartment',
    price: '',
    size: '',
    bedrooms: '',
    bathrooms: '',
    floor: '',
    furnishing_status: 'Unfurnished',
    description: '',
    amenities: [],
    availability_status: 'Available'
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState('');

  useEffect(() => {
    fetchPropertyData();
  }, [params.id]);

  async function fetchPropertyData() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = getSupabaseClient();

      // Fetch property details
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', params.id)
        .single();

      if (propertyError) throw propertyError;

      // Check if user has permission to edit this property
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, organization_id')
        .eq('id', supabase.auth.uid())
        .single();

      if (profileError) throw profileError;

      // Check if user is admin or owner of the property
      const isAdmin = profileData.role === 'admin';
      const isOwner = propertyData.owner_id === profileData.id;
      const sameOrg = propertyData.organization_id === profileData.organization_id;

      if (!(isAdmin || (isOwner && sameOrg))) {
        throw new Error('You do not have permission to edit this property');
      }

      setPropertyId(params.id);
      setFormData({
        title: propertyData.title,
        location: propertyData.location,
        address: propertyData.address,
        property_type: propertyData.property_type,
        price: propertyData.price?.toString() || '',
        size: propertyData.size?.toString() || '',
        bedrooms: propertyData.bedrooms?.toString() || '',
        bathrooms: propertyData.bathrooms?.toString() || '',
        floor: propertyData.floor?.toString() || '',
        furnishing_status: propertyData.furnishing_status,
        description: propertyData.description,
        amenities: propertyData.amenities || [],
        availability_status: propertyData.availability_status
      });
    } catch (err: any) {
      console.error('Error fetching property data:', err);
      setError(err.message || 'Failed to load property data');
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAmenitiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    if (checked) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, value]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        amenities: prev.amenities.filter(amenity => amenity !== value)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('properties')
        .update({
          title: formData.title,
          location: formData.location,
          address: formData.address,
          property_type: formData.property_type,
          price: formData.price ? parseFloat(formData.price) : null,
          size: formData.size ? parseFloat(formData.size) : null,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
          floor: formData.floor ? parseInt(formData.floor) : null,
          furnishing_status: formData.furnishing_status,
          description: formData.description,
          amenities: formData.amenities,
          availability_status: formData.availability_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', propertyId)
        .select();

      if (error) throw error;

      setSuccess('Property updated successfully!');

      // Redirect to property details after successful update
      setTimeout(() => {
        window.location.href = `/(dashboard)/properties/${propertyId}`;
      }, 1500);
    } catch (err: any) {
      console.error('Error updating property:', err);
      setError(err.message || 'Failed to update property');
    } finally {
      setLoading(false);
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

  if (!propertyId) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 mb-6">
        <p className="font-medium">Property not found or access denied</p>
      </div>
    );
  }

  const amenityOptions = [
    'Parking',
    'Gym',
    'Pool',
    'Security',
    'Garden',
    'Club House',
    'Elevator',
    'Power Backup',
    'Water Supply',
    'Fire Safety',
    'Internet',
    'AC',
    'Vaastu Compliant'
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Edit Property</h1>
        <div className="flex space-x-3">
          <Link
            href="/(dashboard)/properties"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-indigo-500"
          >
            Back to Properties
          </Link>
          <Link
            href={`/(dashboard)/properties/${propertyId}`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-indigo-500"
          >
            View Property
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 mb-4">
          <p className="font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 text-green-700 p-4 mb-4">
          <p className="font-medium">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
            <select
              name="property_type"
              value={formData.property_type}
              onChange={handleChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="Apartment">Apartment</option>
              <option value="Villa">Villa</option>
              <option value="Plot">Plot</option>
              <option value="Commercial">Commercial</option>
              <option value="Rental">Rental</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="Enter price"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Size (sq ft)</label>
            <input
              type="number"
              name="size"
              value={formData.size}
              onChange={handleChange}
              placeholder="Enter size"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
            <input
              type="number"
              name="bedrooms"
              value={formData.bedrooms}
              onChange={handleChange}
              placeholder="Number of bedrooms"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
            <input
              type="number"
              name="bathrooms"
              value={formData.bathrooms}
              onChange={handleChange}
              placeholder="Number of bathrooms"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
            <input
              type="number"
              name="floor"
              value={formData.floor}
              onChange={handleChange}
              placeholder="Floor number"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Furnishing Status</label>
            <select
              name="furnishing_status"
              value={formData.furnishing_status}
              onChange={handleChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="Furnished">Furnished</option>
              <option value="Semi-Furnished">Semi-Furnished</option>
              <option value="Unfurnished">Unfurnished</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Availability Status</label>
            <select
              name="availability_status"
              value={formData.availability_status}
              onChange={handleChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="Available">Available</option>
              <option value="Hold">Hold</option>
              <option value="Sold">Sold</option>
              <option value="Rented">Rented</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows={3}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amenities</label>
          <div className="flex flex-wrap gap-2">
            {amenityOptions.map(amenity => (
              <label key={amenity} className="flex items-center text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  value={amenity}
                  checked={formData.amenities.includes(amenity)}
                  onChange={handleAmenitiesChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2">{amenity}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Property'}
          </button>
        </div>
      </form>
    </div>
  );
}