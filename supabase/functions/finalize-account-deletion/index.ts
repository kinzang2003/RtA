// don't have to bother the error here for this because it's a serverless function for supabase
// just remember to deploy the function with the command: supabase functions deploy finalize-account-deletion
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.4";

type ProfileRow = {
  id: string;
  email?: string | null;
  deletion_requested_at?: string | null;
  deletion_scheduled_for?: string | null;
};

type ResultEntry = {
  userId: string;
  status: "success" | "partial" | "skipped" | "error";
  notes: string[];
};

const RESPONSE_HEADERS = {
  "Content-Type": "application/json",
};

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: RESPONSE_HEADERS,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cronToken = Deno.env.get("ACCOUNT_DELETION_CRON_TOKEN") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase service configuration" }),
      { status: 500, headers: RESPONSE_HEADERS }
    );
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (cronToken && authHeader !== `Bearer ${cronToken}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: RESPONSE_HEADERS,
    });
  }

  let body: { userId?: string } = {};
  try {
    body = await req.json();
  } catch (_error) {
    // empty body is fine; we'll process all eligible accounts
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const nowIso = new Date().toISOString();
  const holdDurationMs = 30 * 24 * 60 * 60 * 1000;

  let query = client
    .from("profiles")
    .select("id, email, deletion_requested_at, deletion_scheduled_for")
    .not("deletion_requested_at", "is", null)
    .lte("deletion_scheduled_for", nowIso);

  if (body.userId) {
    query = query.eq("id", body.userId);
  }

  const { data: profiles, error: profileError } = await query;
  if (profileError) {
    return new Response(JSON.stringify({ error: profileError.message }), {
      status: 500,
      headers: RESPONSE_HEADERS,
    });
  }

  const pendingProfiles: ProfileRow[] = profiles ?? [];

  // If no rows have deletion_scheduled_for (older data), fall back to hold window
  const fallbackProfiles = pendingProfiles.length
    ? pendingProfiles
    : ((
        await client
          .from("profiles")
          .select("id, email, deletion_requested_at, deletion_scheduled_for")
          .not("deletion_requested_at", "is", null)
          .is("deletion_scheduled_for", null)
      ).data?.filter((row: ProfileRow) => {
        if (!row.deletion_requested_at) return false;
        const scheduledMs =
          new Date(row.deletion_requested_at).getTime() + holdDurationMs;
        return scheduledMs <= Date.now();
      }) ?? []);

  const targets = body.userId
    ? pendingProfiles
        .concat(fallbackProfiles)
        .filter((row) => row.id === body.userId)
    : pendingProfiles.concat(fallbackProfiles);

  if (!targets.length) {
    return new Response(JSON.stringify({ processed: 0, results: [] }), {
      status: 200,
      headers: RESPONSE_HEADERS,
    });
  }

  const results: ResultEntry[] = [];

  for (const profile of targets) {
    const entry: ResultEntry = {
      userId: profile.id,
      status: "success",
      notes: [],
    };

    try {
      const { error: collaboratorError } = await client
        .from("collaborators")
        .delete()
        .eq("user_id", profile.id);
      if (collaboratorError) {
        entry.status = "partial";
        entry.notes.push(`collaborators: ${collaboratorError.message}`);
      }

      const { error: ownedProjectsError } = await client
        .from("projects")
        .delete()
        .eq("owner_id", profile.id);
      if (ownedProjectsError) {
        entry.status = "partial";
        entry.notes.push(`projects: ${ownedProjectsError.message}`);
      }

      const { error: profileDeleteError } = await client
        .from("profiles")
        .delete()
        .eq("id", profile.id);
      if (profileDeleteError) {
        entry.status = "partial";
        entry.notes.push(`profiles: ${profileDeleteError.message}`);
      }

      const { error: authError } = await client.auth.admin.deleteUser(
        profile.id
      );
      if (authError) {
        entry.status = "partial";
        entry.notes.push(`auth: ${authError.message}`);
      }
    } catch (err) {
      entry.status = "error";
      entry.notes.push(
        `unexpected: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    results.push(entry);
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    status: 200,
    headers: RESPONSE_HEADERS,
  });
});
