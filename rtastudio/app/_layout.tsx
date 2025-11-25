import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect } from "react";
import "./globals.css";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import * as Linking from "expo-linking";
import { supabase } from "@/supabase";
import { AUTH_STORAGE_KEYS } from "@/utils/storageKeys";

import { useColorScheme } from "@/components/useColorScheme";

const ACCOUNT_HOLD_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;
let deletionNoticeShown = false;

SplashScreen.preventAutoHideAsync();

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const handleDeletionState = useCallback(
    async (profile?: {
      id?: string;
      deletion_requested_at?: string | null;
      deletion_scheduled_for?: string | null;
    }) => {
      if (!profile) {
        deletionNoticeShown = false;
        return true;
      }

      const requestedAt = profile.deletion_requested_at
        ? new Date(profile.deletion_requested_at)
        : null;
      const scheduledFor = profile.deletion_scheduled_for
        ? new Date(profile.deletion_scheduled_for)
        : requestedAt
          ? new Date(requestedAt.getTime() + ACCOUNT_HOLD_PERIOD_MS)
          : null;

      if (!requestedAt || !scheduledFor) {
        deletionNoticeShown = false;
        return true;
      }

      const scheduledMs = scheduledFor.getTime();
      const now = Date.now();

      if (scheduledMs <= now) {
        await AsyncStorage.multiRemove(AUTH_STORAGE_KEYS);
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.error(
            "Failed to sign out while enforcing deletion:",
            signOutError
          );
        }

        Toast.show({
          type: "info",
          text1: "Account deleted",
          text2:
            "Your deletion window expired. Contact support if you believe this is an error.",
          position: "bottom",
        });

        router.replace("/login");
        deletionNoticeShown = false;
        return false;
      }

      if (!deletionNoticeShown) {
        Toast.show({
          type: "info",
          text1: "Deletion scheduled",
          text2: `Your account will be deleted on ${scheduledFor.toLocaleString()}. Visit your profile to cancel before this date.`,
          position: "bottom",
        });
        deletionNoticeShown = true;
      }

      return true;
    },
    [router]
  );

  // Check for pending or expired deletion requests on launch
  useEffect(() => {
    const checkStoredProfile = async () => {
      try {
        const storedProfile = await AsyncStorage.getItem("userProfile");
        if (storedProfile) {
          const parsed = JSON.parse(storedProfile);
          await handleDeletionState(parsed);
        }
      } catch (err) {
        console.error(
          "Failed to parse stored profile for deletion state:",
          err
        );
      }
    };

    checkStoredProfile();
  }, [handleDeletionState]);

  // Handle deep linking for authentication
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const { url } = event;
      if (url.includes("auth")) {
        try {
          // Extract tokens from URL
          const urlObj = new URL(url);
          const accessToken = urlObj.searchParams.get("access_token");
          const refreshToken = urlObj.searchParams.get("refresh_token");

          if (accessToken && refreshToken) {
            // Set session in Supabase
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error("Error setting session:", error);
              Toast.show({
                type: "error",
                text1: "Authentication Failed",
                text2: "Failed to set session. Please try again.",
                position: "bottom",
              });
              return;
            }

            if (data.session && data.user) {
              try {
                // Save session data
                await AsyncStorage.setItem(
                  "supabaseSession",
                  JSON.stringify(data.session)
                );
                await AsyncStorage.setItem(
                  "authToken",
                  data.session.access_token
                );

                // Fetch and save user profile
                const { data: profile } = await supabase
                  .from("profiles")
                  .select(
                    "id, email, full_name, avatar_url, deletion_requested_at, deletion_scheduled_for"
                  )
                  .eq("id", data.user.id)
                  .single();

                if (profile) {
                  await AsyncStorage.setItem(
                    "userProfile",
                    JSON.stringify(profile)
                  );

                  const canProceed = await handleDeletionState(profile);
                  if (!canProceed) {
                    return;
                  }
                } else {
                  deletionNoticeShown = false;
                }

                // Fetch and save projects
                const { data: ownedProjects } = await supabase
                  .from("projects")
                  .select("id, name, description, created_at")
                  .eq("owner_id", data.user.id);

                const { data: collabProjects } = await supabase
                  .from("collaborators")
                  .select("projects(id, name, description, created_at), role")
                  .eq("user_id", data.user.id);

                const invitedProjects =
                  collabProjects
                    ?.filter((c) => c.role !== "owner")
                    .map((c) => ({
                      ...c.projects,
                      role: c.role,
                    })) || [];

                await AsyncStorage.setItem(
                  "ownedProjects",
                  JSON.stringify(ownedProjects || [])
                );
                await AsyncStorage.setItem(
                  "invitedProjects",
                  JSON.stringify(invitedProjects || [])
                );

                const combined = [...(ownedProjects || []), ...invitedProjects];
                await AsyncStorage.setItem(
                  "projectIds",
                  JSON.stringify(combined)
                );

                Toast.show({
                  type: "success",
                  text1: "Success",
                  text2: "Logged in successfully!",
                  position: "bottom",
                });

                // Navigate to main app
                setTimeout(() => {
                  router.replace("(tabs)");
                }, 100);
              } catch (storageError) {
                console.error(
                  "Error saving authentication data:",
                  storageError
                );
                Toast.show({
                  type: "error",
                  text1: "Storage Error",
                  text2: "Failed to save authentication data.",
                  position: "bottom",
                });
              }
            }
          }
        } catch (err) {
          console.error("Deep link handling error:", err);
          Toast.show({
            type: "error",
            text1: "Authentication Error",
            text2: "Something went wrong during authentication.",
            position: "bottom",
          });
        }
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Handle initial URL if app was opened from a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => subscription?.remove();
  }, [handleDeletionState]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("https://rta-server.onrender.com/api/textile");
        const data = await res.json();
        await AsyncStorage.setItem("textiles", JSON.stringify(data));
        console.log("Textiles prefetched and cached.");
      } catch (err) {
        console.error("Failed to preload textiles:", err);
      }
    })();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="feedback" options={{ headerShown: false }} />
            <Stack.Screen
              name="explore/[id]"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="project/[projectId]"
              options={{ headerShown: false }}
            />
            <Stack.Screen name="+not-found" options={{ title: "Oops!" }} />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
      <Toast />
    </GestureHandlerRootView>
  );
}
