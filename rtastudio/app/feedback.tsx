import React, { useState, useEffect } from "react";
import {
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList, // Import FlatList for horizontal image display
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, View } from "@/components/Themed";
import Toast from "react-native-toast-message";

// Define the type for a single picked image
type PickedImage = {
  uri: string;
  name: string;
  type: string;
};

export default function FeedbackForm() {
  const { email: routeEmail, id: routeId } = useLocalSearchParams<{
    email?: string;
    id?: string;
  }>();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [images, setImages] = useState<PickedImage[]>([]); // Changed to an array
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (routeEmail) setEmail(routeEmail);
    if (routeId) setUserId(routeId);
    else {
      (async () => {
        try {
          const storedUser = await SecureStore.getItemAsync("usedData");
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            if (parsed?.email) setEmail(parsed.email);
            if (parsed?.id) setUserId(parsed.id);
          }
        } catch (error) {
          console.error("Failed to load user data from SecureStore:", error);
        }
      })();
    }
  }, [routeEmail, routeId]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: true, // Enable multiple selection
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedAssets: PickedImage[] = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.fileName || asset.uri.split("/").pop() || "image.jpg",
        type: asset.type || "image/jpeg",
      }));
      setImages(selectedAssets); // Set the array of selected images
    }
  };

  const showToast = (
    type: "success" | "error" | "info",
    text1: string,
    text2?: string,
    onHideCallback?: () => void
  ) => {
    Toast.show({
      type: type,
      text1: text1,
      text2: text2,
      position: "bottom",
      bottomOffset: 120,
      visibilityTime: 4000,
      onHide: onHideCallback,
    });
  };

  const handleSubmit = async () => {
    if (
      !email.trim() ||
      !subject.trim() ||
      !description.trim() ||
      images.length === 0
    ) {
      showToast(
        "error",
        "Required fields missing",
        "All fields are required, including at least one image."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("id", userId);
      formData.append("subject", subject);
      formData.append("description", description);

      // Loop through the images array to append each one to the form data
      images.forEach((image, index) => {
        formData.append(`image_${index}`, {
          uri: image.uri,
          name: image.name,
          type: image.type,
        } as any);
      });

      const response = await fetch(
        "https://rta-server.onrender.com/api/feedback/userFeedback",
        {
          method: "POST",
          body: formData,
          headers: {},
        }
      );

      if (response.ok) {
        showToast(
          "success",
          "Feedback submitted!",
          "Thank you for your feedback.",
          () => router.replace("/profile")
        );
        setSubject("");
        setDescription("");
        setImages([]); // Clear the images array
      } else {
        const errorText = await response.text();
        console.log("Server error response:", errorText);
        throw new Error(errorText || "Submission failed");
      }
    } catch (error: any) {
      showToast(
        "error",
        "Submission failed",
        error.message || "An unexpected error occurred."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 relative">
      <ScrollView
        className="flex-1 px-6"
        style={{
          paddingTop: insets.top + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-8 bg-transparent">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons
              name="close"
              size={28}
              color={colorScheme === "dark" ? "white" : "black"}
            />
          </TouchableOpacity>
          <Text className="text-2xl font-semibold text-black dark:text-white">
            Feedback
          </Text>
          <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator
                color={colorScheme === "dark" ? "white" : "red"}
              />
            ) : (
              <Ionicons name="send" size={28} color="red" />
            )}
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View className="mb-6">
          <Text className="text-base font-medium text-gray-800 dark:text-gray-200 mb-2">
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor="#939393"
            className="border-b border-placeholder pb-2 mb-4 text-black dark:text-white"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text className="text-base font-medium text-gray-800 dark:text-gray-200 mb-2">
            Subject
          </Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="Give the primary subject of the issue"
            placeholderTextColor="#939393"
            className="border-b border-placeholder pb-2 mb-4 text-black dark:text-white"
          />

          <Text className="text-base font-medium mb-2">Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Be as detailed as possible. What did you expect and what happened instead?"
            placeholderTextColor="#939393"
            multiline
            numberOfLines={6}
            className="border-b border-placeholder pb-2 mb-4 text-base text-black dark:text-white"
            textAlignVertical="top"
          />
        </View>

        {/* Select Image Button */}
        <View className="py-4 bg-transparent">
          <TouchableOpacity
            onPress={handlePickImage}
            className="flex-row items-center justify-center gap-2 p-4 border border-dashed border-red-400 dark:border-red-600 rounded-md"
          >
            <Ionicons name="image-outline" size={24} color="red" />
            <Text className="text-sm">Select image(s)</Text>
          </TouchableOpacity>
        </View>

        {/* Image Preview - Conditionally rendered with a FlatList for multiple images */}
        {images.length > 0 && (
          <View className="mt-4 mb-4">
            <FlatList
              horizontal
              data={images}
              renderItem={({ item }) => (
                <View className="mr-2">
                  <Image
                    source={{ uri: item.uri }}
                    style={{ width: 100, height: 100, borderRadius: 8 }}
                  />
                </View>
              )}
              keyExtractor={(item) => item.uri}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
