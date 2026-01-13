import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";

export default function TabLayout() {
  const { colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === "dark";

  return (
    <Tabs
      initialRouteName="recents"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#b91c1c",
        tabBarInactiveTintColor: isDark ? "#999" : "#555",

        tabBarStyle: {
          backgroundColor: isDark ? "#0d0d0d" : "#ffffff",
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          borderTopWidth: 0,
        },

        tabBarIcon: ({ color, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case "recents":
              iconName = focused ? "time" : "time-outline";
              break;
            case "search":
              iconName = focused ? "search" : "search-outline";
              break;
            case "explore":
              iconName = focused ? "compass" : "compass-outline";
              break;
            case "profile":
              iconName = focused ? "person" : "person-outline";
              break;
            default:
              iconName = "ellipse-outline";
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="recents" options={{ title: "Recents" }} />
      <Tabs.Screen name="search" options={{ title: "Search" }} />
      <Tabs.Screen name="explore" options={{ title: "Explore" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
