// rtastudio/app/auth/index.tsx

import { ActivityIndicator } from "react-native";
import { View } from "@/components/Themed";

export default function AuthGate() {
  return (
    <View className="flex-1 justify-center items-center bg-white dark:bg-black">
      <ActivityIndicator />
    </View>
  );
}
