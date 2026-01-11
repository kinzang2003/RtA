# Account Deletion & Apple App Store Compliance

This document describes how the RTA Studio app now handles user-initiated account deletion with a 30-day recovery window, along with the supporting back-end automation required to comply with Apple App Store policies.

## Front-end flow

- Users can initiate deletion from `Profile` → **Delete Account**.
- A 30-day grace period is scheduled (`deletion_requested_at` / `deletion_scheduled_for` fields in the `profiles` table).
- During the grace period, the Profile screen shows:
  - The exact deletion date/time.
  - A **Cancel deletion request** button to restore the account instantly.
- While the request is pending, the delete button is disabled and all deletion actions show contextual toasts.
- After the grace period, the client clears the local session and signs the user out on launch to prevent further access.

## Back-end automation

### Supabase Edge Function

The edge function at `supabase/functions/finalize-account-deletion/index.ts` permanently removes accounts whose grace period has elapsed. It:

1. Deletes collaborator entries and owned projects.
2. Removes the profile row.
3. Deletes the Supabase Auth user via the Admin API.

### Deployment

1. Deploy the function:

   ```bash
   supabase functions deploy finalize-account-deletion
   ```

2. Set environment variables for the function:

   ```bash
   supabase secrets set \
     SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
     SUPABASE_URL="https://<project>.supabase.co" \
     ACCOUNT_DELETION_CRON_TOKEN="<strong-random-token>"
   ```

   The `ACCOUNT_DELETION_CRON_TOKEN` protects the function from unauthorised calls. All scheduled invocations must set an `Authorization: Bearer <token>` header.

3. Schedule the function (daily is typical). Two options:
   - **Supabase cron** (requires Supabase self-hosted or Enterprise):

     ```bash
     supabase cron create finalize-account-deletion \
       --schedule "0 3 * * *" \
       --request-body '{}' \
       --request-headers "Authorization=Bearer <token>"
     ```

   - **GitHub Actions / external scheduler**: call `https://<project>.supabase.co/functions/v1/finalize-account-deletion` via HTTPS daily with the same bearer token.

4. Optional: trigger the function manually for testing:

   ```bash
   curl -X POST \
     -H "Authorization: Bearer <token>" \
     https://<project>.supabase.co/functions/v1/finalize-account-deletion
   ```

## Additional compliance considerations

- **Update support links**: Apple requires a pathway for users to contact support about account issues. Expose support/contact info in the Profile screen or Settings.
- **Privacy policy**: Ensure the policy references the 30-day hold, data retention, and irreversible deletion timeline. Provide the policy URL in App Store Connect.
- **Data download** (optional but recommended): inform users how to request their data before deletion, or link to a help article.
- **App Store submission metadata**: In App Store Connect, confirm that “Account Deletion” is available in-app and describe where it is located (Profile → Delete Account).
- **Server logs/legal holds**: If any data must be retained beyond 30 days (e.g., legal obligations), document it in the privacy policy and ensure it is decoupled from user-facing data removed by the function.

## Verification checklist

1. Sign in, schedule deletion, and confirm the toast/banner messaging.
2. After scheduling, verify that cancelling removal clears the warning.
3. Invoke the edge function (or wait for the cron job) and confirm:
   - The Supabase Auth user is removed.
   - `profiles`, `projects`, and `collaborators` rows are deleted.
4. Relaunch the app; it should force sign-out if the account was deleted.
5. Run `npx tsc --noEmit` and the relevant Jest/EAS builds before submitting to ensure no regressions.
