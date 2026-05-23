import { notFound } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/database';
import { z } from 'zod';

export default async function FollowUpEditPage({
  params,
}: {
  params: { id: string };
}) {
  const [followUp, setFollowUp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lead, setLead] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    leadId: '',
    followupType: 'call',
    subject: '',
    body: '',
    scheduledFor: '',
    isTemplate: false,
    templateName: '',
  });

  useEffect(() => {
    loadFollowUpData();
  }, [params.id]);

  const loadFollowUpData = async () => {
    try {
      const supabase = getSupabaseClient();

      // Fetch follow-up with related data
      const { data: followUpData, error: followUpError } = await supabase
        .from('followups')
        .select(`
          *,
          leads(id, full_name, phone, email),
          profiles!followups_assigned_to_fkey(id, full_name, avatar_url)
        `)
        .eq('id', params.id)
        .single();

      if (followUpError) throw followUpError;

      if (!followUpData) {
        notFound();
      }

      setFollowUp(followUpData);

      // Set form data
      setFormData({
        leadId: followUpData.lead_id,
        followupType: followUpData.followup_type,
        subject: '', // Would come from template or previous email
        body: followUpData.description || '',
        scheduledFor: followUpData.scheduled_for
          ? new Date(followUpData.scheduled_for).toISOString().slice(0, 16)
          : '',
        isTemplate: false,
        templateName: '',
      });

      // Load lead data
      if (followUpData.lead_id) {
        const { data: leadData, error: leadError } = await supabase
          .from('leads')
          .select('*')
          .eq('id', followUpData.lead_id)
          .single();

        if (!leadError && leadData) {
          setLead(leadData);
        }
      }

      // Load templates
      await loadTemplates();
    } catch (err: any) {
      console.error('Error loading follow-up data:', err);
      setError(err.message || 'Failed to load follow-up data');
    } finally {
      setLoading(false);
    }
  };

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

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (value: string) => {
    setFormData(prev => ({ ...prev, scheduledFor: value }));
  };

  const handleToggleTemplate = () => {
    setFormData(prev => ({ ...prev, isTemplate: !prev.isTemplate }));
  };

  const handleSelectTemplate = (template: any) => {
    setFormData(prev => ({
      ...prev,
      followupType: template.followup_type,
      subject: template.subject || '',
      body: template.body,
      templateName: template.name,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = getSupabaseClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      const organizationId = profile.organization_id;

      // Verify follow-up belongs to organization
      const { data: followUpCheck, error: followUpCheckError } = await supabase
        .from('followups')
        .select('id')
        .eq('id', params.id)
        .eq('organization_id', organizationId)
        .single();

      if (followUpCheckError || !followUpCheck) {
        setError('Follow-up not found or access denied');
        setLoading(false);
        return;
      }

      // If saving as template, update organization settings
      if (formData.isTemplate && formData.templateName) {
        // Get current organization settings
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('settings')
          .eq('id', organizationId)
          .single();

        if (orgError) throw orgError;

        const settings = orgData.settings || {};
        const templates = settings.followup_templates || [];

        // Check if template with same name already exists (excluding current if updating)
        const existingIndex = templates.findIndex(
          (t: any) => t.name === formData.templateName && t.id !== followUp.id
        );

        const newTemplate = {
          id: followUp.id, // Use existing ID if updating template
          name: formData.templateName,
          followupType: formData.followupType,
          subject: formData.subject,
          body: formData.body,
        };

        if (existingIndex >= 0) {
          templates[existingIndex] = newTemplate;
        } else {
          templates.push(newTemplate);
        }

        // Update organization settings
        const { error: settingsError } = await supabase
          .from('organizations')
          .update({
            settings: {
              ...settings,
              followup_templates: templates,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', organizationId);

        if (settingsError) throw settingsError;
      }

      // Update follow-up
      const { data: updatedFollowUp, error: updateError } = await supabase
        .from('followups')
        .update({
          lead_id: formData.leadId,
          followup_type: formData.followupType,
          description: formData.body,
          title: formData.templateName || `Follow-up: ${formData.followupType}`,
          scheduled_for: formData.scheduledFor ? new Date(formData.scheduledFor).toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Create activity log for update
      await supabase
        .from('activities')
        .insert({
          lead_id: formData.leadId,
          organization_id: organizationId,
          user_id: user.id,
          activity_type: 'followup',
          description: `Follow-up updated`,
          metadata: {
            followUpId: params.id,
            changes: formData,
          },
        });

      setLoading(false);
      setSuccess('Follow-up updated successfully!');

      // Redirect to follow-ups page after a short delay
      setTimeout(() => {
        window.location.href = '/(dashboard)/followups';
      }, 1500);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Failed to update follow-up');
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
          Edit Follow-up
        </h1>
        <div className="flex items-center space-x-3">
          <Link
            href={`/(dashboard)/followups/${followUp.id}`}
            className="px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-600 hover:bg-indigo-50"
          >
            Cancel
          </Link>
          <Link
            href="/(dashboard)/followups"
            className="px-3 py-1 border border-transparent text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50"
          >
            Back to Follow-ups
          </Link>
        </div>
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
        {/* Lead Selection (disabled in edit mode) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lead
          </label>
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
              {lead?.full_name?.charAt(0) ?? '?'}
            </div>
            <div className="flex-1 min-w-0 break-words">
              <p className="text-sm font-medium text-gray-900">{lead?.full_name}</p>
              <p className="text-xs text-gray-500">{lead?.phone}</p>
            </div>
          </div>
          <input
            type="hidden"
            name="leadId"
            value={formData.leadId}
          />
        </div>

        {/* Follow-up Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Follow-up Type
          </label>
          <select
            value={formData.followupType}
            onChange={(e) => handleChange('followupType', e.target.value)}
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
        {formData.followupType === 'email' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject (Email only)
            </label>
            <input
              type="text"
              placeholder="Email subject"
              value={formData.subject}
              onChange={(e) => handleChange('subject', e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        )}

        {/* Message Body */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message Body
          </label>
          <textarea
            placeholder="Enter your message..."
            rows={4}
            value={formData.body}
            onChange={(e) => handleChange('body', e.target.value)}
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
            value={formData.scheduledFor}
            onChange={(e) => handleDateChange(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Template Options */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isTemplate"
                checked={formData.isTemplate}
                onChange={(e) => handleToggleTemplate()}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="isTemplate" className="text-sm font-medium text-gray-700">
                Save as template
              </label>
            </div>
            {formData.isTemplate && (
              <button
                type="button"
                onClick={() => {
                  // In a real app, you'd open a template selector modal
                  alert('Template selector would open here');
                }}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                Choose from existing templates
              </button>
            )}
          </div>

          {formData.isTemplate && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name
              </label>
              <input
                type="text"
                placeholder="Enter template name..."
                value={formData.templateName}
                onChange={(e) => handleChange('templateName', e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          )}
        </div>

        {/* Available Templates */}
        {!formData.isTemplate && templates.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-medium text-gray-900">Templates</h2>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isTemplate: true }))}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                Save Current as Template
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
          </>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-indigo-500"
          >
            {loading ? 'Updating...' : 'Update Follow-up'}
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this follow-up?')) {
                // In a real app, you'd call the delete action
                alert('Delete functionality would go here');
              }
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-red-500"
          >
            Delete
          </button>
        </div>
      </form>
    </div>
  );
}