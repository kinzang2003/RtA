import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import Toast from "react-native-toast-message";
import { AUTH_STORAGE_KEYS } from "@/utils/storageKeys";

const HOLD_PERIOD_DAYS = 30;
const HOLD_PERIOD_MS = HOLD_PERIOD_DAYS * 24 * 60 * 60 * 1000;

type ProfileRecord = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  deletion_requested_at?: string | null;
  deletion_scheduled_for?: string | null;
};

const KNOWN_SESSIONS = [
  { deviceName: "iPhone 14 Pro", ipAddress: "192.168.1.5" },
  { deviceName: "Chrome on MacBook", ipAddress: "192.168.1.10" },
  { deviceName: "Android Device", ipAddress: "192.168.1.15" },
];

export default function Profile() {
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [requestingDeletion, setRequestingDeletion] = useState(false);
  const [cancelingDeletion, setCancelingDeletion] = useState(false);
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();

  const fetchLatestProfile = useCallback(async () => {
    try {
      const { data: sessionResponse } = await supabase.auth.getSession();
      const userId = sessionResponse.session?.user?.id;
      let resolvedProfile: ProfileRecord | null = null;

      if (userId) {
        const { data, error } = await supabase
          .from("profiles")
          .select(
            "id, email, full_name, avatar_url, deletion_requested_at, deletion_scheduled_for"
          )
          .eq("id", userId)
          .single();

        if (error) {
          throw error;
        }

        resolvedProfile = data;
      }

      if (!resolvedProfile) {
        const stored = await AsyncStorage.getItem("userProfile");
        if (stored) {
          resolvedProfile = JSON.parse(stored);
        }
      }

      if (resolvedProfile) {
        setProfile(resolvedProfile);
        await AsyncStorage.setItem(
          "userProfile",
          JSON.stringify(resolvedProfile)
        );
      }

      return resolvedProfile;
    } catch (err) {
      console.error("Load profile error:", err);
      const stored = await AsyncStorage.getItem("userProfile");
      if (stored) {
        const fallbackProfile = JSON.parse(stored);
        setProfile(fallbackProfile);
        return fallbackProfile;
      }

      return null;
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      await fetchLatestProfile();
      setLoadingProfile(false);
    };

    bootstrap();
  }, [fetchLatestProfile]);

  const {
    deletionRequestedAt,
    deletionScheduledFor,
    isDeletionPending,
    isDeletionPastDue,
    daysUntilDeletion,
  } = useMemo(() => {
    if (!profile) {
      return {
        deletionRequestedAt: null,
        deletionScheduledFor: null,
        isDeletionPending: false,
        isDeletionPastDue: false,
        daysUntilDeletion: null,
      } as const;
    }

    const requestedAt = profile.deletion_requested_at
      ? new Date(profile.deletion_requested_at)
      : null;
    const scheduledFor = profile.deletion_scheduled_for
      ? new Date(profile.deletion_scheduled_for)
      : requestedAt
        ? new Date(requestedAt.getTime() + HOLD_PERIOD_MS)
        : null;

    const now = Date.now();
    const scheduledMs = scheduledFor?.getTime();
    const isPending =
      Boolean(requestedAt) && !!scheduledMs && scheduledMs > now;
    const isPastDue =
      Boolean(requestedAt) && !!scheduledMs && scheduledMs <= now;
    const daysRemaining =
      isPending && scheduledMs
        ? Math.max(0, Math.ceil((scheduledMs - now) / (1000 * 60 * 60 * 24)))
        : null;

    return {
      deletionRequestedAt: requestedAt,
      deletionScheduledFor: scheduledFor,
      isDeletionPending: isPending,
      isDeletionPastDue: isPastDue,
      daysUntilDeletion: daysRemaining,
    } as const;
  }, [profile]);

  const projectedDeletionDate = useMemo(
    () => new Date(Date.now() + HOLD_PERIOD_MS),
    []
  );

  const logout = useCallback(
    async (options: { silent?: boolean; redirect?: boolean } = {}) => {
      try {
        await AsyncStorage.multiRemove(AUTH_STORAGE_KEYS);
        await supabase.auth.signOut();
        setProfile(null);
        setShowDeleteModal(false);

        if (!options.silent) {
          Toast.show({
            type: "success",
            text1: "Signed out",
            text2: "You have been signed out of RTA Studio.",
            position: "bottom",
          });
        }
      } catch (err) {
        console.error("Logout error:", err);
        if (!options.silent) {
          Toast.show({
            type: "error",
            text1: "Sign-out failed",
            text2: "We couldn't complete the sign-out. Please try again.",
            position: "bottom",
          });
        }
      } finally {
        if (options.redirect !== false) {
          router.replace("/login");
        }
      }
    },
    []
  );

  const requestAccountDeletion = useCallback(async () => {
    if (!profile?.id) {
      setShowDeleteModal(false);
      Toast.show({
        type: "error",
        text1: "Profile unavailable",
        text2: "We couldn't locate your account. Please try again.",
        position: "bottom",
      });
      return;
    }

    if (isDeletionPending) {
      setShowDeleteModal(false);
      Toast.show({
        type: "info",
        text1: "Already scheduled",
        text2: "Your account is already queued for deletion.",
        position: "bottom",
      });
      return;
    }

    setRequestingDeletion(true);

    try {
      const requestedAt = new Date();
      const scheduledFor = new Date(requestedAt.getTime() + HOLD_PERIOD_MS);

      const { data, error } = await supabase
        .from("profiles")
        .update({
          deletion_requested_at: requestedAt.toISOString(),
          deletion_scheduled_for: scheduledFor.toISOString(),
        })
        .eq("id", profile.id)
        .select(
          "id, email, full_name, avatar_url, deletion_requested_at, deletion_scheduled_for"
        )
        .single();

      if (error) {
        throw error;
      }

      const updatedProfile =
        data ??
        ({
          ...profile,
          deletion_requested_at: requestedAt.toISOString(),
          deletion_scheduled_for: scheduledFor.toISOString(),
        } as ProfileRecord);

      setProfile(updatedProfile);
      await AsyncStorage.setItem("userProfile", JSON.stringify(updatedProfile));

      Toast.show({
        type: "success",
        text1: "Deletion scheduled",
        text2: `Your account will be permanently deleted on ${scheduledFor.toLocaleString()}.`,
        position: "bottom",
      });

      setShowDeleteModal(false);
    } catch (err) {
      console.error("Schedule deletion error:", err);
      Toast.show({
        type: "error",
        text1: "Request failed",
        text2: "Unable to schedule account deletion. Please try again.",
        position: "bottom",
      });
    } finally {
      setRequestingDeletion(false);
      await fetchLatestProfile();
    }
  }, [fetchLatestProfile, isDeletionPending, profile]);

  const cancelAccountDeletion = useCallback(async () => {
    if (!profile?.id) {
      Toast.show({
        type: "error",
        text1: "Profile unavailable",
        text2: "We couldn't locate your account. Please try again.",
        position: "bottom",
      });
      return;
    }

    if (!isDeletionPending) {
      Toast.show({
        type: "info",
        text1: "Nothing to cancel",
        text2: "There is no active deletion request on your account.",
        position: "bottom",
      });
      return;
    }

    setCancelingDeletion(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          deletion_requested_at: null,
          deletion_scheduled_for: null,
        })
        .eq("id", profile.id)
        .select(
          "id, email, full_name, avatar_url, deletion_requested_at, deletion_scheduled_for"
        )
        .single();

      if (error) {
        throw error;
      }

      const updatedProfile =
        data ??
        ({
          ...profile,
          deletion_requested_at: null,
          deletion_scheduled_for: null,
        } as ProfileRecord);

      setProfile(updatedProfile);
      await AsyncStorage.setItem("userProfile", JSON.stringify(updatedProfile));

      Toast.show({
        type: "success",
        text1: "Deletion cancelled",
        text2: "Your account will remain active.",
        position: "bottom",
      });
    } catch (err) {
      console.error("Cancel deletion error:", err);
      Toast.show({
        type: "error",
        text1: "Unable to cancel",
        text2: "Please try again or contact support.",
        position: "bottom",
      });
    } finally {
      setCancelingDeletion(false);
      await fetchLatestProfile();
    }
  }, [fetchLatestProfile, isDeletionPending, profile]);

  const confirmDelete = useCallback(() => {
    requestAccountDeletion();
  }, [requestAccountDeletion]);

  useEffect(() => {
    if (!isDeletionPastDue || !profile) {
      return;
    }

    Toast.show({
      type: "info",
      text1: "Account deleted",
      text2:
        "Your deletion window elapsed. Please reach out to support if this is unexpected.",
      position: "bottom",
    });

    logout({ silent: true });
  }, [isDeletionPastDue, logout, profile]);

  if (loadingProfile) {
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

  if (!profile) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-black px-6">
        <Text className="text-lg font-medium text-center text-black dark:text-white mb-6">
          We couldn't load your profile details. Please sign in again to recover
          access.
        </Text>
        <TouchableOpacity
          className="px-6 py-3 bg-black dark:bg-white rounded-full"
          onPress={() => logout({ silent: true })}
        >
          <Text className="text-white dark:text-black font-semibold">
            Return to login
          </Text>
        </TouchableOpacity>
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

        {isDeletionPending && deletionScheduledFor && (
          <View className="mt-4 mb-6 p-4 rounded-lg border border-red-500 bg-red-100 dark:bg-red-900/40">
            <Text className="text-base font-semibold text-red-700 dark:text-red-200 mb-2">
              Account deletion scheduled
            </Text>
            <Text className="text-sm text-red-700 dark:text-red-200 mb-3">
              Your account is queued for permanent deletion on{" "}
              {deletionScheduledFor.toLocaleString()}
              {typeof daysUntilDeletion === "number" ? (
                <Text className="font-medium">
                  {` (${daysUntilDeletion} day${daysUntilDeletion === 1 ? "" : "s"} remaining)`}
                </Text>
              ) : null}
              . Sign in before this date to keep your account.
            </Text>
            <TouchableOpacity
              className="self-start bg-white dark:bg-transparent border border-red-500 px-4 py-2 rounded-md"
              disabled={cancelingDeletion}
              onPress={cancelAccountDeletion}
            >
              {cancelingDeletion ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Text className="text-sm font-semibold text-red-600 dark:text-red-200">
                  Cancel deletion request
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

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
              onPress={() => logout()}
              className="bg-gray-200 dark:bg-placeholder p-2 rounded"
            >
              <Text className="text-blue-500 dark:text-blue-300 text-sm">
                Sign Out of All...
              </Text>
            </TouchableOpacity>
          </View>

          {KNOWN_SESSIONS.map((device, index) => (
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
                onPress={() => logout()}
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
            className={`bg-red-200 dark:bg-red-700 border border-red-500  p-4 rounded-lg items-center mb-6 ${
              isDeletionPending || requestingDeletion ? "opacity-60" : ""
            }`}
            onPress={() => setShowDeleteModal(true)}
            disabled={isDeletionPending || requestingDeletion}
          >
            {requestingDeletion ? (
              <ActivityIndicator size="small" color="#991b1b" />
            ) : (
              <Text lightColor="#ef4444" className="font-semibold">
                {isDeletionPending ? "Deletion pending" : "Delete Account"}
              </Text>
            )}
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
          onPress={() => {
            if (!requestingDeletion) {
              setShowDeleteModal(false);
            }
          }}
        >
          <Pressable className="p-6 rounded-2xl mx-4 w-[90%] max-w-sm bg-white dark:bg-[#1F1F1F]">
            <Text className="text-xl font-bold text-center mb-4">
              Schedule account deletion?
            </Text>
            <Text className="text-center text-sm text-gray-700 dark:text-gray-200 mb-3">
              We will deactivate your account now and permanently remove your
              data on {projectedDeletionDate.toLocaleString()} (
              {HOLD_PERIOD_DAYS}-day grace period).
            </Text>
            <Text className="text-center text-xs text-gray-500 dark:text-gray-400 mb-6">
              You may sign back in before that date to cancel this request.
              After {HOLD_PERIOD_DAYS} days, your profile, projects, and stored
              assets will be erased except where retention is required by law.
            </Text>
            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 p-4 bg-gray-100 dark:bg-[#2C2C2C] rounded-lg"
                onPress={() => setShowDeleteModal(false)}
                disabled={requestingDeletion}
              >
                <Text className="text-center font-semibold">Not now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-red-500 dark:bg-red-700 p-4 rounded-lg"
                onPress={confirmDelete}
                disabled={requestingDeletion}
              >
                {requestingDeletion ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-center font-semibold" lightColor="#fff">
                    Confirm deletion
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
