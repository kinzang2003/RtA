import { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { View } from "@/components/Themed";
import { openWebLogin } from "@/auth";
import { logger } from "@/lib/logger";

type Mode = "signin" | "signup";

function normalizeMode(mode: unknown): Mode {
  return mode === "signup" ? "signup" : "signin";
}

// This route is intentionally a shim. The app uses the web auth UI (Secure Browser)
// for both email/password and Google. Keeping this file prevents stale links
// from breaking, without introducing a new native UI.
export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mode = useMemo(() => normalizeMode(params.mode), [params.mode]);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const session = await openWebLogin(mode);
        if (!session) {
          router.replace("/");
        }
        // If session exists, RootLayout will route to /(tabs)
      } catch (e) {
        logger.error("[AuthShim] Failed to open web login", e);
        router.replace("/");
      }
    })();
  }, [mode, router]);

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-black">
      <ActivityIndicator size="large" />
    </View>
  );
}
