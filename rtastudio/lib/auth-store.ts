import { useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

let cachedUser: User | null = null;
let listeners = new Set<(user: User | null) => void>();

function notify(user: User | null) {
  listeners.forEach((fn) => fn(user));
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
    let mounted = true;

    // Initial load (app start / reload)
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      cachedUser = data.session?.user ?? null;
      notify(cachedUser);
    });

    // Subscribe to auth changes
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session: Session | null) => {
        cachedUser = session?.user ?? null;
        notify(cachedUser);
      }
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return user;
}
