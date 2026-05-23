# Supabase Setup Guide for EstateFlow CRM

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and API keys from Settings > API
3. You'll need:
   - Project URL (e.g., https://xyzcompany.supabase.co)
   - anon public key
   - service_role key

## Step 2: Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your anon public key
- `SUPABASE_SERVICE_ROLE_KEY`: Your service_role key

## Step 3: Enable Required Extensions

In your Supabase dashboard, go to Database > Extensions and enable:
- `uuid-ossp` (for UUID generation)

## Step 4: Create Storage Buckets

In your Supabase dashboard, go to Storage and create these buckets:
- `property-images` (public) - for property photos
- `property-documents` (private) - for property documents/brochures
- `user-avatars` (public) - for user profile pictures
- `social-media-media` (public) - for social media post media

Make sure to set the appropriate access levels:
- Public buckets: Anyone can read files
- Private buckets: Only authenticated users can read files (via signed URLs)

## Step 5: Run Migrations

You can run the migrations using either:

### Option A: Supabase CLI (Recommended)
1. Install Supabase CLI: `npm install -g supabase`
2. Login: `supabase login`
3. Link to your project: `supabase link --project-ref YOUR_PROJECT_REF`
4. Push migrations: `supabase db push`

### Option B: Manual Execution
1. Copy the SQL from `supabase/migrations/001_init_schema.sql`
2. Go to Supabase dashboard > SQL Editor
3. Paste and run the SQL

## Step 6: Verify Tables

After running migrations, verify these tables were created:
- organizations
- profiles
- team_members
- lead_sources
- leads
- properties
- property_images
- property_documents
- lead_property_shares
- activities
- calls
- messages
- followups
- attendance
- social_posts
- tasks
- integration_settings
- notifications

## Step 7: Test Connection

Run the development server to test the connection:
```bash
npm run dev
```

If you see connection errors, double-check your environment variables.

## Step 8: Seed Data (Optional)

To populate initial data, you can run the seed scripts (to be created) or manually insert data via SQL Editor.

## Row Level Security (RLS)

The migration script includes RLS policies that ensure:
- Users can only access data from their own organization
- Admins have full access to their organization's data
- Agents can only see/manage their assigned leads
- Proper isolation between different organizations using the same CRM instance

## Troubleshooting

### Common Issues:

1. **Connection refused**: Check NEXT_PUBLIC_SUPABASE_URL and keys in .env.local
2. **Permission denied**: Ensure SERVICE_ROLE_KEY is used for server-side operations
3. **Missing extensions**: Make sure uuid-ossp is enabled
4. **RLS blocking queries**: Verify your auth setup and user organization mapping
5. **Storage bucket not found**: Ensure you created the required storage buckets

### Development Tips:

- Use `supabase start` for local development with Docker
- Use Supabase Studio UI to visually inspect and modify data
- Enable realtime subscriptions on tables that need live updates
- Consider using separate buckets for different environments (dev/stage/prod)

## Production Considerations

1. Enable email authentication in Supabase Auth settings
2. Configure SMTP/Resend for actual email sending
3. Set up proper CORS policies
4. Use environment-specific configs (development/staging/production)
5. Set up backup strategies in Supabase dashboard
6. Monitor query performance and add additional indexes as needed