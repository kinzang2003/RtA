import { Stack, useRouter } from "expo-router";
import { ActivityIndicator } from "react-native";
import { useEffect, useRef } from "react";

import { View } from "@/components/Themed";
import { useAuthStatus } from "@/lib/auth-store";

export default function PublicLayout() {
  const { user, authReady } = useAuthStatus();
  const router = useRouter();
  const didRedirectRef = useRef(false);

  useEffect(() => {
    if (!authReady) return;
    if (!user) return;
    if (didRedirectRef.current) return;
    didRedirectRef.current = true;
    router.replace("/(app)/(tabs)/recents");
  }, [authReady, user, router]);

  // Keep public area stable until auth restores.
  if (!authReady) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-black">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // If already logged in, never show welcome/auth screens.
  if (user) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-black">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
