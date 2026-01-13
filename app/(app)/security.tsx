import React, { useState, useEffect } from "react";
import {
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
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
import { logger } from "@/lib/logger";
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";

export default function SecurityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const { userProfile: profile } = useData();
  const user = useAuthUser();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  // 2FA (TOTP) state
  const [is2FALoading, setIs2FALoading] = useState(false);
  const [verifiedTotpFactorId, setVerifiedTotpFactorId] = useState<string | null>(null);
  const [pendingTotpFactorId, setPendingTotpFactorId] = useState<string | null>(null);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFAMode, setTwoFAMode] = useState<"setup" | "disable" | null>(null);
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [twoFAWorking, setTwoFAWorking] = useState(false);

  const refresh2FA = async () => {
    if (!user) return;
    try {
      setIs2FALoading(true);
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;

      const verifiedTotp = (data.totp ?? []).find((f: any) => f?.status === "verified") ?? null;
      setIs2FAEnabled(!!verifiedTotp);
      setVerifiedTotpFactorId(verifiedTotp?.id ?? null);
    } catch (e: any) {
      logger.error("mfa listFactors error", e);
      // Don't block screen; just show disabled.
      setIs2FAEnabled(false);
      setVerifiedTotpFactorId(null);
    } finally {
      setIs2FALoading(false);
    }
  };

  useEffect(() => {
    void refresh2FA();
  }, [user]);

  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert("Required", "Enter your current password.");
      return;
    }
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

      const email = profile?.email ?? user?.email;
      if (!email) {
        Alert.alert("Missing email", "We need your email on file to verify your current password.");
        return;
      }

      // Re-authenticate using the current password (real-world: security best practice).
      // Note: for OAuth-only accounts, this may fail if no password is set.
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (reauthError) {
        Alert.alert(
          "Current password incorrect",
          reauthError.message || "Please check your current password and try again."
        );
        return;
      }

      // Update to the new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Success", "Your password has been updated.");
    } catch (error: any) {
      logger.error("change password error", error);
      Alert.alert("Failed", error.message || "Could not change password.");
    } finally {
      setUpdating(false);
    }
  };

  const start2FASetup = async () => {
    try {
      setTwoFAWorking(true);
      setTotpCode("");

      // Clean up any existing unverified TOTP factors so users can restart setup
      // if they previously canceled before verifying.
      const { data: existing, error: listError } = await supabase.auth.mfa.listFactors();
      if (!listError) {
        const unverifiedTotp = (existing.totp ?? []).find((f: any) => f?.status !== "verified");
        if (unverifiedTotp?.id) {
          await supabase.auth.mfa.unenroll({ factorId: unverifiedTotp.id });
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "RTA Studio",
        // Friendly names must be unique per user in Supabase.
        // Keep it human-readable but avoid collisions when users retry setup.
        friendlyName: `Authenticator app (${Math.random().toString(36).slice(2, 6)})`,
      });

      if (error) throw error;
      if (!data?.totp?.uri || !data?.id) {
        throw new Error("Failed to start 2FA setup. Missing enrollment data.");
      }

      // Avoid logging secret/URI.
      setTotpUri(data.totp.uri);
      setTotpSecret(data.totp.secret);
      setPendingTotpFactorId(data.id);
      setTwoFAMode("setup");
      setShow2FAModal(true);
    } catch (e: any) {
      logger.error("mfa enroll error", e);
      Alert.alert("2FA setup failed", e?.message ?? "Could not start 2FA setup.");
    } finally {
      setTwoFAWorking(false);
    }
  };

  const verify2FASetup = async () => {
    const factorId = pendingTotpFactorId;
    if (!factorId) {
      Alert.alert("2FA", "Missing factor id. Please try setup again.");
      return;
    }

    const code = totpCode.trim();
    if (code.length < 6) {
      Alert.alert("Code required", "Enter the 6-digit code from your authenticator app.");
      return;
    }

    try {
      setTwoFAWorking(true);
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });
      if (error) throw error;

      setShow2FAModal(false);
      setTwoFAMode(null);
      setTotpUri(null);
      setTotpSecret(null);
      setTotpCode("");
      setPendingTotpFactorId(null);
      await refresh2FA();
      Alert.alert("2FA enabled", "Two-factor authentication is now enabled.");
    } catch (e: any) {
      logger.error("mfa verify error", e);
      Alert.alert("Verification failed", e?.message ?? "Invalid code. Please try again.");
    } finally {
      setTwoFAWorking(false);
    }
  };

  const openDisable2FA = async () => {
    if (!verifiedTotpFactorId) {
      Alert.alert("2FA", "No verified authenticator is enabled.");
      return;
    }
    setTotpCode("");
    setTotpUri(null);
    setTotpSecret(null);
    setTwoFAMode("disable");
    setShow2FAModal(true);
  };

  const disable2FA = async () => {
    const factorId = verifiedTotpFactorId;
    if (!factorId) return;

    const code = totpCode.trim();
    if (code.length < 6) {
      Alert.alert("Code required", "Enter the 6-digit code from your authenticator app.");
      return;
    }

    try {
      setTwoFAWorking(true);

      // Step-up to aal2 using the existing factor, then unenroll.
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });
      if (verifyError) throw verifyError;

      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId,
      });
      if (unenrollError) throw unenrollError;

      setShow2FAModal(false);
      setTwoFAMode(null);
      setTotpCode("");
      await refresh2FA();
      Alert.alert("2FA disabled", "Two-factor authentication has been disabled.");
    } catch (e: any) {
      logger.error("mfa disable error", e);
      Alert.alert("Disable failed", e?.message ?? "Could not disable 2FA.");
    } finally {
      setTwoFAWorking(false);
    }
  };

  const copyTotpSecret = async () => {
    if (!totpSecret) return;
    try {
      await Clipboard.setStringAsync(totpSecret);
      Alert.alert("Copied", "Secret copied to clipboard.");
    } catch (e: any) {
      logger.error("clipboard copy error", e);
      Alert.alert("Copy failed", "Could not copy to clipboard.");
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
      const redirectTo = Linking.createURL("/auth/reset-password", { scheme: "rtastudio-app" });

      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo,
      });

      if (error) throw error;
      Alert.alert(
        "Check your email",
        "We've sent a secure link to reset your password. Click it to proceed in a secure browser."
      );
    } catch (error: any) {
      logger.error("forgot password error", error);
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
            Current Password
          </Text>
          <TextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter current password"
            placeholderTextColor={colorScheme === "dark" ? "#9CA3AF" : "#6B7280"}
            secureTextEntry
            className="w-full mb-4 px-4 py-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white"
            autoCapitalize="none"
          />

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

        {/* Two-Factor Authentication (TOTP) */}
        <View className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          <Text className="text-lg font-semibold mb-3">Two-Factor Authentication</Text>
          <Text className="text-sm mb-3" lightColor="#6B7280" darkColor="#9CA3AF">
            Add an extra layer of security using an authenticator app.
          </Text>

          <View className="mb-3" lightColor="transparent" darkColor="transparent">
            <Text className="text-sm" lightColor="#6B7280" darkColor="#9CA3AF">
              Status
            </Text>
            <Text className="text-base font-semibold">
              {is2FALoading ? "Checking..." : is2FAEnabled ? "Enabled" : "Not enabled"}
            </Text>
          </View>

          {!is2FAEnabled ? (
            <TouchableOpacity
              className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-lg"
              onPress={start2FASetup}
              disabled={twoFAWorking || is2FALoading}
            >
              <Text className="text-center font-semibold">
                {twoFAWorking ? "Starting..." : "Set up 2FA"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 p-4 rounded-lg"
              onPress={openDisable2FA}
              disabled={twoFAWorking || is2FALoading}
            >
              <Text className="text-center font-semibold" lightColor="#dc2626" darkColor="#f87171">
                Disable 2FA
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* 2FA Modal */}
      <Modal animationType="fade" transparent visible={show2FAModal}>
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center"
          onPress={() => {
            if (twoFAWorking) return;

            // If user cancels setup before verifying, remove the pending factor
            // to avoid getting stuck with an unverified factor that blocks re-enroll.
            if (twoFAMode === "setup" && pendingTotpFactorId) {
              void supabase.auth.mfa.unenroll({ factorId: pendingTotpFactorId });
            }

            setShow2FAModal(false);
            setTwoFAMode(null);
            setTotpUri(null);
            setTotpSecret(null);
            setTotpCode("");
            setPendingTotpFactorId(null);
          }}
        >
          <Pressable
            className="p-6 rounded-2xl mx-4 w-[90%] max-w-sm bg-white dark:bg-neutral-900"
            onPress={() => {
              // Swallow press so the backdrop doesn't close the modal.
            }}
          >
            <Text className="text-xl font-bold text-center mb-3">
              {twoFAMode === "disable" ? "Disable 2FA" : "Set up 2FA"}
            </Text>

            {twoFAMode === "setup" && totpUri ? (
              <View className="items-center" lightColor="transparent" darkColor="transparent">
                <Text className="text-sm text-center mb-4" lightColor="#6B7280" darkColor="#9CA3AF">
                  Scan this QR code with Google Authenticator, Authy, or 1Password.
                </Text>
                <View className="p-4 bg-white rounded-xl" lightColor="#ffffff" darkColor="#ffffff">
                  <QRCode value={totpUri} size={180} />
                </View>

                {totpSecret ? (
                  <View className="mt-3 w-full" lightColor="transparent" darkColor="transparent">
                    <Text className="text-xs text-center" lightColor="#6B7280" darkColor="#9CA3AF">
                      If you can’t scan, use this secret:
                    </Text>
                    <Text className="text-xs text-center mt-1 font-semibold" selectable>
                      {totpSecret}
                    </Text>
                    <TouchableOpacity
                      className="mt-3 bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg flex-row justify-center items-center"
                      onPress={copyTotpSecret}
                    >
                      <Feather name="copy" size={16} color={colorScheme === "dark" ? "#ffffff" : "#000000"} />
                      <Text className="ml-2 font-semibold">Copy secret</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text className="text-sm text-center mb-4" lightColor="#6B7280" darkColor="#9CA3AF">
                Enter the 6-digit code from your authenticator app to continue.
              </Text>
            )}

            <Text className="text-sm mb-2 mt-4" lightColor="#6B7280" darkColor="#9CA3AF">
              6-digit code
            </Text>
            <TextInput
              value={totpCode}
              onChangeText={setTotpCode}
              placeholder="123456"
              placeholderTextColor={colorScheme === "dark" ? "#9CA3AF" : "#6B7280"}
              keyboardType="number-pad"
              className="w-full mb-4 px-4 py-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white"
              autoCapitalize="none"
              maxLength={8}
            />

            <TouchableOpacity
              className={
                twoFAMode === "disable"
                  ? "bg-red-500 dark:bg-red-700 p-4 rounded-lg mb-3"
                  : "bg-blue-500 dark:bg-blue-600 p-4 rounded-lg mb-3"
              }
              onPress={twoFAMode === "disable" ? disable2FA : verify2FASetup}
              disabled={twoFAWorking}
            >
              <Text className="text-center font-semibold text-white">
                {twoFAWorking ? "Working..." : twoFAMode === "disable" ? "Disable" : "Verify & Enable"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg"
              onPress={() => {
                if (twoFAWorking) return;

                if (twoFAMode === "setup" && pendingTotpFactorId) {
                  void supabase.auth.mfa.unenroll({ factorId: pendingTotpFactorId });
                }

                setShow2FAModal(false);
                setTwoFAMode(null);
                setTotpUri(null);
                setTotpSecret(null);
                setTotpCode("");
                setPendingTotpFactorId(null);
              }}
            >
              <Text className="text-center font-semibold text-black dark:text-white">
                Cancel
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}
