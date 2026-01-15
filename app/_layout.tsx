// rtastudio/app/_layout.tsx
import { Stack, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  View,
  BackHandler,
  Alert,
  Platform,
  Text,
  Pressable,
} from "react-native";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import { useAuthStatus } from "@/lib/auth-store";
import { logger } from "@/lib/logger";
import { handleAuthRedirectUrl } from "@/lib/auth-redirect";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  ThemeProvider as NavigationThemeProvider,
  DarkTheme,
  DefaultTheme,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";

import "./globals.css";
import { useTheme, ThemeProvider as AppThemeProvider } from "@/lib/theme";
import { DataProvider } from "@/lib/data-provider";

// Keep splash visible until auth is resolved
SplashScreen.preventAutoHideAsync();

// In production, avoid noisy logs/warnings in user builds.
// Keep console.error for crash diagnostics.
if (typeof __DEV__ !== "undefined" && !__DEV__) {
  try {
    // eslint-disable-next-line no-console
    console.log = () => {};
    // eslint-disable-next-line no-console
    console.info = () => {};
    // eslint-disable-next-line no-console
    console.debug = () => {};
  } catch {
    // ignore
  }
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootLayoutInner />
    </AppThemeProvider>
  );
}

function RootLayoutInner() {
  const { colorScheme } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [startupTimedOut, setStartupTimedOut] = useState(false);
  const { user, authReady } = useAuthStatus();
  const segments = useSegments() as string[];

  const missingEnvVars: string[] = [];
  if (!process.env.EXPO_PUBLIC_SUPABASE_URL) missingEnvVars.push("EXPO_PUBLIC_SUPABASE_URL");
  if (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) missingEnvVars.push("EXPO_PUBLIC_SUPABASE_ANON_KEY");

  const restartApp = async () => {
    if (Platform.OS === "android") {
      BackHandler.exitApp();
      return;
    }

    Alert.alert("Restart required", "Please fully close and reopen the app.");
  };

  // 1️⃣ Initialize: kick off any non-auth startup work
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Prefetch textiles (no auth required) for instant load in Explore
        void prefetchTextiles();
      } catch (error) {
        logger.error("[RootLayout] Init error", error);
      } finally {
        if (mounted) setIsReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Hide splash once startup work + auth restoration are done
  useEffect(() => {
    if (!isReady || !authReady) return;
    SplashScreen.hideAsync().catch(() => {
      // noop: avoid crashing on repeated calls
    });
  }, [isReady, authReady]);

  // If critical env vars are missing, unblock UI and show a clear error.
  useEffect(() => {
    if (missingEnvVars.length === 0) return;
    SplashScreen.hideAsync().catch(() => {
      // noop
    });
  }, [missingEnvVars.length]);

  // Production safety: never block the app indefinitely behind the splash screen
  // if session restoration stalls (device storage quirks, edge-case native issues, etc.).
  useEffect(() => {
    if (!isReady) return;
    if (authReady) return;

    const timer = setTimeout(() => {
      setStartupTimedOut(true);
      SplashScreen.hideAsync().catch(() => {
        // noop
      });
    }, 12000);

    return () => clearTimeout(timer);
  }, [isReady, authReady]);

  // 2️⃣ Handle deep link OAuth redirects (rtastudio-app://auth?access_token=...&refresh_token=...)
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;

      // Handle PKCE code redirects (preferred) and avoid reading tokens from URL.
      // Expected: rtastudio-app://auth?code=...&redirect_to=...
      
      if (!url.includes("rtastudio-app://auth")) return;

      try {
        await handleAuthRedirectUrl(url);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Authentication failed";
        logger.error("[DeepLink] Auth redirect failed", e);
        Alert.alert("Authentication Error", msg);
      }
    };

    // Listen for deep link when app is already open
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => subscription.remove();
  }, []);

  // 3️⃣ On login, cancel pending deletion (real-world: small post-login side effect)
  useEffect(() => {
    if (!authReady || !user) return;

    (async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("deletion_scheduled_for, deletion_requested_at")
          .eq("id", user.id)
          .single();

        if (profile?.deletion_scheduled_for) {
          await supabase
            .from("profiles")
            .update({
              deletion_requested_at: null,
              deletion_scheduled_for: null,
            })
            .eq("id", user.id);

          setTimeout(() => {
            Alert.alert(
              "Welcome back!",
              "Your account deactivation has been cancelled."
            );
          }, 1000);
        }
      } catch (error) {
        logger.warn("[RootLayout] Failed to check deletion status", error);
      }
    })();
  }, [authReady, user]);

  // 4️⃣ Navigation gating is handled by route groups:
  // - `app/(public)/_layout.tsx` (welcome + auth)
  // - `app/(app)/_layout.tsx` (protected stack + tabs)

  // 5️⃣ Android back button: show exit dialog on root screens
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        // Tabs now live under `(app)/(tabs)`.
        const isRootScreen =
          segments[0] === "(app)" && segments[1] === "(tabs)" && segments.length === 3;

        if (isRootScreen) {
          Alert.alert(
            "Exit App",
            "Are you sure you want to exit?",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Exit", onPress: () => BackHandler.exitApp() },
            ],
            { cancelable: true }
          );
          return true; // Prevent default back action
        }

        return false; // Allow default back navigation
      }
    );

    return () => backHandler.remove();
  }, [segments]);

  if (missingEnvVars.length > 0) {
    const showDiagnostics = typeof __DEV__ !== "undefined" && __DEV__;
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
          backgroundColor: colorScheme === "dark" ? "#000" : "#fff",
        }}
      >
        <Text
          style={{
            color: colorScheme === "dark" ? "#fff" : "#000",
            fontSize: 16,
            fontWeight: "700",
            textAlign: "center",
            marginBottom: 10,
            maxWidth: 520,
          }}
        >
          App configuration error
        </Text>
        <Text
          style={{
            color: colorScheme === "dark" ? "#ddd" : "#333",
            fontSize: 13,
            textAlign: "center",
            maxWidth: 520,
            lineHeight: 18,
          }}
        >
          There’s a configuration problem with this build.
        </Text>
        <View style={{ height: 8 }} />
        <Text
          style={{
            color: colorScheme === "dark" ? "#aaa" : "#555",
            fontSize: 12,
            textAlign: "center",
            maxWidth: 520,
          }}
        >
          Error code: CONFIG_MISSING
        </Text>

        {showDiagnostics ? (
          <>
            <View style={{ height: 10 }} />
            <Text
              style={{
                color: colorScheme === "dark" ? "#aaa" : "#555",
                fontSize: 12,
                textAlign: "center",
                maxWidth: 520,
              }}
            >
              Missing: {missingEnvVars.join(", ")}
            </Text>
          </>
        ) : null}

        <View style={{ height: 16 }} />
        <Pressable
          onPress={restartApp}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 8,
            backgroundColor: colorScheme === "dark" ? "#222" : "#eee",
          }}
        >
          <Text style={{ color: colorScheme === "dark" ? "#fff" : "#000" }}>
            Restart app
          </Text>
        </Pressable>
      </View>
    );
  }

  // Show loading splash while initializing
  if (!isReady || !authReady) {
    if (startupTimedOut) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
            backgroundColor: colorScheme === "dark" ? "#000" : "#fff",
          }}
        >
          <ActivityIndicator
            size="large"
            color={colorScheme === "dark" ? "#fff" : "#000"}
          />
          <View style={{ height: 16 }} />
          <Text
            style={{
              color: colorScheme === "dark" ? "#fff" : "#000",
              fontSize: 16,
              fontWeight: "600",
              textAlign: "center",
              marginBottom: 8,
              maxWidth: 520,
            }}
          >
            Startup is taking longer than expected
          </Text>
          <Text
            style={{
              color: colorScheme === "dark" ? "#ddd" : "#333",
              fontSize: 13,
              textAlign: "center",
              maxWidth: 520,
              lineHeight: 18,
            }}
          >
            Please try restarting the app. If it keeps happening, contact support with code STARTUP_TIMEOUT.
          </Text>

          <View style={{ height: 16 }} />
          <Pressable
            onPress={() => {
              void restartApp();
            }}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 8,
              backgroundColor: colorScheme === "dark" ? "#222" : "#eee",
            }}
          >
            <Text style={{ color: colorScheme === "dark" ? "#fff" : "#000" }}>
              Restart app
            </Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colorScheme === "dark" ? "#000" : "#fff" }}>
        <ActivityIndicator size="large" color={colorScheme === "dark" ? "#fff" : "#000"} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <DataProvider>
            <StatusBar 
              style={colorScheme === "dark" ? "light" : "dark"} 
              backgroundColor={colorScheme === "dark" ? "#000000" : "#ffffff"}
            />
            <Stack screenOptions={{ headerShown: false }} />
          </DataProvider>
        </NavigationThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// 🎯 Prefetch textiles for Explore tab (cache in AsyncStorage)
async function prefetchTextiles() {
  try {
    const { fetchTextiles, prefetchDzongkhagMapImages } = await import("@/lib/api");
    // This will use cache-first strategy and fetch in background if needed
    await fetchTextiles();
    logger.debug("[Textiles] Prefetched successfully");

    // Warm up Bhutan map textile images too (public bucket)
    void prefetchDzongkhagMapImages();
  } catch (error) {
    logger.warn("[Textiles] Prefetch error", error);
  }
}
