import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewLeadPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    propertyType: '',
    budgetMin: '',
    budgetMax: '',
    preferredLocation: '',
    source: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: [],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setLoading(true);

    try {
      const form = new FormData();
      form.append('fullName', formData.fullName);
      form.append('phone', formData.phone);
      form.append('email', formData.email);
      form.append('propertyType', formData.propertyType);
      form.append('budgetMin', formData.budgetMin);
      form.append('budgetMax', formData.budgetMax);
      form.append('preferredLocation', formData.preferredLocation);
      form.append('source', formData.source);
      form.append('notes', formData.notes);

      // Call the server action
      const result = await createLead(formData);

      if (result.errors) {
        setErrors(result.errors);
      } else if (result.error) {
        setSubmitError(result.error);
      } else {
        // Success - redirect to leads list
        router.push('/(dashboard)/leads');
      }
    } catch (error: any) {
      setSubmitError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Property type options
  const propertyTypes = [
    { value: '', label: 'Select Property Type' },
    { value: 'Apartment', label: 'Apartment' },
    { value: 'Villa', label: 'Villa' },
    { value: 'Plot', label: 'Plot' },
    { value: 'Commercial', label: 'Commercial' },
    { value: 'Rental', label: 'Rental' }
  ];

  // Lead source options (would ideally come from database)
  const leadSources = [
    { value: '', label: 'Select Lead Source' },
    { value: '36 Acre', label: '36 Acre' },
    { value: 'MagicBricks', label: 'MagicBricks' },
    { value: 'Housing.com', label: 'Housing.com' },
    { value: 'Facebook Ads', label: 'Facebook Ads' },
    { value: 'Instagram Ads', label: 'Instagram Ads' },
    { value: 'Website Forms', label: 'Website Forms' },
    { value: 'Referral', label: 'Referral' },
    { value: 'Manual Entry', label: 'Manual Entry' },
    { value: 'Other', label: 'Other' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Add New Lead</h1>
            <p className="mt-1 text-sm text-gray-600">
              Enter the lead's information to add them to your CRM
            </p>
          </div>

          <form className="px-6 py-6 space-y-6" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="space-y-2">
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={formData.fullName}
                onChange={handleChange}
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors.fullName[0]}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={formData.phone}
                onChange={handleChange}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone[0]}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email[0]}</p>
              )}
            </div>

            {/* Property Type */}
            <div className="space-y-2">
              <label htmlFor="propertyType" className="block text-sm font-medium text-gray-700">
                Property Type
              </label>
              <select
                id="propertyType"
                name="propertyType"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={formData.propertyType}
                onChange={handleChange}
              >
                {propertyTypes.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Budget Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="budgetMin" className="block text-sm font-medium text-gray-700">
                  Minimum Budget
                </label>
                <input
                  id="budgetMin"
                  name="budgetMin"
                  type="number"
                  min="0"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={formData.budgetMin}
                  onChange={handleChange}
                />
                {errors.budgetMin && (
                  <p className="mt-1 text-sm text-red-600">{errors.budgetMin[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="budgetMax" className="block text-sm font-medium text-gray-700">
                  Maximum Budget
                </label>
                <input
                  id="budgetMax"
                  name="budgetMax"
                  type="number"
                  min="0"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={formData.budgetMax}
                  onChange={handleChange}
                />
                {errors.budgetMax && (
                  <p className="mt-1 text-sm text-red-600">{errors.budgetMax[0]}</p>
                )}
              </div>
            </div>

            {/* Preferred Location */}
            <div className="space-y-2">
              <label htmlFor="preferredLocation" className="block text-sm font-medium text-gray-700">
                Preferred Location
              </label>
              <input
                id="preferredLocation"
                name="preferredLocation"
                type="text"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={formData.preferredLocation}
                onChange={handleChange}
              />
              {errors.preferredLocation && (
                <p className="mt-1 text-sm text-red-600">{errors.preferredLocation[0]}</p>
              )}
            </div>

            {/* Lead Source */}
            <div className="space-y-2">
              <label htmlFor="source" className="block text-sm font-medium text-gray-700">
                Lead Source
              </label>
              <select
                id="source"
                name="source"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={formData.source}
                onChange={handleChange}
              >
                {leadSources.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows="4"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={formData.notes}
                onChange={handleChange}
              />
              {errors.notes && (
                <p className="mt-1 text-sm text-red-600">{errors.notes[0]}</p>
              )}
            </div>

            {submitError && (
              <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 mb-4" role="alert">
                <p className="font-medium">{submitError}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <a
                  href="/(dashboard)/leads"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-indigo-500"
              >
                {loading ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full"></span>
                    Adding Lead...
                  </>
                ) : (
                  'Add Lead'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}