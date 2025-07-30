import React, { useState, useEffect } from "react";
import {
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, View } from "@/components/Themed"; // Assuming this imports Themed Text and View

// Define the type for the picked image
type PickedImage = {
  uri: string;
  name: string;
  type: string;
};

export default function FeedbackForm() {
  // Destructure params, ensuring they are strings or undefined
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
  const [image, setImage] = useState<PickedImage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalMessage, setModalMessage] = useState<string>("");
  const [modalTitle, setModalTitle] = useState<string>("");
  const [modalType, setModalType] = useState<"success" | "error" | "info">(
    "info"
  );

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
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const pickedAsset = result.assets[0];
      setImage({
        uri: pickedAsset.uri,
        name:
          pickedAsset.fileName ||
          pickedAsset.uri.split("/").pop() ||
          "image.jpg",
        type: pickedAsset.type || "image/jpeg",
      });
    }
  };

  const showCustomModal = (
    title: string,
    message: string,
    type: "success" | "error" | "info"
  ) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!email.trim() || !subject.trim() || !description.trim() || !image) {
      showCustomModal(
        "Error",
        "All fields are required, including an image.",
        "error"
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
      if (image) {
        formData.append("image", {
          uri: image.uri,
          name: image.name,
          type: image.type,
        } as any);
      }

      const response = await fetch(
        "https://rta-server.onrender.com/api/feedback/userFeedback",
        {
          method: "POST",
          body: formData,
          headers: {},
        }
      );

      if (response.ok) {
        showCustomModal(
          "Success",
          "Feedback submitted successfully",
          "success"
        );
        setSubject("");
        setDescription("");
        setImage(null);
      } else {
        const errorText = await response.text();
        console.log("Server error response:", errorText);
        throw new Error(errorText || "Submission failed");
      }
    } catch (error: any) {
      showCustomModal(
        "Error",
        error.message || "An unexpected error occurred.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getButtonColorClass = () => {
    switch (modalType) {
      case "success":
        return "bg-green-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-blue-500";
    }
  };

  return (
    <View className="flex-1 relative">
      <ScrollView
        className="flex-1 px-6"
        style={{
          paddingTop: insets.top + 24,
          // Add padding to the bottom of the ScrollView to make space for the fixed button
          paddingBottom: 100 + insets.bottom, // Adjust 100px based on button height + desired spacing
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
        <View className="mb-6 bg-transparent">
          <Text className="text-base font-medium text-gray-800 dark:text-gray-200 mb-2">
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={
              colorScheme === "dark" ? "#A0A0A0" : "#9ca3af"
            }
            className="border-b border-gray-300 dark:border-placeholder pb-2 mb-4 text-black dark:text-white"
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
            placeholderTextColor={
              colorScheme === "dark" ? "#A0A0A0" : "#9ca3af"
            }
            className="border-b border-gray-300 dark:border-placeholder pb-2 mb-4 text-black dark:text-white"
          />

          <Text className="text-base font-medium text-gray-800 dark:text-gray-200 mb-2">
            Description
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Be as detailed as possible. What did you expect and what happened instead?"
            placeholderTextColor={
              colorScheme === "dark" ? "#A0A0A0" : "#9ca3af"
            }
            multiline
            numberOfLines={6}
            className="border-b border-gray-300 dark:border-placeholder pb-2 mb-4 text-base text-black dark:text-white"
            textAlignVertical="top"
          />
        </View>

        {/* Image Preview (if image is selected) - Moved inside ScrollView but above button for better flow */}
        {image && (
          <Image
            source={{ uri: image.uri }}
            style={{ width: "100%", height: 240, borderRadius: 8 }}
            className="mb-4" // Keep some margin if it's not the last element
          />
        )}
      </ScrollView>

      {/* Select Image Button - Fixed at the bottom of the screen */}
      <View
        className="absolute bottom-0 left-0 right-0 px-6 py-4 bg-gray-100 dark:bg-gray-800"
        style={{ paddingBottom: insets.bottom + 16 }} // Add safe area inset to bottom padding
      >
        <TouchableOpacity
          onPress={handlePickImage}
          className="flex-row items-center justify-center gap-2 p-4 border border-dashed border-red-400 dark:border-red-600 rounded-md"
        >
          <Ionicons name="image-outline" size={24} color="red" />
          <Text className="text-sm text-gray-800 dark:text-gray-200">
            Select image
          </Text>
        </TouchableOpacity>
      </View>

      {/* Custom Modal for Alerts */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showModal}
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center"
          onPress={() => {
            setShowModal(false);
            if (modalType === "success") {
              router.replace("/profile");
            }
          }}
        >
          <Pressable
            className={`p-6 rounded-2xl mx-4 w-[90%] max-w-sm ${
              colorScheme === "dark" ? "bg-gray-700" : "bg-white"
            }`}
          >
            <Text
              className={`text-center mb-4 text-lg font-semibold ${
                colorScheme === "dark" ? "text-white" : "text-black"
              }`}
            >
              {modalTitle}
            </Text>
            <Text
              className={`text-center mb-6 text-base ${
                colorScheme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}
            >
              {modalMessage}
            </Text>
            <TouchableOpacity
              className={`py-3 rounded-lg ${getButtonColorClass()}`}
              onPress={() => {
                setShowModal(false);
                if (modalType === "success") {
                  router.replace("/profile");
                }
              }}
            >
              <Text className="text-white text-center font-semibold">OK</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
