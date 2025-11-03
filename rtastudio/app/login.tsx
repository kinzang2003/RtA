import {
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { images } from "@/constants/images";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, View } from "@/components/Themed";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleAuth = async () => {
    try {
      const redirectUrl = Linking.createURL("auth");
      const authUrl = `https://rtastudio.rtabhutan.org/auth?app_redirect=${encodeURIComponent(redirectUrl)}`;

      // Open authentication in in-app browser (collapsible modal)
      await WebBrowser.openBrowserAsync(authUrl);
    } catch (error) {
      console.error("Failed to open browser for authentication:", error);
      // You could show an alert or toast here if needed
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={() => {}}>
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

          <TouchableOpacity
            onPress={handleAuth}
            className="bg-gray-900 py-3 px-6 rounded-lg w-[90%] mt-2 mb-4 flex-row justify-center items-center"
          >
            <Text
              className="text-center font-semibold text-base"
              lightColor="#ffffff"
            >
              Log in
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleAuth}
            className="bg-blue-600 py-3 px-6 rounded-lg w-[90%] flex-row justify-center items-center"
          >
            <Text
              className="text-center font-semibold text-base"
              lightColor="#ffffff"
            >
              Sign up
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
