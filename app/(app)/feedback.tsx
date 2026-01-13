import React, { useState, useEffect } from "react";
import {
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, View } from "@/components/Themed";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useData } from "@/lib/data-provider";
import { useAuthUser } from "@/lib/auth-store";
import { logger } from "@/lib/logger";

// Define the type for a single picked image
type PickedImage = {
  uri: string;
  name: string;
  type: string;
};

export default function FeedbackForm() {
  const router = useRouter();
  const { colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Use DataProvider and auth for user data - instant load!
  const { userProfile } = useData();
  const user = useAuthUser();
  
  const email = userProfile?.email || "";
  const userId = user?.id || "";

  const [subject, setSubject] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [images, setImages] = useState<PickedImage[]>([]); // Changed to an array
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
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

  const handleSubmit = async () => {
    if (
      !email.trim() ||
      !subject.trim() ||
      !description.trim() ||
      images.length === 0
    ) {
      Alert.alert("Missing Information", "All fields are required, including at least one image.");
      return;
    }

    if (!userId) {
      Alert.alert("Error", "User ID not found. Please try logging in again.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload first image to Supabase Storage (same pattern as web profile)
      const firstImage = images[0];
      const fileExt = firstImage.name.split('.').pop() || 'jpg';
      const fileName = `feedback-${userId}-${Date.now()}.${fileExt}`;
      const bucket = 'feedback-images';
      
      // Fix contentType - ensure it's a valid MIME type
      const contentType = firstImage.type && firstImage.type.includes('/') 
        ? firstImage.type 
        : `image/${fileExt === 'png' ? 'png' : 'jpeg'}`;

      logger.debug("[Feedback] Uploading", { fileName, contentType });

      // Fetch the image as a blob and convert to arrayBuffer (React Native requirement)
      const response = await fetch(firstImage.uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      logger.debug("[Feedback] Image size", { bytes: arrayBuffer.byteLength });

      // Upload to Supabase Storage with upsert: true (like web profile)
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, arrayBuffer, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        logger.error("[Feedback] Upload error details", uploadError);
        throw uploadError;
      }

      logger.debug("[Feedback] Upload successful");

      // Get public URL
      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
      const imageUrl = data.publicUrl;

      // Avoid logging URLs in production.
      logger.debug("[Feedback] Public URL resolved");

      // Insert feedback record
      const { error: insertError } = await supabase
        .from('feedback')
        .insert({
          email: email.trim(),
          subject: subject.trim(),
          description: description.trim(),
          image: imageUrl,
          account_id: userId,
        });

      if (insertError) {
        logger.error("[Feedback] Insert error", insertError);
        throw insertError;
      }

      logger.debug("[Feedback] Record inserted successfully");

      Alert.alert("Success", "Your feedback has been submitted successfully!");
      setSubject("");
      setDescription("");
      setImages([]);
      router.replace("/(app)/(tabs)/profile");
    } catch (error: any) {
      logger.error("[Feedback] Submission failed", error);
      
      // Simple user-friendly error message
      Alert.alert(
        "Submission Failed", 
        "Unable to submit feedback. Please check your internet connection and try again."
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
          <Text className="pb-2 mb-4 text-black dark:text-white">
            {email || "Loading..."}
          </Text>

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
