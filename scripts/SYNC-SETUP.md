# Salesforce to Supabase Sync Setup

This guide explains how to set up the automated sync between Salesforce and Supabase.

## Overview

The sync runs via GitHub Actions every 6 hours. It:
1. Connects to your Salesforce org
2. Fetches coaching session records (modified in last 7 days for incremental, or all for full sync)
3. Maps fields to match your Supabase schema
4. Upserts records to `session_tracking` table

## Prerequisites

### 1. Supabase Schema Update

Add the `salesforce_id` column if you haven't already:

```sql
ALTER TABLE session_tracking
ADD COLUMN IF NOT EXISTS salesforce_id TEXT UNIQUE;

-- Create index for faster upserts
CREATE INDEX IF NOT EXISTS idx_session_tracking_salesforce_id
ON session_tracking(salesforce_id);
```

### 2. Salesforce Connected App

Create a Connected App in Salesforce for API access:

1. Go to **Setup** → **App Manager** → **New Connected App**
2. Fill in basic info (name, contact email)
3. Enable OAuth Settings:
   - Callback URL: `https://login.salesforce.com/services/oauth2/callback`
   - Selected OAuth Scopes: `Full access (full)` or `api`
4. Save and note the Consumer Key/Secret (if using OAuth flow)

For username-password auth (simpler), you'll need:
- Your Salesforce username
- Password + Security Token

### 3. GitHub Secrets

Add these secrets to your GitHub repository:

| Secret Name | Description |
|-------------|-------------|
| `SALESFORCE_LOGIN_URL` | `https://login.salesforce.com` (prod) or `https://test.salesforce.com` (sandbox) |
| `SALESFORCE_USERNAME` | Your Salesforce username |
| `SALESFORCE_PASSWORD` | Your Salesforce password |
| `SALESFORCE_SECURITY_TOKEN` | Security token (find in Salesforce Settings → Reset Security Token) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (NOT anon key) |

To add secrets:
1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** for each

## Configuration

### Update Field Mapping

Edit `scripts/sync-salesforce.js` and update the `FIELD_MAPPING` object to match your Salesforce field API names:

```javascript
const FIELD_MAPPING = {
  'Id': 'salesforce_id',
  'Your_Employee_Field__c': 'employee_id',
  // ... update all fields
};
```

To find your field API names in Salesforce:
1. Go to **Setup** → **Object Manager**
2. Select your coaching session object
3. Click **Fields & Relationships**
4. The API name is in the "Field Name" column

### Update Object Name

In the same file, update `CONFIG.salesforceObject`:

```javascript
const CONFIG = {
  salesforceObject: 'Your_Object_Name__c',  // Update this
  // ...
};
```

## Running the Sync

### Automatic (Scheduled)

The sync runs automatically every 6 hours. Check the **Actions** tab in GitHub to see run history.

### Manual Run

1. Go to your GitHub repo → **Actions**
2. Select "Salesforce to Supabase Sync"
3. Click **Run workflow**
4. Optionally check "Run full historical sync" for a complete re-sync

### Local Testing

```bash
# Set environment variables
export SALESFORCE_LOGIN_URL="https://login.salesforce.com"
export SALESFORCE_USERNAME="your-username"
export SALESFORCE_PASSWORD="your-password"
export SALESFORCE_SECURITY_TOKEN="your-token"
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_KEY="your-service-key"

# Install dependencies
npm install jsforce @supabase/supabase-js

# Run sync
node scripts/sync-salesforce.js

# For full sync
FULL_SYNC=true node scripts/sync-salesforce.js
```

## Troubleshooting

### "Invalid login" error
- Verify username/password/token are correct
- Check if IP restrictions are blocking (may need to whitelist GitHub's IPs or disable IP restrictions)
- Try regenerating your security token

### "Object not found" error
- Verify the object API name in `CONFIG.salesforceObject`
- Ensure the connected user has access to the object

### "Field not found" error
- Check field API names in `FIELD_MAPPING`
- Verify field-level security allows access

### Records not appearing
- Check the sync logs in GitHub Actions
- Verify records match the LastModifiedDate filter
- Try a full sync to catch all historical records

## Monitoring

The workflow will fail if sync errors occur. You can add Slack notifications by uncommenting the webhook section in `.github/workflows/salesforce-sync.yml` and adding a `SLACK_WEBHOOK_URL` secret.
