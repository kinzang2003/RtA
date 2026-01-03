// rtastudio/app/auth/index.tsx

import { useEffect } from "react";
import { ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { restoreSession } from "@/auth";
import { View } from "@/components/Themed";

export default function AuthGate() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const session = await restoreSession();

      if (session) {
        router.replace("/(tabs)");
      } else {
        router.replace("/");
      }
    })();
  }, []);

  return (
    <View className="flex-1 justify-center items-center bg-white dark:bg-black">
      <ActivityIndicator />
    </View>
  );
}
