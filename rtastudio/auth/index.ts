import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import { supabase } from "@/lib/supabase";

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
  return Linking.createURL("auth");
}

export async function openWebLogin(): Promise<SessionInfo | null> {
  const redirectUri = getRedirectUri();

  const webAuthUrl =
    `${process.env.EXPO_PUBLIC_WEB_AUTH_URL}` +
    `?app=1&app_redirect=${encodeURIComponent(redirectUri)}`;

  const result = await WebBrowser.openAuthSessionAsync(
    webAuthUrl,
    redirectUri
  );

  if (result.type !== "success" || !result.url) return null;

  const params = new URLSearchParams(
    result.url.split("?")[1] ?? ""
  );

  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");

  if (!access_token || !refresh_token) return null;

  await supabase.auth.setSession({
    access_token,
    refresh_token,
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const session: SessionInfo = {
    user_id: user.id,
    email: user.email ?? undefined,
    access_token,
    refresh_token,
  };

  await SecureStore.setItemAsync(
    SESSION_KEY,
    JSON.stringify(session)
  );

  return session;
}

export async function restoreSession(): Promise<SessionInfo | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;

  const session = JSON.parse(raw) as SessionInfo;

  await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });

  return session;
}

export async function clearSession() {
  await supabase.auth.signOut();
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
