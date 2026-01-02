# Boon Employee Coaching Portal

Employee-facing portal for Boon Health coaching clients to track their sessions, view progress, and connect with their coach.

## Features

- **Dashboard**: Overview of coaching journey, upcoming sessions, focus areas
- **Sessions**: Calendar and list view of all coaching sessions
- **Progress**: Visual timeline of focus area evolution
- **My Coach**: Coach profile and session history

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

Copy the environment example file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key

Get these from your Supabase project: Settings > API

### 3. Run database migrations

Open your Supabase SQL Editor and run the contents of `supabase-setup.sql`. This will:

- Add the `auth_user_id` column to `employee_manager`
- Enable Row Level Security on all tables
- Create RLS policies so employees only see their own data
- Create helper functions for the auth flow
- Add optional tables for action items and feedback

### 4. Configure Supabase Auth

In your Supabase dashboard:

1. Go to **Authentication > URL Configuration**
2. Add to **Redirect URLs**:
   - `http://localhost:5173/auth/callback` (for local dev)
   - `https://your-production-domain.com/auth/callback` (for production)

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view it.

## Auth Flow

1. User enters work email on login page
2. App checks if email exists in `employee_manager` table
3. If found, sends Supabase magic link
4. User clicks link in email, redirected to `/auth/callback`
5. Callback exchanges tokens for session
6. App links `auth_user_id` to employee record (first login only)
7. User sees their dashboard

## Row Level Security

All tables use RLS policies to ensure employees only see their own data:

| Table | Policy |
|-------|--------|
| `employee_manager` | Can only read/update own record (matched by `auth_user_id`) |
| `session_tracking` | Can only read sessions matching their email |
| `survey_responses_unified` | Can only read own survey responses |
| `welcome_survey_scale` | Can only read own baseline survey |

## Project Structure

```
├── src/
│   ├── lib/
│   │   ├── supabase.ts        # Supabase client and auth helpers
│   │   ├── types.ts           # TypeScript types
│   │   ├── dataFetcher.ts     # Data fetching functions
│   │   └── AuthContext.tsx    # React auth context provider
│   ├── pages/
│   │   ├── LoginPage.tsx      # Magic link login
│   │   ├── AuthCallback.tsx   # Handles magic link redirect
│   │   └── NoEmployeeFound.tsx # Error state for unknown emails
│   ├── components/
│   │   ├── Layout.tsx         # App layout with nav
│   │   ├── Dashboard.tsx      # Main dashboard
│   │   ├── Sessions.tsx       # Session history & calendar
│   │   ├── Progress.tsx       # Progress tracking
│   │   └── Coach.tsx          # Coach profile
│   ├── App.tsx                # Root app with routing
│   ├── main.tsx               # Entry point
│   └── index.css              # Tailwind styles
├── supabase-setup.sql         # Database migrations
└── .env.example               # Environment variables template
```

## Deployment

Build for production:

```bash
npm run build
```

Deploy the `dist` folder to Vercel, Netlify, or any static hosting.

Remember to:
1. Set environment variables in your hosting platform
2. Add your production URL to Supabase Auth redirect URLs
3. Update any hardcoded URLs (like booking links)

## Customization

### Booking Link
Update the booking URL in `Dashboard.tsx` and `Coach.tsx`:
```tsx
<a href="https://your-booking-url.com" ...>
```

### Coach Profile
To fetch real coach data instead of generated placeholders, update `Coach.tsx` to pull from your `coaches` table.

### Session Summaries
Add a `summary` column to your `session_tracking` table (included in the migration) and populate it from your coaching workflow.

## Troubleshooting

### "Account not found" on login
- Check the email exists in `employee_manager` table
- Verify `company_email` column matches what user entered
- Check if employee status is 'Inactive'

### Session data not loading
- Verify RLS policies are in place
- Check browser console for errors
- Ensure `employee_email` in `session_tracking` matches `company_email` in `employee_manager`

### Magic link not received
- Check spam/junk folder
- Verify Supabase email settings
- Check Supabase Auth logs for delivery status
