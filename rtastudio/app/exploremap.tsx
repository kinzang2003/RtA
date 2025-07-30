import { View } from "@/components/Themed";
import BhutanMap from "@/components/BhutanMap";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";

export default function TabTwoScreen() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();

  return (
    <View
      className="flex-1 bg-gray-100 dark:bg-gray-900" // Consistent background
      style={{ paddingTop: insets.top + 24 }} // Consistent top padding
    >
      <BhutanMap />
    </View>
  );
}
