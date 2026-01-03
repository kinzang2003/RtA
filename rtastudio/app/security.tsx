import React, { useState, useEffect } from "react";
import {
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { Text, View } from "@/components/Themed";
import { supabase } from "@/lib/supabase";
import { useAuthUser } from "@/lib/auth-store";
import { useTheme } from "@/lib/theme";
import { useData } from "@/lib/data-provider";

export default function SecurityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const { userProfile: profile } = useData();
  const user = useAuthUser();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Required", "Enter new password and confirmation.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Passwords don't match", "Make sure the new passwords match.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Too short", "Password must be at least 6 characters.");
      return;
    }

    try {
      setUpdating(true);

      // Update to the new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Success", "Your password has been updated.");
    } catch (error: any) {
      console.error("change password error", error);
      Alert.alert("Failed", error.message || "Could not change password.");
    } finally {
      setUpdating(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!profile?.email) {
      Alert.alert("Missing email", "We need your email to send reset instructions.");
      return;
    }

    try {
      setSendingReset(true);
      
      // Use the app's deep link scheme for the reset email
      // This way when user clicks the link, it opens in the mobile app context
      const redirectTo = Linking.createURL("/auth/reset-password");

      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo,
      });

      if (error) throw error;
      Alert.alert(
        "Check your email",
        "We've sent a secure link to reset your password. Click it to proceed in a secure browser."
      );
    } catch (error: any) {
      console.error("forgot password error", error);
      Alert.alert("Failed", error.message || "Could not send reset email.");
    } finally {
      setSendingReset(false);
    }
  };

  const handleEnable2FA = () => {
    Alert.alert(
      "2FA",
      "Two-factor authentication setup will be available soon. Use the web app if you need it right now."
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32 }}
      >
        <View className="flex-row items-center mb-4" lightColor="transparent" darkColor="transparent">
          <TouchableOpacity
            className="mr-3"
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Feather
              name="arrow-left"
              size={22}
              color={colorScheme === "dark" ? "#fff" : "#000"}
            />
          </TouchableOpacity>
          <Text className="text-2xl font-semibold">Security</Text>
        </View>

        {/* Change Password */}
        <View className="mb-8 p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          <Text className="text-lg font-semibold mb-3">Change Password</Text>

          <Text className="text-sm mb-2" lightColor="#6B7280" darkColor="#9CA3AF">
            New Password
          </Text>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
            placeholderTextColor={colorScheme === "dark" ? "#9CA3AF" : "#6B7280"}
            secureTextEntry
            className="w-full mb-4 px-4 py-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white"
            autoCapitalize="none"
          />

          <Text className="text-sm mb-2" lightColor="#6B7280" darkColor="#9CA3AF">
            Confirm Password
          </Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter new password"
            placeholderTextColor={colorScheme === "dark" ? "#9CA3AF" : "#6B7280"}
            secureTextEntry
            className="w-full mb-6 px-4 py-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white"
            autoCapitalize="none"
          />

          <TouchableOpacity
            className="bg-blue-500 dark:bg-blue-600 p-4 rounded-lg mb-3"
            onPress={handleChangePassword}
            disabled={updating}
          >
            <Text className="text-center font-semibold text-white">
              {updating ? "Updating..." : "Update Password"}
            </Text>
          </TouchableOpacity>

          {/* <TouchableOpacity onPress={handleForgotPassword} disabled={sendingReset}>
            <Text className="text-center font-semibold text-blue-600 dark:text-blue-400">
              {sendingReset ? "Sending reset link..." : "Forgot password? Send reset link"}
            </Text>
          </TouchableOpacity> */}
        </View>

        {/* TWO-FACTOR AUTHENTICATION - COMING SOON */}
        {/* 
        <View className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          <Text className="text-lg font-semibold mb-3">Two-Factor Authentication</Text>
          <Text className="text-sm mb-4" lightColor="#6B7280" darkColor="#9CA3AF">
            Add an extra layer of security. You'll confirm sign-ins with a code.
          </Text>

          <TouchableOpacity
            className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-lg"
            onPress={handleEnable2FA}
          >
            <Text className="text-center font-semibold">
              Set up 2FA (coming soon)
            </Text>
          </TouchableOpacity>
        </View>
        */}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
