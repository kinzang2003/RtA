// rtastudio/app/index.tsx
import { images } from "@/constants/images";
import {
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { View } from "@/components/Themed";
import { StatusBar } from "expo-status-bar";
import { Alert } from "react-native";
import { logger } from "@/lib/logger";
import { openWebLogin } from "@/auth";
import { useAuthStatus } from "@/lib/auth-store";

export default function WelcomeScreen() {
  const [loading, setLoading] = useState(false);
  const { user, authReady } = useAuthStatus();

  const goToAuth = async (mode: "signin" | "signup") => {
    try {
      setLoading(true);
      await openWebLogin(mode);
      // If the user completed login, RootLayout will route them to /(tabs)
    } catch (e) {
      logger.error("[Welcome] Failed to navigate to auth", e);
      Alert.alert("Something went wrong", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // If a session exists (e.g. just finished web login), don't flash the welcome UI.
  if (authReady && user) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-black">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-black">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <StatusBar style="light" />
      <ImageBackground
        source={
          typeof images.textile === "string"
            ? { uri: images.textile }
            : images.textile
        }
        className="flex-1 justify-center items-center"
        resizeMode="cover"
      >
        <Image
          source={
            typeof images.rtalogo === "string"
              ? { uri: images.rtalogo }
              : images.rtalogo
          }
          className="w-[150px] h-[110px] -mt-[150px]"
          resizeMode="contain"
        />

        <TouchableOpacity
          onPress={() => goToAuth("signin")}
          className="bg-gray-900 py-3 px-6 rounded-lg mb-4 mt-8 w-[90%] max-w-[300px]"
        >
          <Text className="text-lg text-center font-semibold text-white">
            Log in to RTA
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => goToAuth("signup")}
          className="bg-placeholder py-3 px-6 rounded-lg mb-3 w-[90%] max-w-[300px]"
        >
          <Text className="text-lg font-semibold text-center text-white">
            Sign up
          </Text>
        </TouchableOpacity>
      </ImageBackground>
    </View>
  );
}
