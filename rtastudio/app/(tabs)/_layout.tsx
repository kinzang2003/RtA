import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, Tabs } from "expo-router";
import { Pressable } from "react-native";
import Feather from "@expo/vector-icons/Feather";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";

/**
 * TabBarIcon component for displaying icons in the tab bar.
 * Uses Ionicons for a thinner, outlined appearance.
 * @param props - Contains the icon name and color.
 */
function TabBarIcon(props: {
  // Use React.ComponentProps<typeof Ionicons>['name'] for Ionicons' name type
  name: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
}) {
  // Render Ionicons component
  return <Ionicons size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        // Set the active tint color to red (#b91c1c)
        tabBarActiveTintColor: "#b91c1c",
        // Disable the static render of the header on web to prevent hydration errors
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      {/* Recents Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Recents",
          // Use 'time-outline' for a thinner history/recents icon
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="time-outline" color={color} />
          ),
          headerShown: false, // Hide header for this screen
        }}
      />
      {/* Search Tab */}
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          // Use 'search-outline' for a thinner search icon
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="search-outline" color={color} />
          ),
          headerShown: false, // Hide header for this screen
        }}
      />
      {/* Explore Tab */}
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          // Use 'compass-outline' for a thinner explore/compass icon
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="compass-outline" color={color} />
          ),
          headerShown: false, // Hide header for this screen
        }}
      />
      {/* Profile Tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          // Use the Feather icon for the profile tab
          tabBarIcon: ({ color }) => (
            <Feather
              name="user"
              size={24}
              style={{ marginBottom: -3 }}
              color={color}
            />
          ),
          headerShown: false, // Hide header for this screen
        }}
      />
    </Tabs>
  );
}
