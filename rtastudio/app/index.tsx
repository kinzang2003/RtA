import { images } from "@/constants/images";
import {
  View,
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";

export default function WelcomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

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

  const handleSignup = async () => {
    const signupURL = `https://rta-studio.vercel.app/signup?redirect=${encodeURIComponent(
      Linking.createURL("/auth")
    )}`;
    await WebBrowser.openAuthSessionAsync(
      signupURL,
      Linking.createURL("/auth")
    );
  };

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

      <TouchableOpacity
        onPress={() => router.push("/login")}
        className="bg-main py-3 px-6 rounded-lg w-64 mb-4 mt-8"
      >
        <Text className="text-light text-lg font-[14px] text-center">
          Log in to RTA
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleSignup}
        className="border border-blackoutlines py-3 px-6 rounded-lg w-64"
      >
        <Text className="text-blackoutlines text-lg font-semibold text-center">
          Sign up
        </Text>
      </TouchableOpacity>
    </ImageBackground>
  );
}
