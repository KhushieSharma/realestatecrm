import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/database';

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const [property, setProperty] = useState<any>(null);
  const [images, setImages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPropertyData();
  }, [params.id]);

  async function fetchPropertyData() {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Fetch property details
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select(`
          *,
          profiles!properties_owner_id_fkey(full_name, avatar_url)
        `)
        .eq('id', params.id)
        .single();

      if (propertyError) throw propertyError;

      // Fetch property images
      const { data: imagesData, error: imagesError } = await supabase
        .from('property_images')
        .select('*')
        .eq('property_id', params.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (imagesError) throw imagesError;

      // Fetch property documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('property_documents')
        .select('*')
        .eq('property_id', params.id)
        .order('created_at', { ascending: false });

      if (documentsError) throw documentsError;

      setProperty(propertyData);
      setImages(imagesData || []);
      setDocuments(documentsData || []);
    } catch (err: any) {
      console.error('Error fetching property data:', err);
      setError(err.message || 'Failed to load property data');
    } finally {
      setLoading(false);
    }
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
      <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 mb-6">
        <p className="font-medium">{error}</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 mb-6">
        <p className="font-medium">Property not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{property.title}</h1>
        <div className="flex space-x-3">
          <Link
            href="/(dashboard)/properties"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-indigo-500"
          >
            Back to Properties
          </Link>
          <Link
            href={`/(dashboard)/properties/${property.id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-indigo-500"
          >
            Edit Property
          </Link>
        </div>
      </div>

      {/* Property Overview */}
      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        {/* Property Images */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Property Images</h2>
          {images.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {images.map((image: any) => (
                <div key={image.id} className="relative group">
                  <img
                    src={image.image_url}
                    alt={`${property.title} image`}
                    className="w-full h-48 object-cover rounded border border-gray-200 hover:border-indigo-500 transition-colors"
                  />
                  {image.is_primary && (
                    <div className="absolute top-2 left-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded">
                      Primary
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-center px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {image.caption || 'Property Image'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No images available for this property.
            </div>
          )}
        </div>

        {/* Property Details */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Property Details</h2>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                🏠
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Property Type</p>
                <p className="text-xs text-gray-500">{property.property_type}</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                📍
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Location</p>
                <p className="text-xs text-gray-500">{property.location}</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                📏
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Size</p>
                <p className="text-xs text-gray-500">{property.size ? `${property.size} sq ft` : 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                🛏️
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Bedrooms</p>
                <p className="text-xs text-gray-500">{property.bedrooms !== null ? property.bedrooms : 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                🛁
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Bathrooms</p>
                <p className="text-xs text-gray-500">{property.bathrooms !== null ? property.bathrooms : 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                🏢
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Floor</p>
                <p className="text-xs text-gray-500">{property.floor !== null ? property.floor : 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                🪑
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Furnishing</p>
                <p className="text-xs text-gray-500">{property.furnishing_status}</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                💰
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Price</p>
                <p className="text-xs text-gray-500">${property.price?.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                📊
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Availability</p>
                <p className="text-xs text-gray-500">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${statusToColorClass(property.availability_status)}`}
                  >
                    {property.availability_status}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {property.description && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700">{property.description}</p>
            </div>
          )}

          {property.amenities && property.amenities.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {property.amenities.map((amenity: string) => (
                  <span key={amenity} className="bg-indigo-50 text-indigo-800 text-xs font-medium px-3 py-1 rounded-full">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Owner Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Owner Information</h2>
        <div className="flex items-center space-x-4">
          {property.profiles?.avatar_url ? (
            <img
              src={property.profiles.avatar_url}
              alt={`${property.profiles.full_name} avatar`}
              className="h-12 w-12 rounded-full"
            />
          ) : (
            <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center">
              {property.profiles?.full_name?.charAt(0) ?? '?'}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-900">{property.profiles?.full_name}</p>
            <p className="text-xs text-gray-500">Property Owner</p>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Property Documents</h2>
        {documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-indigo-500 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 text-indigo-800 rounded-full flex items-center justify-center text-sm">
                    📄
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.name || 'Document'}</p>
                    <p className="text-xs text-gray-500">{doc.document_type || 'Other'}</p>
                  </div>
                </div>
                <a
                  href={doc.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                >
                  View Document
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No documents available for this property.
          </div>
        )}
      </div>

      {/* Share Property with Leads */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Share Property with Leads</h2>
        <SharePropertyForm propertyId={property.id} />
      </div>
    </div>
  );
}

// Helper function for status colors
function statusToColorClass(status: string): string {
  switch (status) {
    case 'Available': return 'bg-emerald-100 text-emerald-800';
    case 'Hold': return 'bg-yellow-100 text-yellow-800';
    case 'Sold': return 'bg-red-100 text-red-800';
    case 'Rented': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

// Share Property Form Component
function SharePropertyForm({ propertyId }: { propertyId: string }) {
  const [formData, setFormData] = useState({
    leadId: '',
    message: '',
    shareVia: 'whatsapp'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    fetchLeadsForSharing();
  }, []);

  async function fetchLeadsForSharing() {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('leads')
        .select('id, full_name')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setLeads(data || []);
    } catch (err: any) {
      console.error('Error fetching leads for sharing:', err);
      // Don't set error state here as it might be a permission issue
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = getSupabaseClient();

      // Get current user ID
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', supabase.auth.uid())
        .single();

      if (userError) throw userError;

      const { data, error } = await supabase
        .from('lead_property_shares')
        .insert({
          lead_id: formData.leadId,
          property_id: propertyId,
          shared_by: userData.id,
          shared_via: formData.shareVia,
          message_text: formData.message
        })
        .select();

      if (error) throw error;

      setSuccess('Property shared successfully!');
      setFormData({
        leadId: '',
        message: '',
        shareVia: 'whatsapp'
      });

      // Create activity record
      await supabase
        .from('activities')
        .insert({
          lead_id: formData.leadId,
          user_id: userData.id,
          activity_type: 'property_share',
          description: `Shared property via ${formData.shareVia}`,
          metadata: {
            property_id: propertyId,
            share_method: formData.shareVia
          }
        });

      // Reset form after delay
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error sharing property:', err);
      setError(err.message || 'Failed to share property');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full border-4 border-t-indigo-600 border-b-indigo-600 h-8 w-8"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4">
          <p className="font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 text-green-700 p-4">
          <p className="font-medium">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Lead</label>
          <select
            value={formData.leadId}
            onChange={handleChange}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">Select a lead to share with</option>
            {leads.map((lead: any) => (
              <option key={lead.id} value={lead.id}>
                {lead.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Share Via</label>
            <select
              value={formData.shareVia}
              onChange={handleChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message (Optional)</label>
          <textarea
            value={formData.message}
            onChange={handleChange}
            rows={3}
            placeholder="Add a personal message..."
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={loading || !formData.leadId}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Sharing...' : 'Share Property'}
          </button>
        </div>
      </form>
    </div>
  );
}