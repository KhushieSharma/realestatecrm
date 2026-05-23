-- EstateFlow CRM Database Schema
-- Migration 001: Initial schema setup

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  subscription_plan VARCHAR(50) DEFAULT 'free',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users/Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'sales_manager', 'sales_agent', 'field_executive', 'social_media_manager')),
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members (for organization-level membership tracking)
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'sales_manager', 'sales_agent', 'field_executive', 'social_media_manager')),
  invited_by UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Lead sources
CREATE TABLE lead_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leads table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_id UUID REFERENCES lead_sources(id) ON DELETE SET NULL,

  -- Basic contact info
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),

  -- Property interests
  property_type VARCHAR(50) CHECK (property_type IN ('Apartment', 'Villa', 'Plot', 'Commercial', 'Rental')),
  budget_min DECIMAL(15, 2),
  budget_max DECIMAL(15, 2),
  preferred_location VARCHAR(255),

  -- Lead status and temperature
  status VARCHAR(50) DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Interested', 'Site Visit Scheduled', 'Negotiation', 'Won', 'Lost', 'Not Responding')),
  temperature VARCHAR(20) DEFAULT 'Cold' CHECK (temperature IN ('Cold', 'Warm', 'Hot')),

  -- Additional fields
  notes TEXT,
  next_followup TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_contacted TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Properties table
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Property owner/developer

  -- Basic property info
  title VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  address TEXT,
  property_type VARCHAR(50) CHECK (property_type IN ('Apartment', 'Villa', 'Plot', 'Commercial', 'Rental')),
  price DECIMAL(15, 2),
  size DECIMAL(10, 2), -- in square feet/meters
  bedrooms INTEGER,
  bathrooms INTEGER,
  floor INTEGER,
  furnishing_status VARCHAR(50) CHECK (furnishing_status IN ('Furnished', 'Semi-Furnished', 'Unfurnished')),
  availability_status VARCHAR(50) DEFAULT 'Available' CHECK (availability_status IN ('Available', 'Hold', 'Sold', 'Rented')),

  -- Additional details
  description TEXT,
  amenities TEXT[], -- Array of amenities

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Property images
CREATE TABLE property_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Property documents
CREATE TABLE property_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  name VARCHAR(255),
  document_type VARCHAR(100), -- brochure, floor_plan, legal_docs, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lead-property shares (when agents share properties with leads)
CREATE TABLE lead_property_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  shared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  shared_via VARCHAR(50) CHECK (shared_via IN ('whatsapp', 'sms', 'email')),
  message_text TEXT,
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activities table (timeline of all interactions)
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Who performed the activity

  activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('call', 'message', 'note', 'followup', 'property_share', 'status_change', 'assignment')),
  description TEXT,
  metadata JSONB DEFAULT '{}', -- Flexible storage for activity-specific data

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calls table (Twilio call logs)
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Twilio identifiers
  call_sid VARCHAR(255),
  conference_sid VARCHAR(255),

  -- Call details
  status VARCHAR(50), -- queued, ringing, in-progress, completed, failed, busy, no-answer
  duration INTEGER, -- in seconds
  recording_url TEXT,
  outcome VARCHAR(100), -- answered, not_answered, busy, failed, etc.

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table (WhatsApp, SMS, Email)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('whatsapp', 'sms', 'email')),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),

  -- Content
  template_name VARCHAR(255), -- Reference to template used
  subject VARCHAR(500), -- For emails
  body TEXT NOT NULL,

  -- Status tracking
  status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  external_message_id VARCHAR(255), -- ID from Twilio/Resend/etc.

  -- Timestamps
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Follow-ups table
CREATE TABLE followups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Follow-up details
  title VARCHAR(255),
  description TEXT,
  followup_type VARCHAR(50) CHECK (followup_type IN ('call', 'whatsapp', 'sms', 'email', 'meeting')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'snoozed', 'cancelled')),

  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Reminders
  reminder_sent BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance table
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Check-in/out details
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  check_in_latitude DECIMAL(10, 8),
  check_in_longitude DECIMAL(11, 8),
  check_out_latitude DECIMAL(10, 8),
  check_out_longitude DECIMAL(11, 8),

  -- Additional info
  status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'late', 'absent', 'half_day')),
  notes TEXT,
  selfie_url TEXT, -- Optional selfie upload

  -- Date (for easy querying)
  attendance_date DATE DEFAULT CURRENT_DATE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social media posts
