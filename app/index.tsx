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
import { Alert } from "react-native";

export default function WelcomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    setLoading(true);
    try {
      const session = await openWebLogin();
      if (session) {
        // Route immediately; RootLayout + DataProvider will load user data.
        router.replace("/(tabs)");
        return;
      }
      Alert.alert("Login cancelled", "Please try again.");
    } catch (e) {
      console.error("Auth error:", e);
      Alert.alert("Login failed", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
      </ImageBackground>
    </View>
  );
}
