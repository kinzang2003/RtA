// rtastudio/app/_layout.tsx
import { Stack, router, usePathname, useSegments, useRootNavigationState } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, BackHandler, Alert, Platform } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import { useAuthStatus } from "@/lib/auth-store";

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
  const { user, authReady } = useAuthStatus();
  const segments = useSegments();
  const pathname = usePathname();
  const navigationState = useRootNavigationState();

  // 1️⃣ Initialize: kick off any non-auth startup work
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Prefetch textiles (no auth required) for instant load in Explore
        void prefetchTextiles();
      } catch (error) {
        console.error("[RootLayout] Init error:", error);
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

  // 2️⃣ Handle deep link OAuth redirects (rtastudio-app://auth?access_token=...&refresh_token=...)
  useEffect(() => {
    const sanitizeUrl = (rawUrl: string) => {
      try {
        const [base, query] = rawUrl.split("?");
        if (!query) return base;
        const params = new URLSearchParams(query);
        for (const key of ["access_token", "refresh_token"]) {
          if (params.has(key)) params.set(key, "***");
        }
        return `${base}?${params.toString()}`;
      } catch {
        return rawUrl.split("?")[0] ?? rawUrl;
      }
    };

    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      console.log("[DeepLink] Received:", sanitizeUrl(url));
      
      if (url.includes("rtastudio-app://auth")) {
        const params = new URLSearchParams(url.split("?")[1] || "");
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        
        if (access_token && refresh_token) {
          console.log("[DeepLink] Setting session from OAuth redirect");
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            
            console.log("[DeepLink] setSession returned", { hasError: !!error });
            
            if (error) {
              console.error("[DeepLink] Session error:", error);
              Alert.alert("Authentication Error", error.message);
            } else {
              console.log("[DeepLink] Session set successfully for:", data.user?.email);
              
              // Let auth-store + DataProvider react to SIGNED_IN.
            }
          } catch (e) {
            console.error("[DeepLink] OUTER CATCH - Failed to set session:", e);
            console.error("[DeepLink] Error stack:", (e as any)?.stack);
          }
        }
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
        console.error("[RootLayout] Failed to check deletion status:", error);
      }
    })();
  }, [authReady, user]);

  // 4️⃣ Navigate to correct screen once ready (avoid welcome screen flash)
  useEffect(() => {
    if (!isReady || !authReady || !navigationState?.key) return;

    // Use pathname (more reliable than segment heuristics across nested layouts)
    const isWelcome = pathname === "/" || pathname === "" || pathname === "/index";
    const isAuthGate = pathname === "/auth" || pathname.startsWith("/auth/");

    if (user) {
      // Logged in but on welcome/auth → skip to tabs
      if (isWelcome || isAuthGate) {
        router.replace("/(tabs)");
      }
      return;
    }

    // Logged out → always force to welcome unless already there.
    // This avoids edge cases like being on /security (which is not under (tabs)).
    if (!isWelcome) {
      // If a modal is open, dismiss it first so the UI can't get stuck.
      try {
        (router as any).dismissAll?.();
      } catch {
        // ignore
      }
      router.replace("/");
    }
  }, [isReady, authReady, user, pathname, navigationState?.key]);

  // 5️⃣ Android back button: show exit dialog on root screens
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        const isRootScreen =
          segments[0] === "(tabs)" && segments.length === 1;

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

  // Show loading splash while initializing
  if (!isReady || !authReady) {
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
    const { fetchTextiles } = await import("@/lib/api");
    // This will use cache-first strategy and fetch in background if needed
    await fetchTextiles();
    console.log("[Textiles] Prefetched successfully");
  } catch (error) {
    console.error("[Textiles] Prefetch error:", error);
  }
}
