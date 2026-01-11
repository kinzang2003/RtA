// rtastudio/app/auth/index.tsx

import { useEffect } from "react";
import { ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStatus } from "@/lib/auth-store";
import { View } from "@/components/Themed";

export default function AuthGate() {
  const router = useRouter();
  const { user, authReady } = useAuthStatus();

  useEffect(() => {
    if (!authReady) return;
    router.replace(user ? "/(tabs)" : "/");
  }, [authReady, user, router]);

  return (
    <View className="flex-1 justify-center items-center bg-white dark:bg-black">
      <ActivityIndicator />
    </View>
  );
}
