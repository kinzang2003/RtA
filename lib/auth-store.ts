import { useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

let cachedUser: User | null = null;
let listeners = new Set<(user: User | null) => void>();
let readyListeners = new Set<(ready: boolean) => void>();
let authReady = false;
let lastAuthEvent: string | null = null;
let lastAuthUserId: string | null = null;

let initPromise: Promise<void> | null = null;

function ensureInitialized(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Initial load (app start / reload)
    try {
      const { data } = await supabase.auth.getSession();
      cachedUser = data.session?.user ?? null;
      logger.info("[AuthStore] Initial session restored", {
        userId: cachedUser?.id ?? null,
      });
      notify(cachedUser);
    } finally {
      if (!authReady) {
        authReady = true;
        notifyReady(authReady);
      }
    }

    // Subscribe to auth changes (exactly once for the whole app)
    supabase.auth.onAuthStateChange((event, session: Session | null) => {
      const newUserId = session?.user?.id ?? null;

      // DEDUPLICATE: Ignore duplicate INITIAL_SESSION events
      // (getSession() fires it, then listener fires it again)
      if (event === "INITIAL_SESSION") {
        if (lastAuthEvent === "INITIAL_SESSION" && lastAuthUserId === newUserId) {
          logger.debug("[AuthStore] Ignoring duplicate INITIAL_SESSION", { userId: newUserId });
          return;
        }
      }

      lastAuthEvent = event;
      lastAuthUserId = newUserId;

      cachedUser = session?.user ?? null;
      logger.info("[AuthStore] Auth state changed", {
        event,
        userId: cachedUser?.id ?? null,
      });
      notify(cachedUser);
      if (!authReady) {
        authReady = true;
        notifyReady(authReady);
      }
    });
  })();

  return initPromise;
}

function notify(user: User | null) {
  listeners.forEach((fn) => fn(user));
}

function notifyReady(ready: boolean) {
  readyListeners.forEach((fn) => fn(ready));
}

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(cachedUser);

  useEffect(() => {
    listeners.add(setUser);
    return () => {
      listeners.delete(setUser);
    };
  }, []);

  useEffect(() => {
    void ensureInitialized();
  }, []);

  return user;
}

/**
 * Hook to get both the current user and whether the auth system
 * has completed initial session restoration. Use this to avoid
 * race conditions where user might still be null during app init.
 */
export function useAuthStatus() {
  const [user, setUser] = useState<User | null>(cachedUser);
  const [ready, setReady] = useState<boolean>(authReady);

  useEffect(() => {
    listeners.add(setUser);
    readyListeners.add(setReady);
    return () => {
      listeners.delete(setUser);
      readyListeners.delete(setReady);
    };
  }, []);

  useEffect(() => {
    void ensureInitialized();
  }, []);

  return { user, authReady: ready };
}

/**
 * Real-world logout behavior: update app state immediately (optimistic) so the UI
 * can navigate away from protected routes without waiting on async signOut.
 */
export async function signOut(): Promise<void> {
  // Optimistically mark signed out
  cachedUser = null;
  notify(cachedUser);
  if (!authReady) {
    authReady = true;
    notifyReady(authReady);
  }

  try {
    await ensureInitialized();
    await supabase.auth.signOut();
  } finally {
    // Ensure state is consistent even if signOut throws.
    cachedUser = null;
    notify(cachedUser);
  }
}
