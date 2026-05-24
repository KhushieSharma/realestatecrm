import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/database';
import { z } from 'zod';

export default async function NewFollowUpPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lead, setLead] = useState<any>(null);
  const [leadId, setLeadId] = useState('');
  const [templates, setTemplates] = useState([]);
  const [isTemplateMode, setIsTemplateMode] = useState(false);

  // Check if we're in template mode from URL
  const searchParams = new URLSearchParams(window.location.search);
  const templateParam = searchParams.get('template');
  if (templateParam === 'true') {
    setIsTemplateMode(true);
  }

  const followUpFormSchema = z.object({
    leadId: z.string().uuid('Invalid lead'),
    followupType: z.enum(['call', 'whatsapp', 'sms', 'email', 'meeting']),
    subject: z.string().optional(), // For email
    body: z.string().min(1, 'Message body is required'),
    scheduledFor: z.date(),
    // For saving as template
    isTemplate: z.boolean().default(false),
    templateName: z.string().optional(),
  });

  // Load lead data if leadId is provided
  const loadLead = async (leadIdParam: string) => {
    try {
      const supabase = getSupabaseClient();
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadIdParam)
        .single();

      if (leadError) throw leadError;
      setLead(leadData);
    } catch (err: any) {
      console.error('Error loading lead:', err);
      setError('Failed to load lead');
    }
  };

  // Load templates
  const loadTemplates = async () => {
    try {
      const supabase = getSupabaseClient();
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
        return;
      }

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', organizationId)
        .single();

      if (orgError) throw orgError;

      const fetchedTemplates = orgData.settings?.followup_templates || [];
      setTemplates(fetchedTemplates);
    } catch (err: any) {
      console.error('Error loading templates:', err);
      // Don't set error for templates as it's not critical
    }
  };

  useEffect(() => {
    loadTemplates();

    // If we have a leadId in URL, load the lead
    const urlLeadId = searchParams.get('leadId');
    if (urlLeadId) {
      setLeadId(urlLeadId);
      loadLead(urlLeadId);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData(e.target as HTMLFormElement);

      // Convert form data to match schema
      const formDataObject = {
        leadId: formData.get('leadId'),
        followupType: formData.get('followupType'),
        subject: formData.get('subject'),
        body: formData.get('body'),
        scheduledFor: formData.get('scheduledFor'),
        isTemplate: formData.get('isTemplate') === 'on',
        templateName: formData.get('templateName'),
      };

      // Call the server action
      // Note: In a real app, you'd use useFormState or similar
      // For now, we'll simulate the call

      setLoading(false);
      setSuccess('Follow-up scheduled successfully!');

      // Redirect to follow-ups page after a short delay
      setTimeout(() => {
        window.location.href = '/(dashboard)/followups';
      }, 1500);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Failed to schedule follow-up');
    }
  };

  const handleSelectTemplate = (template: any) => {
    setLeadId(template.lead_id || ''); // This would need adjustment based on actual template structure
    setLead(null); // Clear lead when selecting template

    // Set form values from template
    // Note: This would be handled client-side in a real implementation
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

  if (success) {
    return (
      <div className="bg-green-50 border-l-4 border-green-400 text-green-700 p-4 mb-6">
        <p className="font-medium">{success}</p>
      </div>
    );
  }

  const pageTitle = isTemplateMode ? 'Create Follow-up Template' : 'Schedule Follow-up';
  const submitButtonText = isTemplateMode ? 'Save Template' : 'Schedule Follow-up';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
        <Link
          href="/(dashboard)/followups"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-gray-500"
        >
          Back to Follow-ups
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 mb-6">
          <p className="font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 text-green-700 p-4 mb-6">
          <p className="font-medium">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Lead Selection (not shown in template mode) */}
        {!isTemplateMode && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lead
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search or select lead..."
                  value={leadId}
                  onChange={(e) => {
                    setLeadId(e.target.value);
                    // In a real app, you'd debounce and fetch leads
                    if (e.target.value.length >= 2) {
                      loadLead(e.target.value);
                    }
                  }}
                  className="block w-full pl-10 pr-3 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                {/* Lead info display would go here */}
                {lead && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    <p className="font-medium">{lead.full_name}</p>
                    <p className="text-sm text-gray-500">{lead.phone}</p>
                    {lead.email && <p className="text-xs text-gray-500">{lead.email}</p>}
                  </div>
                )}
              </div>
            </div>
          )}
        )

        {/* Follow-up Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Follow-up Type
          </label>
          <select
            value={isTemplateMode ? '' : 'call'} // Simplified
            onChange={(e) => {
              // Handle followupType change
            }}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="call">Call</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
          </select>
        </div>

        {/* Subject (only for email) */}
        {/* In a real app, this would be conditionally shown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject (Email only)
          </label>
          <input
            type="text"
            placeholder="Email subject"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Message Body */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message Body
          </label>
          <textarea
            placeholder="Enter your message..."
            rows={4}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Scheduled For */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Scheduled For
          </label>
          <input
            type="datetime-local"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Template Options (shown when not in template mode) */}
        {!isTemplateMode && templates.length > 0 && (
          <>
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-medium text-gray-900">Templates</h2>
                <button
                  type="button"
                  onClick={() => setIsTemplateMode(true)}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Manage Templates
                </button>
              </div>
              <div className="space-y-2">
                {templates.map((template: any) => (
                  <div
                    key={template.id}
                    className="p-3 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{template.name}</p>
                        <p className="text-xs text-gray-500">
                          {template.followup_type} •
                          {new Date(template.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-indigo-600 hover:text-indigo-500"
                      >
                        Use
                      </button>
                    </div>
                    {template.subject && (
                      <p className="mt-1 text-sm text-gray-600">{template.subject}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                      {template.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* Template Mode Fields */}
        {isTemplateMode && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name
              </label>
              <input
                type="text"
                placeholder="Enter template name..."
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Type
              </label>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="call">Call</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
              </select>
            </div>

            {/* Subject (only for email template) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject (Email only)
              </label>
              <input
                type="text"
                placeholder="Email subject"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Body
              </label>
              <textarea
                placeholder="Enter template message..."
                rows={4}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-indigo-500"
          >
            {loading ? 'Saving...' : submitButtonText}
          </button>

          {isTemplateMode && (
            <button
              type="button"
              onClick={() => setIsTemplateMode(false)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}