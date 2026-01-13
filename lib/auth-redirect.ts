import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

let lastHandledKey: string | null = null;
let lastHandledAt = 0;

function shouldSkip(key: string) {
  const now = Date.now();
  if (lastHandledKey === key && now - lastHandledAt < 5000) return true;
  lastHandledKey = key;
  lastHandledAt = now;
  return false;
}

function parseQueryFromUrl(url: string) {
  const query = url.split("?")[1] || "";
  return new URLSearchParams(query);
}

export async function handleAuthRedirectUrl(url: string) {
  if (!url.includes("rtastudio-app://auth")) return;

  const params = parseQueryFromUrl(url);
  const errorDescription = params.get("error_description") || params.get("error");
  if (errorDescription) {
    throw new Error(errorDescription);
  }

  const code = params.get("code");
  if (code) {
    if (shouldSkip(`code:${code}`)) return;
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }

  const handoff = params.get("handoff");
  if (handoff) {
    if (shouldSkip(`handoff:${handoff}`)) return;

    const baseUrl =
      process.env.EXPO_PUBLIC_WEB_AUTH_URL ||
      process.env.EXPO_PUBLIC_WEB_EDITOR_URL;

    if (!baseUrl) {
      throw new Error("Missing EXPO_PUBLIC_WEB_EDITOR_URL");
    }

    // Important: baseUrl may include a path (e.g. http://host:3000/auth).
    // Using URL("/api/...", baseUrl) ensures we always hit the correct root API route.
    const exchangeUrl = new URL("/api/auth/handoff/exchange", baseUrl).toString();

    const res = await fetch(exchangeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({ code: handoff }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.warn("[AuthRedirect] Handoff exchange failed", { status: res.status, text });
      throw new Error("Sign-in exchange failed");
    }

    const data = (await res.json()) as { access_token?: string; refresh_token?: string };
    if (!data.access_token || !data.refresh_token) {
      throw new Error("Invalid exchange response");
    }

    const { error } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });

    if (error) throw error;
  }
}
