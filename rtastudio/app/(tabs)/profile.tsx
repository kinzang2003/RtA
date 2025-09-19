import React, { useEffect, useState } from "react";
import {
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Feather from "@expo/vector-icons/Feather";
import { Text, View } from "@/components/Themed";
import { useColorScheme } from "nativewind";
import { supabase } from "@/supabase";

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadProfile = async () => {
      const stored = await AsyncStorage.getItem("userProfile");
      if (stored) setProfile(JSON.parse(stored));

      setSessions([
        { deviceName: "iPhone 14 Pro", ipAddress: "192.168.1.5" },
        { deviceName: "Chrome on MacBook", ipAddress: "192.168.1.10" },
        { deviceName: "Android Device", ipAddress: "192.168.1.15" },
      ]);
    };
    loadProfile();
  }, []);

  const logout = async () => {
    try {
      // All the keys you used in LoginScreen
      const keys = [
        "supabaseSession",
        "authToken",
        "userProfile",
        "ownedProjects",
        "invitedProjects",
        "projectIds",
      ];

      // Clear them in parallel
      await AsyncStorage.multiRemove(keys);

      // Optional: sign out from Supabase server-side
      await supabase.auth.signOut();

      // Navigate back to login
      router.replace("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const confirmDelete = () => {
    console.log("Deleting account...");
    setShowDeleteModal(false);
    logout();
  };

  if (!profile) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-black">
        <ActivityIndicator
          size="large"
          color={colorScheme === "dark" ? "white" : "black"}
        />
        <Text className="mt-4 text-gray-700 dark:text-gray-300">
          Loading profile...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1 px-6"
        style={{ paddingTop: insets.top + 24 }}
      >
        <Text className="text-3xl font-semibold text-black dark:text-white">
          Profile
        </Text>

        <View className="mb-6 p-4 rounded-lg">
          <View className="flex-row items-center mb-4">
            <View className="w-16 h-16 rounded-full mr-3 justify-center items-center">
              <Feather
                name="user"
                size={32}
                color={colorScheme === "dark" ? "#fff" : "#000"}
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Full Name
              </Text>
              <Text className="text-base text-black dark:text-white">
                {profile.full_name}
              </Text>
            </View>
          </View>

          <View className="mb-3">
            <Text className="text-sm mb-1">Email</Text>
            <Text className="text-base text-black dark:text-white">
              {profile.email}
            </Text>
          </View>

          <TouchableOpacity className="flex-row items-center mt-2 bg-transparent">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              Forgot password?{" "}
            </Text>
            <Text className="text-red-500 dark:text-red-300 underline">
              reset
            </Text>
          </TouchableOpacity>
        </View>

        {/* Signed In Devices Section */}
        <View className="mb-6 p-4 rounded-lg bg-white dark:bg-gray-800">
          <View className="flex-row justify-between items-center mb-4 bg-transparent">
            <Text className="text-lg font-semibold text-black dark:text-white">
              Signed In Devices
            </Text>
            <TouchableOpacity
              onPress={logout}
              className="bg-gray-200 dark:bg-placeholder p-2 rounded"
            >
              <Text className="text-blue-500 dark:text-blue-300 text-sm">
                Sign Out of All...
              </Text>
            </TouchableOpacity>
          </View>

          {sessions.map((device, index) => (
            <View
              key={index}
              className="flex-row justify-between items-center mb-4 bg-transparent"
            >
              <View className="flex-1 bg-transparent">
                <View className="flex-row items-center mb-1 bg-transparent">
                  <View
                    className={`w-2 h-2 rounded-full mr-2 ${
                      index === 0
                        ? "bg-green-500"
                        : "bg-gray-400 dark:bg-gray-500"
                    }`}
                  />
                  <Text className="text-base text-black dark:text-white">
                    {device.deviceName}
                  </Text>
                </View>
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {device.ipAddress}
                </Text>
              </View>
              <TouchableOpacity
                className="py-2 px-4 rounded-md bg-gray-200 dark:bg-placeholder"
                onPress={logout}
              >
                <Text className="text-sm text-black dark:text-white">
                  Sign out
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Action Buttons Section */}
        <View className="p-4 pb-32 bg-transparent">
          <TouchableOpacity
            className="bg-red-200 dark:bg-red-700 border border-red-500  p-4 rounded-lg items-center mb-6"
            onPress={() => setShowDeleteModal(true)}
          >
            <Text lightColor="#ef4444" className="font-semibold">
              Delete Account
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-gray-200 dark:bg-placeholder border border-gray-900 dark:border-gray-300 p-4 rounded-lg items-center"
            onPress={() =>
              router.push({
                pathname: "/feedback",
                params: { email: profile?.email, id: profile?.id },
              })
            }
          >
            <Text className="font-semibold">Provide Feedback</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Delete Account Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDeleteModal}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center"
          onPress={() => setShowDeleteModal(false)}
        >
          <Pressable className="p-6 rounded-2xl mx-4 w-[90%] max-w-sm bg-white dark:bg-[#1F1F1F]">
            <Text className="text-xl font-bold text-center mb-4">
              Delete Account?
            </Text>
            <Text className="text-center mb-6">
              Are you sure you want to delete your account? This action cannot
              be undone.
            </Text>
            <View
              className="flex-row space-x-3"
              lightColor="background: transparent"
              darkColor="background: transparent"
            >
              <TouchableOpacity
                className="flex-1 p-4 bg-gray-100 dark:bg-[#2C2C2C] rounded-lg"
                onPress={() => setShowDeleteModal(false)}
              >
                <Text className="text-center font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-red-500 dark:bg-red-700 p-4 rounded-lg"
                onPress={confirmDelete}
              >
                <Text className="text-center font-semibold" lightColor="#fff">
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