CREATE TABLE social_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Post details
  post_type VARCHAR(50) NOT NULL CHECK (post_type IN ('instagram_reel', 'instagram_post', 'facebook_post', 'linkedin_post', 'story')),
  caption TEXT,
  media_urls TEXT[], -- Array of media URLs

  -- Scheduling
  status VARCHAR(50) DEFAULT 'idea' CHECK (status IN ('idea', 'draft', 'scheduled', 'published')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,

  -- AI integration placeholder
  ai_suggestions TEXT,

  -- Notes
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table (general purpose task management)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Task details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Related entities (polymorphic associations)
  related_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  related_property_id UUID REFERENCES properties(id) ON DELETE SET NULL,

  -- Scheduling
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Integration settings
CREATE TABLE integration_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Twilio settings
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  twilio_phone_number VARCHAR(20),
  twilio_whatsapp_sender VARCHAR(20),

  -- Email settings
  resend_api_key TEXT,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_username TEXT,
  smtp_password TEXT,
  smtp_from_email TEXT,

  -- Lead webhook
  webhook_secret TEXT,

  -- AI settings
  openai_api_key TEXT,
  openai_base_url TEXT,

  -- Lead assignment settings
  lead_assignment_mode VARCHAR(50) DEFAULT 'round_robin' CHECK (lead_assignment_mode IN ('round_robin', 'manual', 'least_busy')),

  -- Flags
  is_twilio_configured BOOLEAN DEFAULT false,
  is_email_configured BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification details
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) CHECK (type IN ('lead_assigned', 'missed_call', 'followup_due', 'site_visit', 'property_shared', 'attendance_issue', 'social_post_due', 'system')),

  -- Related entities
  related_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  related_property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

  -- Status
  is_read BOOLEAN DEFAULT false,
  is_clicked BOOLEAN DEFAULT false,

  -- Action URL (for deep linking)
  action_url TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_property_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Organizations: Users can only see their own organization
CREATE POLICY "Users can view own organization" ON organizations
  FOR SELECT USING (id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage organization" ON organizations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin' AND organization_id = organizations.id
    )
  );

-- Profiles: Users can view their own profile and team members in same organization
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can view team profiles" ON profiles
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Team members: Organization members can view team, admins can manage
CREATE POLICY "Organization members can view team" ON team_members
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage team" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin' AND organization_id = team_members.organization_id
    )
  );

-- Lead sources: Organization members can view, admins can manage
CREATE POLICY "Organization members can view lead sources" ON lead_sources
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage lead sources" ON lead_sources
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin' AND organization_id = lead_sources.organization_id
    )
  );

-- Leads: Organization members can view assigned leads, admins/managers can view all
CREATE POLICY "Users can view assigned leads" ON leads
  FOR SELECT USING (
    assigned_agent_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    ) AND (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('admin', 'sales_manager')
      )
    )
  );

CREATE POLICY "Admins and managers can manage leads" ON leads
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    ) AND (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('admin', 'sales_manager')
      )
  ) OR (
    assigned_agent_id = auth.uid() -- Agents can update their own leads
  );

-- Properties: Similar to leads
CREATE POLICY "Organization members can view properties" ON properties
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins and owners can manage properties" ON properties
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    ) AND (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('admin') OR id = properties.owner_id
      )
  );

