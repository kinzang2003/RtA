# Account Deletion Cron Job Setup

This guide explains how to automatically delete accounts after 30 days of deactivation.

## Option 1: Supabase Database Webhook (Recommended)

1. Go to Supabase Dashboard → Database → Functions
2. Create a new function called `delete_expired_accounts`:

```sql
CREATE OR REPLACE FUNCTION delete_expired_accounts()
RETURNS void AS $$
BEGIN
  -- Delete users whose deletion is scheduled and past due
  DELETE FROM auth.users
  WHERE id IN (
    SELECT id 
    FROM profiles 
    WHERE deletion_scheduled_for IS NOT NULL 
    AND deletion_scheduled_for < NOW()
  );
  
  -- Log the deletion count
  RAISE NOTICE 'Deleted expired accounts';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

3. Set up a cron job using pg_cron extension:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily deletion at 2 AM UTC
SELECT cron.schedule(
  'delete-expired-accounts',
  '0 2 * * *',  -- Every day at 2 AM
  $$SELECT delete_expired_accounts();$$
);
```

## Option 2: Supabase Edge Function with Cron

1. Install Supabase CLI: `npm install -g supabase`
2. Create edge function: `supabase functions new delete-expired-accounts`
3. Add this code to `supabase/functions/delete-expired-accounts/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find expired accounts
    const { data: expiredProfiles } = await supabase
      .from("profiles")
      .select("id")
      .not("deletion_scheduled_for", "is", null)
      .lt("deletion_scheduled_for", new Date().toISOString());

    if (!expiredProfiles || expiredProfiles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expired accounts found" }),
        { status: 200 }
      );
    }

    // Delete auth users (cascades to profiles table)
    const { error } = await supabase.auth.admin.deleteUser(
      expiredProfiles[0].id
    );

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        message: `Deleted ${expiredProfiles.length} expired accounts` 
      }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});
```

4. Deploy: `supabase functions deploy delete-expired-accounts`
5. Set up cron trigger in Supabase Dashboard → Edge Functions → Add a cron schedule

## Option 3: External Cron Service (GitHub Actions)

Create `.github/workflows/delete-expired-accounts.yml`:

```yaml
name: Delete Expired Accounts

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  delete-accounts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Delete expired accounts
        run: |
          curl -X POST '${{ secrets.SUPABASE_URL }}/rest/v1/rpc/delete_expired_accounts' \
            -H "apikey: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
```

## Verification

To test the setup:

1. Manually set a deletion date in the past:
```sql
UPDATE profiles 
SET deletion_scheduled_for = NOW() - INTERVAL '1 day'
WHERE id = 'test-user-id';
```

2. Run the cron job manually or wait for scheduled execution

3. Check if the account is deleted:
```sql
SELECT * FROM auth.users WHERE id = 'test-user-id';
-- Should return no results
```

## Important Notes

- **Backup data** before implementing automatic deletion
- Consider adding a soft delete first (mark as deleted but keep data)
- Log all deletions for audit purposes
- Test thoroughly with non-production accounts
- Consider GDPR compliance (delete all user data, not just auth)
