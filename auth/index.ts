import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import { signOut } from "@/lib/auth-store";
import { handleAuthRedirectUrl } from "@/lib/auth-redirect";
import { getWebAuthUrl } from "@/lib/web-url";

WebBrowser.maybeCompleteAuthSession();

const SESSION_KEY = "sb-session";

export type SessionInfo = {
  user_id: string;
  email?: string;
  full_name?: string;
  access_token: string;
  refresh_token: string;
};

export function getRedirectUri() {
  // returns rtastudio-app://auth in standalone
    return Linking.createURL("auth", { scheme: "rtastudio-app" });
}

export async function openWebLogin(mode: "signin" | "signup" = "signin"): Promise<SessionInfo | null> {
  const redirectUri = getRedirectUri();
  const url = new URL(getWebAuthUrl());
  url.searchParams.set("app", "1");
  url.searchParams.set("mode", mode);
  url.searchParams.set("app_redirect", redirectUri);

  const result = await WebBrowser.openAuthSessionAsync(url.toString(), redirectUri);
  if (result.type === "success" && result.url) {
    // Some platforms return the redirect URL directly; process it to be safe.
    await handleAuthRedirectUrl(result.url);
  }

  return restoreSession();
}

export async function restoreSession(): Promise<SessionInfo | null> {
  // Supabase restores session from SecureStoreAdapter automatically
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;

  const user = data.session.user;
  const session: SessionInfo = {
    user_id: user.id,
    email: user.email ?? undefined,
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  };

  return session;
}

export async function clearSession() {
  // Use auth-store optimistic signout for reliable UX/navigation.
  await signOut();
}