-- Property images/documents: Inherit property permissions
CREATE POLICY "Users can view property images" ON property_images
  FOR SELECT USING (property_id IN (
    SELECT id FROM properties WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Admins and owners can manage property images" ON property_images
  FOR ALL USING (
    property_id IN (
      SELECT id FROM properties WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      ) AND (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role IN ('admin') OR id = properties.owner_id
        )
      )
  );

-- Same pattern for property_documents
CREATE POLICY "Users can view property documents" ON property_documents
  FOR SELECT USING (property_id IN (
    SELECT id FROM properties WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Admins and owners can manage property documents" ON property_documents
  FOR ALL USING (
    property_id IN (
      SELECT id FROM properties WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      ) AND (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role IN ('admin') OR id = properties.owner_id
        )
      )
  );

-- Lead property shares: Based on lead access
CREATE POLICY "Users can view lead property shares" ON lead_property_shares
  FOR SELECT USING (
    lead_id IN (
      SELECT id FROM leads WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create lead property shares" ON lead_property_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      WHERE id = lead_property_shares.lead_id
      AND (assigned_agent_id = auth.uid() OR
           organization_id IN (
             SELECT organization_id FROM profiles WHERE id = auth.uid()
           ) AND EXISTS (
             SELECT 1 FROM profiles
             WHERE id = auth.uid() AND role IN ('admin', 'sales_manager')
           ))
    )
  );

-- Activities: Based on lead access
CREATE POLICY "Users can view activities" ON activities
  FOR SELECT USING (
    lead_id IN (
      SELECT id FROM leads WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create activities" ON activities
  FOR INSERT WITH CHECK (
    lead_id IN (
      SELECT id FROM leads WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Calls: Based on lead access
CREATE POLICY "Users can view calls" ON calls
  FOR SELECT USING (
    lead_id IN (
      SELECT id FROM leads WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create calls" ON calls
  FOR INSERT WITH CHECK (
    lead_id IN (
      SELECT id FROM leads WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Messages: Based on lead access
CREATE POLICY "Users can view messages" ON messages
  FOR SELECT USING (
    lead_id IN (
      SELECT id FROM leads WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create messages" ON messages
  FOR INSERT WITH CHECK (
    lead_id IN (
      SELECT id FROM leads WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Followups: Based on lead access
CREATE POLICY "Users can view followups" ON followups
  FOR SELECT USING (
    lead_id IN (
      SELECT id FROM leads WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage own followups" ON followups
  FOR ALL USING (
    assigned_to = auth.uid() OR
    lead_id IN (
      SELECT id FROM leads WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      ) AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('admin', 'sales_manager')
      )
  );

-- Attendance: Users can view own attendance, admins can view all
CREATE POLICY "Users can view own attendance" ON attendance
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all attendance" ON attendance
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    ) AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can create own attendance" ON attendance
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own attendance" ON attendance
  FOR UPDATE USING (user_id = auth.uid());

-- Social posts: Organization members can view, creators/assigned can manage
CREATE POLICY "Organization members can view social posts" ON social_posts
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage own social posts" ON social_posts
  FOR ALL USING (
    created_by = auth.uid() OR assigned_to = auth.uid()
  ) OR (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    ) AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'social_media_manager')
    )
  );

-- Tasks: Based on organization membership
CREATE POLICY "Organization members can view tasks" ON tasks
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage own tasks" ON tasks
  FOR ALL USING (
    assigned_to = auth.uid() OR created_by = auth.uid()
  ) OR (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    ) AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'sales_manager')
    )
  );

-- Integration settings: Only admins can manage
CREATE POLICY "Admins can manage integration settings" ON integration_settings
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    ) AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Notifications: Users can view own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_leads_organization_id ON leads(organization_id);
CREATE INDEX idx_leads_assigned_agent_id ON leads(assigned_agent_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_temperature ON leads(temperature);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_next_followup ON leads(next_followup);

CREATE INDEX idx_properties_organization_id ON properties(organization_id);
CREATE INDEX idx_properties_availability ON properties(availability_status);
CREATE INDEX idx_properties_type ON properties(property_type);
CREATE INDEX idx_properties_price ON properties(price);

CREATE INDEX idx_activities_lead_id ON activities(lead_id);
CREATE INDEX idx_activities_created_at ON activities(created_at);
CREATE INDEX idx_activities_user_id ON activities(user_id);

CREATE INDEX idx_calls_lead_id ON calls(lead_id);
CREATE INDEX idx_calls_agent_id ON calls(agent_id);
CREATE INDEX idx_calls_created_at ON calls(created_at);
CREATE INDEX idx_calls_status ON calls(status);

CREATE INDEX idx_messages_lead_id ON messages(lead_id);
CREATE INDEX idx_messages_sent_by ON messages(sent_by);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_status ON messages(status);

CREATE INDEX idx_followups_lead_id ON followups(lead_id);
CREATE INDEX idx_followups_assigned_to ON followups(assigned_to);
CREATE INDEX idx_followups_scheduled_for ON followups(scheduled_for);
CREATE INDEX idx_followups_status ON followups(status);

CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_date ON attendance(attendance_date);
CREATE INDEX idx_attendance_organization_id ON attendance(organization_id);

CREATE INDEX idx_social_posts_organization_id ON social_posts(organization_id);
CREATE INDEX idx_social_posts_status ON social_posts(status);
CREATE INDEX idx_social_posts_scheduled_for ON social_posts(scheduled_for);
CREATE INDEX idx_social_posts_created_by ON social_posts(created_by);

CREATE INDEX idx_tasks_organization_id ON tasks(organization_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_status ON tasks(status);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Create updated_at triggers for all tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables that have it
DO $$
DECLARE
  tablename record;
BEGIN
  FOR tablename IN (
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
      'organizations', 'profiles', 'team_members', 'lead_sources', 'leads',
      'properties', 'property_images', 'property_documents', 'lead_property_shares',
      'activities', 'calls', 'messages', 'followups', 'attendance', 'social_posts',
      'tasks', 'integration_settings', 'notifications'
    )
  ) LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    ', tablename.tablename, tablename.tablename, tablename.tablename, tablename.tablename);
  END LOOP;
END $$;

-- Insert default lead sources
INSERT INTO lead_sources (organization_id, name, is_active) VALUES
  ('00000000-0000-0000-0000-000000000000', '36 Acre', true),
  ('00000000-0000-0000-0000-000000000000', 'MagicBricks', true),
  ('00000000-0000-0000-0000-000000000000', 'Housing.com', true),
  ('00000000-0000-0000-0000-000000000000', 'Facebook Ads', true),
  ('00000000-0000-0000-0000-000000000000', 'Instagram Ads', true),
  ('00000000-0000-0000-0000-000000000000', 'Website Forms', true),
  ('00000000-0000-0000-0000-000000000000', 'Referral', true),
  ('00000000-0000-0000-0000-000000000000', 'Manual Entry', true),
  ('00000000-0000-0000-0000-000000000000', 'Other', true)
ON CONFLICT DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE organizations IS 'Organizations/teams using the CRM';
COMMENT ON TABLE profiles IS 'User profile information extending Supabase auth';
COMMENT ON TABLE team_members IS 'Organization membership tracking';
COMMENT ON TABLE lead_sources IS 'Sources where leads originate from';
COMMENT ON TABLE leads IS 'Potential customer leads';
COMMENT ON TABLE properties IS 'Real estate properties for sale/rent';
COMMENT ON TABLE property_images IS 'Images associated with properties';
COMMENT ON TABLE property_documents IS 'Documents/brochures for properties';
COMMENT ON TABLE lead_property_shares IS 'Tracking when properties are shared with leads';
COMMENT ON TABLE activities IS 'Timeline of all interactions with leads';
COMMENT ON TABLE calls IS 'Twilio call logs and records';
COMMENT ON TABLE messages IS 'WhatsApp/SMS/Email message logs';
COMMENT ON TABLE followups IS 'Scheduled follow-up activities';
COMMENT ON TABLE attendance IS 'Employee check-in/attendance records';
COMMENT ON TABLE social_posts IS 'Social media content planning';
COMMENT ON TABLE tasks IS 'General purpose task management';
COMMENT ON TABLE integration_settings IS 'Third-party service configuration';
COMMENT ON TABLE notifications IS 'In-app notifications for users';