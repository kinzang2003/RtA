import React, { useEffect, useRef, useState } from "react";
import {
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, View } from "@/components/Themed";
import Feather from "@expo/vector-icons/Feather";
import { supabase } from "@/lib/supabase";
import { useAuthUser } from "@/lib/auth-store";
import { clearSession } from "@/auth/index";
import { clearAllCache } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { useData } from "@/lib/data-provider";

export default function Profile() {
  const user = useAuthUser();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const mountedRef = useRef(true);
  const router = useRouter();
  const { themeMode, setTheme, colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Use global data - loads instantly!
  const { userProfile: profile, isLoadingProfile } = useData();

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Fail-safe: if user becomes null (SIGNED_OUT), leave protected tabs immediately.
  useEffect(() => {
    if (user === null) {
      router.replace("/");
    }
  }, [user, router]);

  const logout = async () => {
    try {
      setLogoutLoading(true);

      // Clear session (optimistic signOut updates UI immediately)
      await clearSession();

      // Navigate away ASAP; do not block on cache IO.
      router.replace("/");

      // Best-effort cleanup in background (DataProvider also clears on logout)
      void clearAllCache();
    } catch (e) {
      console.error("Logout failed:", e);
      // Even if logout fails, navigate away for security
      router.replace("/");
    } finally {
      if (mountedRef.current) setLogoutLoading(false);
    }
  };

  const handleThemeChange = async (theme: "light" | "dark" | "system") => {
    await setTheme(theme);
    setShowThemeModal(false);
  };

  const confirmDelete = async () => {
    try {
      // Request account deletion - sets deletion_requested_at timestamp
      // Scheduled for 30 days from now per Supabase best practice
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { error } = await supabase
        .from("profiles")
        .update({
          deletion_requested_at: new Date().toISOString(),
          deletion_scheduled_for: thirtyDaysFromNow.toISOString(),
        })
        .eq("id", user?.id);

      if (error) {
        console.error("Delete request failed:", error);
        Alert.alert(
          "Deletion Request Failed",
          "We couldn't process your request. Please try again."
        );
        return;
      }

      // Now log out and redirect
      setShowDeleteModal(false);
      await logout();
    } catch (error) {
      console.error("Delete account error:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    }
  };

  // Show full-screen loading only before the first successful load
  if (!profile) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-black">
        <ActivityIndicator
          size="large"
          color={colorScheme === "dark" ? "#fff" : "#000"}
        />
        <Text className="mt-4 text-gray-700 dark:text-gray-300">
          Loading profile...
        </Text>
      </View>
    );
  }

  const themeOptions = [
    { value: "light", label: "Light", icon: "sun" },
    { value: "dark", label: "Dark", icon: "moon" },
    { value: "system", label: "System", icon: "smartphone" },
  ] as const;

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1 px-6"
        style={{ paddingTop: insets.top + 24 }}
      >
        <Text className="text-3xl font-semibold mb-6">
          Profile
        </Text>

        {/* Profile Card */}
        <View className="mb-6 p-4 rounded-xl border border-neutral-200 dark:border-white/10">
          <View className="flex-row items-center mb-4">
            <View className="w-16 h-16 rounded-full mr-3 justify-center items-center overflow-hidden">
              {profile.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  className="w-16 h-16"
                  resizeMode="cover"
                />
              ) : (
                <Feather
                  name="user"
                  size={32}
                  color={colorScheme === "dark" ? "#fff" : "#000"}
                />
              )}
            </View>
            <View className="flex-1">
              <Text className="text-sm mb-1" lightColor="#6B7280" darkColor="#9CA3AF">
                Full Name
              </Text>
              <Text className="text-base font-semibold">
                {profile.full_name || "N/A"}
              </Text>
            </View>
          </View>

          <View className="mb-3">
            <Text className="text-sm mb-1" lightColor="#6B7280" darkColor="#9CA3AF">
              Email
            </Text>
            <Text className="text-base">
              {profile.email}
            </Text>
          </View>
        </View>

        {/* Settings Section */}
        <View className="mb-6">
          <Text className="text-lg font-semibold mb-3">
            Settings
          </Text>

          {/* Theme Selector */}
          <TouchableOpacity
            className="flex-row items-center justify-between p-4 mb-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
            onPress={() => setShowThemeModal(true)}
          >
            <View className="flex-row items-center" lightColor="transparent" darkColor="transparent">
              <Feather
                name={themeMode === "light" ? "sun" : themeMode === "dark" ? "moon" : "smartphone"}
                size={20}
                color={colorScheme === "dark" ? "#fff" : "#000"}
              />
              <Text className="ml-3 text-base">
                Theme
              </Text>
            </View>
            <View className="flex-row items-center" lightColor="transparent" darkColor="transparent">
              <Text className="text-sm mr-2 capitalize" lightColor="#6B7280" darkColor="#9CA3AF">
                {themeMode}
              </Text>
              <Feather name="chevron-right" size={18} color="#9CA3AF"/>
            </View>
          </TouchableOpacity>

          {/* Password Reset */}
          <TouchableOpacity
            className="flex-row items-center justify-between p-4 mb-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
            onPress={() => router.push("/security")}
          >
            <View className="flex-row items-center" lightColor="transparent" darkColor="transparent">
              <Feather
                name="lock"
                size={20}
                color={colorScheme === "dark" ? "#fff" : "#000"}
              />
              <Text className="ml-3 text-base">
                Password & Security
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Feedback */}
          <TouchableOpacity
            className="flex-row items-center justify-between p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
            onPress={() => router.push("/feedback")}
          >
            <View className="flex-row items-center" lightColor="transparent" darkColor="transparent">
              <Feather
                name="message-circle"
                size={20}
                color={colorScheme === "dark" ? "#fff" : "#000"}
              />
              <Text className="ml-3 text-base">
                Send Feedback
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Actions Section */}
        <View className="mb-6">
          <TouchableOpacity
            className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 p-4 rounded-xl items-center mb-4"
            onPress={logout}
            disabled={logoutLoading}
          >
            {logoutLoading ? (
              <ActivityIndicator size="small" color={colorScheme === "dark" ? "#fff" : "#000"} />
            ) : (
              <Text className="font-semibold">
                Sign Out
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 p-4 rounded-xl items-center"
            onPress={() => setShowDeleteModal(true)}
          >
            <Text className="font-semibold" lightColor="#dc2626" darkColor="#f87171">
              Deactivate Account
            </Text>
          </TouchableOpacity>
        </View>

        <View className="pb-32" />
      </ScrollView>

      {/* Theme Selection Modal */}
      <Modal animationType="fade" transparent visible={showThemeModal}>
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center"
          onPress={() => setShowThemeModal(false)}
        >
          <Pressable className="p-6 rounded-2xl mx-4 w-[90%] max-w-sm bg-white dark:bg-neutral-900">
            <Text className="text-xl font-bold text-center mb-6">
              Choose Theme
            </Text>

            {themeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                className={`flex-row items-center justify-between p-4 mb-3 rounded-lg ${
                  themeMode === option.value
                    ? "bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500"
                    : "bg-neutral-50 dark:bg-neutral-800"
                }`}
                onPress={() => handleThemeChange(option.value)}
              >
                <View className="flex-row items-center" lightColor="transparent" darkColor="transparent">
                  <Feather
                    name={option.icon}
                    size={20}
                    color={themeMode === option.value ? "#3B82F6" : (colorScheme === "dark" ? "#fff" : "#000")}
                  />
                  <Text
                    className="ml-3 text-base"
                    lightColor={themeMode === option.value ? "#2563eb" : "#000"}
                    darkColor={themeMode === option.value ? "#60a5fa" : "#fff"}
                  >
                    {option.label}
                  </Text>
                </View>
                {themeMode === option.value && (
                  <Feather name="check" size={20} color="#3B82F6" />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              className="mt-4 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg"
              onPress={() => setShowThemeModal(false)}
            >
              <Text className="text-center font-semibold text-black dark:text-white">
                Cancel
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal animationType="fade" transparent visible={showDeleteModal}>
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center"
          onPress={() => setShowDeleteModal(false)}
        >
          <Pressable className="p-6 rounded-2xl mx-4 w-[90%] max-w-sm bg-white dark:bg-neutral-900">
            <Text className="text-xl font-bold text-center mb-4">
              Deactivate Account?
            </Text>
            <Text className="text-center text-sm mb-4" lightColor="#6B7280" darkColor="#9CA3AF">
              Your account will be scheduled for permanent deletion in 30 days.{"\n\n"}
              You can cancel this at any time by simply logging back in before the 30 days are up.{"\n\n"}
              After 30 days, your account and all associated data will be permanently deleted.
            </Text>

            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg"
                onPress={() => setShowDeleteModal(false)}
              >
                <Text className="text-center font-semibold">Not now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-red-500 dark:bg-red-700 p-4 rounded-lg"
                onPress={confirmDelete}
              >
                <Text className="text-center font-semibold text-white">
                  Deactivate
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
