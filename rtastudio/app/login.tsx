import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import Toast from "react-native-root-toast";
import { images } from "@/constants/images";
import { useColorScheme } from "nativewind";
import { Eye, EyeOff, Fingerprint } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // Import useSafeAreaInsets

interface ValidateEmailFn {
  (email: string): boolean;
}

const validateEmail: ValidateEmailFn = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(true);
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets(); // Get safe area insets

  const handleEmailBlur = () => {
    setIsEmailValid(validateEmail(email));
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        "https://rta-studio.vercel.app/api/authenticate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, from: "mobile" }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setModalMessage("Login failed: " + (data?.error ?? "Unknown error"));
        setShowModal(true);
        setIsLoading(false);
        return;
      }

      await SecureStore.setItemAsync("authToken", data.token);
      await SecureStore.setItemAsync("usedData", JSON.stringify(data.user));

      if (
        data.rooms &&
        typeof data.rooms === "object" &&
        data.rooms.owned &&
        data.rooms.invited
      ) {
        await SecureStore.setItemAsync(
          "rooms",
          JSON.stringify(data.rooms.owned)
        );
        await SecureStore.setItemAsync(
          "roomInvites",
          JSON.stringify(data.rooms.invited)
        );
      } else {
        await SecureStore.setItemAsync(
          "rooms",
          JSON.stringify(data.rooms || [])
        );
        await SecureStore.setItemAsync(
          "roomInvites",
          JSON.stringify(data.roomInvites || [])
        );
      }

      Toast.show("Logged in successfully!", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.TOP,
        backgroundColor: "green",
        textColor: "white",
      });

      router.replace("/(tabs)");
    } catch (err) {
      console.error("Login error", err);
      setModalMessage("Something went wrong. Please try again.");
      setShowModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) {
      Toast.show("Biometric hardware not available.", {
        backgroundColor: "red",
      });
      return;
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      Toast.show("No biometrics set up on this device.", {
        backgroundColor: "orange",
      });
      return;
    }

    const savedToken = await SecureStore.getItemAsync("authToken");
    if (!savedToken) {
      Toast.show("No saved session found.", {
        backgroundColor: "orange",
      });
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Login with biometrics",
      fallbackLabel: "Use Passcode",
      cancelLabel: "Cancel",
    });

    if (result.success) {
      Toast.show("Welcome back!", { backgroundColor: "green" });
      router.replace("/(tabs)");
    } else {
      Toast.show("Authentication failed.", { backgroundColor: "red" });
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-gray-900"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View
          className="flex-1 justify-start items-center px-6"
          style={{ paddingTop: insets.top + 100 }} // Adjusted padding for better consistency
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
            Sign in to RTA
          </Text>

          <TextInput
            placeholder="EMAIL"
            placeholderTextColor={
              colorScheme === "dark" ? "#A0A0A0" : "#6B7280"
            }
            value={email}
            onChangeText={setEmail}
            onBlur={handleEmailBlur}
            autoCapitalize="none"
            keyboardType="email-address"
            className={`w-[90%] px-3 py-2 rounded-lg mb-1 text-sm border ${
              isEmailValid
                ? "border-gray-200 dark:border-gray-700"
                : "border-red-500"
            } bg-neutral-100 dark:bg-gray-800 text-black dark:text-white`}
          />

          {!isEmailValid && (
            <Text className="text-red-500 text-xs mb-2 self-start w-[90%]">
              Invalid email format
            </Text>
          )}

          <View className="w-[90%] flex-row items-center border border-gray-200 dark:border-gray-700 rounded-lg mb-3 bg-neutral-100 dark:bg-gray-800">
            <TextInput
              placeholder="PASSWORD"
              placeholderTextColor={
                colorScheme === "dark" ? "#A0A0A0" : "#6B7280"
              }
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
                <Eye
                  color={colorScheme === "dark" ? "#9CA3AF" : "#6B7280"}
                  size={20}
                /> // Theme-aware color
              ) : (
                <EyeOff
                  color={colorScheme === "dark" ? "#9CA3AF" : "#6B7280"}
                  size={20}
                /> // Theme-aware color
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            className="bg-main py-3 px-6 rounded-lg w-[90%] mt-2 flex-row justify-center items-center"
            disabled={isLoading || !email || !password || !isEmailValid}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-center font-semibold text-base">
                Log in
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleBiometricAuth}
            className="flex-row items-center mt-5"
          >
            <Fingerprint
              color={colorScheme === "dark" ? "#ccc" : "#333"}
              size={22}
            />
            <Text className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Log in with biometrics
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>

      {showModal && (
        <Modal
          animationType="fade"
          transparent
          visible={showModal}
          onRequestClose={() => setShowModal(false)}
        >
          <Pressable
            className="flex-1 bg-black/50 justify-center items-center"
            onPress={() => setShowModal(false)}
          >
            <Pressable
              className={`p-6 rounded-2xl mx-4 w-[90%] max-w-sm ${
                colorScheme === "dark" ? "bg-gray-800" : "bg-white"
              }`}
            >
              <Text
                className={`text-center mb-4 text-lg font-semibold ${
                  colorScheme === "dark" ? "text-white" : "text-black"
                }`}
              >
                Error
              </Text>
              <Text
                className={`text-center mb-6 text-base ${
                  colorScheme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {modalMessage}
              </Text>
              <TouchableOpacity
                className="py-3 rounded-lg bg-red-500"
                onPress={() => setShowModal(false)}
              >
                <Text className="text-white text-center font-semibold">OK</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}
