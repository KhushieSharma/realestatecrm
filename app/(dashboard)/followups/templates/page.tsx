import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/database';

export default async function FollowUpTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    followupType: 'call',
    subject: '',
    body: '',
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Get current user and organization
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
        setLoading(false);
        return;
      }

      // Fetch templates from organization settings
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
      setError(err.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setTemplateForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateTemplate = async () => {
    try {
      const supabase = getSupabaseClient();

      // Get current user and organization
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

      // Get current organization settings
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', organizationId)
        .single();

      if (orgError) throw orgError;

      const settings = orgData.settings || {};
      const existingTemplates = settings.followup_templates || [];

      // Check if template with same name already exists
      const existingIndex = existingTemplates.findIndex((t: any) => t.name === templateForm.name);

      const newTemplate = {
        id: crypto.randomUUID(),
        name: templateForm.name,
        followupType: templateForm.followupType,
        subject: templateForm.subject,
        body: templateForm.body,
      };

      let updatedTemplates = [...existingTemplates];
      if (existingIndex >= 0) {
        updatedTemplates[existingIndex] = newTemplate;
      } else {
        updatedTemplates.push(newTemplate);
      }

      // Update organization settings
      const { error: settingsError } = await supabase
        .from('organizations')
        .update({
          settings: {
            ...settings,
            followup_templates: updatedTemplates,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId);

      if (settingsError) throw settingsError;

      // Reset form and close modal
      setTemplateForm({
        name: '',
        followupType: 'call',
        subject: '',
        body: '',
      });
      setShowCreateModal(false);

      // Reload templates
      await loadTemplates();
    } catch (err: any) {
      console.error('Error creating template:', err);
      setError(err.message || 'Failed to create template');
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    try {
      const supabase = getSupabaseClient();

      // Get current user and organization
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

      // Get current organization settings
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', organizationId)
        .single();

      if (orgError) throw orgError;

      const settings = orgData.settings || {};
      let templates = settings.followup_templates || [];

      // Find template index
      const templateIndex = templates.findIndex((t: any) => t.id === editingTemplate.id);
      if (templateIndex === -1) {
        setError('Template not found');
        return;
      }

      // Update template
      templates[templateIndex] = {
        ...templates[templateIndex],
        name: templateForm.name,
        followupType: templateForm.followupType,
        subject: templateForm.subject,
        body: templateForm.body,
      };

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

      // Reset form and close modal
      setTemplateForm({
        name: '',
        followupType: 'call',
        subject: '',
        body: '',
      });
      setShowEditModal(false);
      setEditingTemplate(null);

      // Reload templates
      await loadTemplates();
    } catch (err: any) {
      console.error('Error updating template:', err);
      setError(err.message || 'Failed to update template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    try {
      const supabase = getSupabaseClient();

      // Get current user and organization
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

      // Get current organization settings
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', organizationId)
        .single();

      if (orgError) throw orgError;

      const settings = orgData.settings || {};
      let templates = settings.followup_templates || [];

      // Remove template
      templates = templates.filter((t: any) => t.id !== templateId);

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

      // Reload templates
      await loadTemplates();
    } catch (err: any) {
      console.error('Error deleting template:', err);
      setError(err.message || 'Failed to delete template');
    }
  };

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      followupType: template.followupType,
      subject: template.subject || '',
      body: template.body,
    });
    setShowEditModal(true);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Follow-up Templates</h1>
        <div className="flex space-x-3">
          <Link
            href="/(dashboard)/followups"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-gray-500"
          >
            Back to Follow-ups
          </Link>
          <button
            onClick={() => {
              setShowCreateModal(true);
              setTemplateForm({
                name: '',
                followupType: 'call',
                subject: '',
                body: '',
              });
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-indigo-500"
          >
            + New Template
          </button>
        </div>
      </div>

      {/* Create Template Modal */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center ${
        showCreateModal ? 'block' : 'hidden'
      }`}>
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75"></div>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {editingTemplate ? 'Edit Template' : 'New Template'}
            </h2>
            <button
              onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                setEditingTemplate(null);
                setTemplateForm({
                  name: '',
                  followupType: 'call',
                  subject: '',
                  body: '',
                });
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (editingTemplate) {
              handleUpdateTemplate();
            } else {
              handleCreateTemplate();
            }
          }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name
              </label>
              <input
                type="text"
                value={templateForm.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter template name..."
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Type
              </label>
              <select
                value={templateForm.followupType}
                onChange={(e) => handleInputChange('followupType', e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="call">Call</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject (Email only)
              </label>
              <input
                type="text"
                value={templateForm.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder="Email subject (optional)"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Body
              </label>
              <textarea
                value={templateForm.body}
                onChange={(e) => handleInputChange('body', e.target.value)}
                rows={4}
                placeholder="Enter template message..."
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setEditingTemplate(null);
                  setTemplateForm({
                    name: '',
                    followupType: 'call',
                    subject: '',
                    body: '',
                  });
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus-offset-ring-2 focus:ring-indigo-500"
              >
                {editingTemplate ? 'Update Template' : 'Save Template'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Templates List */}
      {templates.length > 0 ? (
        <div className="space-y-4">
          {templates.map((template: any) => (
            <div
              key={template.id}
              className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="px-6 py-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getFollowupTypeColorClass(
                      template.followupType
                    )}`}
                  >
                    {template.followupType}
                  </span>
                </div>

                {template.subject && (
                  <p className="mt-1 text-sm text-gray-600">{template.subject}</p>
                )}

                <p className="mt-2 text-sm text-gray-700 line-clamp-3">
                  {template.body}
                </p>

                <div className="mt-4 flex justify-between items-center text-xs text-gray-500">
                  <span>
                    Created: {new Date(template.created_at || Date.now()).toLocaleDateString()}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="text-indigo-600 hover:text-indigo-500"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="text-red-600 hover:text-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No templates found. Create your first template above.</p>
        </div>
      )}
    </div>
  );
}

// Helper functions for status/temperature colors
function getFollowupTypeColorClass(type: string): string {
  switch (type) {
    case 'call': return 'bg-indigo-100 text-indigo-800';
    case 'whatsapp': return 'bg-green-100 text-green-800';
    case 'sms': return 'bg-blue-100 text-blue-800';
    case 'email': return 'bg-purple-100 text-purple-800';
    case 'meeting': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}