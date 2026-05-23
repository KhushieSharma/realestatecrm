import { useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/database';
import { storageService } from '@/lib/services/storageService';

export default function NewPropertyPage() {
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

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    // Skip file inputs as they're handled separately
    if (type === 'file') return;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImageFiles(Array.from(e.target.files));
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setDocumentFiles(Array.from(e.target.files));
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveDocument = (index: number) => {
    setDocumentFiles(prev => prev.filter((_, i) => i !== index));
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

      // Get current user's profile for organization_id and owner_id
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, organization_id')
        .eq('id', supabase.auth.uid())
        .single();

      if (profileError) throw profileError;

      // First, create the property
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .insert({
          organization_id: profileData.organization_id,
          owner_id: profileData.id, // Currently logged in user as owner
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
          availability_status: formData.availability_status
        })
        .select()
        .single();

      if (propertyError) throw propertyError;

      // Upload images if any
      if (imageFiles.length > 0) {
        setUploadingImages(true);
        for (const file of imageFiles) {
          // Convert File to buffer for upload
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          const uploadResult = await storageService.uploadFile(buffer, {
            organizationId: profileData.organization_id,
            entityType: 'property_images',
            entityId: propertyData.id,
            originalName: file.name,
            mimeType: file.type,
            size: file.size
          });

          if (uploadResult.success) {
            // Save the file reference to the property_images table
            await supabase
              .from('property_images')
              .insert({
                property_id: propertyData.id,
                image_url: uploadResult.publicUrl || '',
                is_primary: imageFiles.indexOf(file) === 0, // First image is primary
                caption: `Image ${imageFiles.indexOf(file) + 1}`
              });
          } else {
            throw new Error(`Failed to upload image ${file.name}: ${uploadResult.error}`);
          }
        }
        setUploadingImages(false);
      }

      // Upload documents if any
      if (documentFiles.length > 0) {
        setUploadingDocuments(true);
        for (const file of documentFiles) {
          // Convert File to buffer for upload
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          const uploadResult = await storageService.uploadFile(buffer, {
            organizationId: profileData.organization_id,
            entityType: 'property_documents',
            entityId: propertyData.id,
            originalName: file.name,
            mimeType: file.type,
            size: file.size
          });

          if (uploadResult.success) {
            // Save the file reference to the property_documents table
            await supabase
              .from('property_documents')
              .insert({
                property_id: propertyData.id,
                document_url: uploadResult.publicUrl || '',
                name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
                document_type: file.name.split('.').pop() || 'unknown' // Get extension
              });
          } else {
            throw new Error(`Failed to upload document ${file.name}: ${uploadResult.error}`);
          }
        }
        setUploadingDocuments(false);
      }

      setSuccess('Property created successfully!');
      setFormData({
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
      setImageFiles([]);
      setDocumentFiles([]);

      // Redirect to properties list after successful creation
      setTimeout(() => {
        window.location.href = '/(dashboard)/properties';
      }, 1500);
    } catch (err: any) {
      console.error('Error creating property:', err);
      setError(err.message || 'Failed to create property');
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-gray-900">Add New Property</h1>
        <Link
          href="/(dashboard)/properties"
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-indigo-500"
        >
          Back to Properties
        </Link>
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

        {/* Property Images Upload */}
        <div className="border-t border-gray-200 pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Property Images
          </label>
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
            {imageFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Selected Images ({imageFiles.length})
                </p>
                <div className="grid gap-2">
                  {imageFiles.map((file, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded flex items-center justify-center">
                        {file.type.startsWith('image/') ? '🖼️' : '📄'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {Math.round(file.size / 1024)} KB
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveImage(index)}
                        className="text-xs text-red-600 hover:text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                {uploadingImages && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-indigo-600 h-2.5 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-indigo-600 mt-1">
                      Uploading images...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Property Documents Upload */}
          <div className="border-t border-gray-200 pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property Documents
            </label>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  multiple
                  onChange={handleDocumentChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
              {documentFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Selected Documents ({documentFiles.length})
                  </p>
                  <div className="grid gap-2">
                    {documentFiles.map((file, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded flex items-center justify-center">
                          {file.type.startsWith('image/') ? '🖼️' : '📄'}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {Math.round(file.size / 1024)} KB
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveDocument(index)}
                          className="text-xs text-red-600 hover:text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  {uploadingDocuments && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-indigo-600 h-2.5 rounded-full"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-indigo-600 mt-1">
                        Uploading documents...
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Property'}
          </button>
        </div>
      </form>
    </div>
  );
}