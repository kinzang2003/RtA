// rtastudio/app/_layout.tsx
import { Stack, router, useSegments, useRootNavigationState } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, BackHandler, Alert, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import { supabase } from "@/lib/supabase";
import { SessionInfo, restoreSession } from "@/auth/index";

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
  const [session, setSession] = useState<SessionInfo | null>(null);
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  // 1️⃣ Initialize: restore session + prefetch textiles
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Restore session from SecureStore
        const restoredSession = await restoreSession();
        if (mounted) {
          setSession(restoredSession);
        }

        // Prefetch textiles (no auth required) for instant load in Explore
        prefetchTextiles();
      } catch (error) {
        console.error("[RootLayout] Init error:", error);
      } finally {
        if (mounted) {
          setIsReady(true);
          await SplashScreen.hideAsync();
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // 2️⃣ Listen to auth state changes (login/logout)
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (newSession) {
          const info: SessionInfo = {
            user_id: newSession.user.id,
            access_token: newSession.access_token,
            refresh_token: newSession.refresh_token,
            email: newSession.user.email ?? undefined,
            full_name:
              (newSession.user.user_metadata as any)?.full_name ?? undefined,
          };
          await SecureStore.setItemAsync("sb-session", JSON.stringify(info));
          setSession(info);

          // Check if account is scheduled for deletion and cancel it
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("deletion_scheduled_for, deletion_requested_at")
              .eq("id", newSession.user.id)
              .single();

            if (profile?.deletion_scheduled_for) {
              // Cancel deletion
              await supabase
                .from("profiles")
                .update({
                  deletion_requested_at: null,
                  deletion_scheduled_for: null,
                })
                .eq("id", newSession.user.id);

              // Show welcome back message
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
        } else {
          await SecureStore.deleteItemAsync("sb-session");
          setSession(null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // 3️⃣ Navigate to correct screen once ready (avoid welcome screen flash)
  useEffect(() => {
    if (!isReady || !navigationState?.key) return;

    const isWelcomeScreen = segments[0] === undefined || segments[0] === "";
    const isTabsScreen = segments[0] === "(tabs)";
    const isProjectScreen = segments[0] === "project";
    const isAuthScreen = segments[0] === "auth";
    const isFeedbackScreen = segments[0] === "feedback";
    const isProtectedRoute = isTabsScreen || isProjectScreen || isAuthScreen || isFeedbackScreen;

    if (session && isWelcomeScreen) {
      // Logged in but on welcome → skip to tabs
      router.replace("/(tabs)");
    } else if (!session && !isWelcomeScreen) {
      // Logged out and not on welcome → redirect to welcome
      router.replace("/");
    }
  }, [isReady, session, segments, navigationState?.key]);

  // 4️⃣ Android back button: show exit dialog on root screens
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
  if (!isReady) {
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
