// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useColorScheme } from "nativewind";

export default function TabLayout() {
  const { colorScheme } = useColorScheme();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 0,
          backgroundColor: colorScheme === "dark" ? "#111" : "#fff",
        },
        tabBarIcon: ({ color, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "ellipse";

          if (route.name === "index") {
            iconName = focused ? "time" : "time-outline"; // Recents
          } else if (route.name === "search") {
            iconName = focused ? "search" : "search-outline"; // Search
          } else if (route.name === "explore") {
            iconName = focused ? "compass" : "compass-outline"; // Explore
          } else if (route.name === "profile") {
            iconName = focused ? "person" : "person-outline"; // Profile
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: "#b91c1c", // red-700
        tabBarInactiveTintColor: colorScheme === "dark" ? "#aaa" : "#444",
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Recents" }} />
      <Tabs.Screen name="search" options={{ title: "Search" }} />
      <Tabs.Screen name="explore" options={{ title: "Explore" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
