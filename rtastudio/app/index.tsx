import { images } from "@/constants/images";
import {
  Image,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { View, Text } from "@/components/Themed";
import { ExternalLink } from "@/components/ExternalLink"; // 👈 import it

export default function WelcomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const checkIfLoggedIn = async () => {
    const token = await SecureStore.getItemAsync("authToken");
    if (token) {
      router.replace("/(tabs)");
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkIfLoggedIn();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
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

      {/* Internal navigation */}
      <TouchableOpacity
        onPress={() => router.push("/login")}
        className="bg-gray-900 py-3 px-6 rounded-lg mb-4 mt-8 w-[90%] max-w-[300px]"
      >
        <Text className="text-lg font-[14px] text-center" lightColor="#ffffff">
          Log in to RTA
        </Text>
      </TouchableOpacity>

      {/* External link for signup */}
      <ExternalLink
        href="https://rtastudio-v2.vercel.app/signup"
        className="border border-placeholder py-3 px-6 rounded-lg w-[90%] max-w-[300px]"
      >
        <Text
          className="text-lg font-semibold text-center"
          lightColor="#939393"
          darkColor="#939393"
        >
          Sign up
        </Text>
      </ExternalLink>
    </ImageBackground>
  );
}
