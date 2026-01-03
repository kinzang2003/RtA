// rtastudio/app/index.tsx
import { images } from "@/constants/images";
import {
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "@/components/Themed";
import { openWebLogin } from "@/auth/index";
import { StatusBar } from "expo-status-bar";
import { fetchUserProfile } from "@/lib/api";

export default function WelcomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    setLoading(true);
    try {
      const session = await openWebLogin();
      if (session) {
        // Prefetch user profile in background for instant Profile tab load
        try {
          await fetchUserProfile(session.user_id);
        } catch (e) {
          // Ignore prefetch errors; Profile will fetch on demand
        }
        router.replace("/(tabs)");
      }
    } catch (e) {
      console.error("Auth error:", e);
    } finally {
      setLoading(false);
    }
  };

  // const handleForgotPassword = () => {
  //   const webAuthUrl = process.env.EXPO_PUBLIC_WEB_AUTH_URL || "https://rtastudio-v2.vercel.app/auth";
  //   Linking.openURL(`${webAuthUrl}?forgot=1`);
  // };

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
          onPress={handleAuth}
          className="bg-gray-900 py-3 px-6 rounded-lg mb-4 mt-8 w-[90%] max-w-[300px]"
        >
          <Text className="text-lg text-center font-semibold text-white">
            Log in to RTA
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleAuth}
          className="bg-placeholder py-3 px-6 rounded-lg mb-3 w-[90%] max-w-[300px]"
        >
          <Text className="text-lg font-semibold text-center text-white">
            Sign up
          </Text>
        </TouchableOpacity>

        {/* <TouchableOpacity
          onPress={handleForgotPassword}
          className="mt-2"
        >
          <Text className="text-sm text-white underline">
            Forgot Password?
          </Text>
        </TouchableOpacity> */}
      </ImageBackground>
    </View>
  );
}
