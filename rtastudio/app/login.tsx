import {
  Image,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { images } from "@/constants/images";
import { Eye, EyeOff } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/supabase";
import { Text, View } from "@/components/Themed";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session) {
        Toast.show({
          type: "error",
          text1: "Login Failed",
          text2: error?.message || "Unknown error",
          position: "bottom",
          bottomOffset: 120,
        });
        setIsLoading(false);
        return;
      }

      await AsyncStorage.setItem(
        "supabaseSession",
        JSON.stringify(data.session)
      );
      await AsyncStorage.setItem("authToken", data.session.access_token);

      // Save full session for WebView injection
      await AsyncStorage.setItem(
        "supabaseSession",
        JSON.stringify(data.session)
      );
      await AsyncStorage.setItem("authToken", data.session.access_token);

      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url")
        .eq("id", data.user.id)
        .single();

      if (profile) {
        await AsyncStorage.setItem("userProfile", JSON.stringify(profile));
      }

      // Owned + shared projects
      const { data: ownedProjects } = await supabase
        .from("projects")
        .select("id, name, description, created_at")
        .eq("owner_id", data.user.id);

      const { data: collabProjects } = await supabase
        .from("collaborators")
        .select("projects(id, name, description, created_at), role")
        .eq("user_id", data.user.id);

      const invitedProjects =
        collabProjects
          ?.filter((c) => c.role !== "owner")
          .map((c) => ({
            ...c.projects,
            role: c.role,
          })) || [];

      await AsyncStorage.setItem(
        "ownedProjects",
        JSON.stringify(ownedProjects || [])
      );
      await AsyncStorage.setItem(
        "invitedProjects",
        JSON.stringify(invitedProjects || [])
      );

      const combined = [...(ownedProjects || []), ...invitedProjects];
      await AsyncStorage.setItem("projectIds", JSON.stringify(combined));

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Logged in successfully!",
        position: "bottom",
        bottomOffset: 120,
      });

      router.replace("/(tabs)");
    } catch (err) {
      console.error("Login error", err);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Something went wrong. Please try again.",
        position: "bottom",
        bottomOffset: 120,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View
          className="flex-1 justify-start items-center px-6"
          style={{ paddingTop: insets.top + 100 }}
        >
          <Image
            source={
              typeof images.rtalogo === "string"
                ? { uri: images.rtalogo }
                : images.rtalogo
            }
            className="w-[120px] h-[100px] mb-3"
            resizeMode="contain"
          />

          <Text className="text-lg font-semibold mb-6 text-black dark:text-white">
            Sign in to RTA Studio
          </Text>

          <TextInput
            placeholder="EMAIL"
            placeholderTextColor="#939393"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            className="w-[90%] px-3 py-2 rounded-lg mb-3 text-sm border border-gray-200 dark:border-placeholder text-black dark:text-white"
          />

          <View className="w-[90%] flex-row items-center border border-gray-200 dark:border-placeholder rounded-lg mb-3 bg-neutral-100 dark:bg-gray-800">
            <TextInput
              placeholder="PASSWORD"
              placeholderTextColor="#939393"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              className="flex-1 px-3 py-2 text-sm text-black dark:text-white"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              className="px-3"
            >
              {showPassword ? (
                <Eye color="#939393" size={20} />
              ) : (
                <EyeOff color="#939393" size={20} />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            className="bg-gray-900 py-3 px-6 rounded-lg w-[90%] mt-2 flex-row justify-center items-center"
            disabled={isLoading || !email || !password}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                className="text-center font-semibold text-base"
                lightColor="#ffffff"
              >
                Log in
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
