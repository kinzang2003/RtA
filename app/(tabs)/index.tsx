import React, { useEffect, useState, useCallback } from "react";
import { FlatList, TouchableOpacity, Image, RefreshControl, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, View } from "@/components/Themed";
import { useTheme } from "@/lib/theme";
import { useData } from "@/lib/data-provider";
import { useAuthUser } from "@/lib/auth-store";

function timeAgo(date?: string) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 36e5);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Recents() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const user = useAuthUser();
  const { allProjects, isLoadingProjects, projectsError, refreshProjects } = useData();

  // Show 10 most recent
  const recentProjects = allProjects
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10);

  // Show loading state while projects are being fetched
  if (isLoadingProjects && allProjects.length === 0) {
    return (
      <View className="flex-1 justify-center items-center" style={{ paddingTop: insets.top + 24 }}>
        <ActivityIndicator size="large" color={colorScheme === "dark" ? "white" : "black"} />
        <Text className="mt-4 text-neutral-500">Loading projects...</Text>
      </View>
    );
  }

  // Show a recoverable error state (real-world: never spinner forever)
  if (!!projectsError && allProjects.length === 0) {
    return (
      <View className="flex-1 justify-center items-center px-6" style={{ paddingTop: insets.top + 24 }}>
        <Text className="text-neutral-500 text-center mb-4">
          {projectsError}
        </Text>
        <TouchableOpacity
          onPress={refreshProjects}
          className="bg-gray-900 py-3 px-6 rounded-lg"
          activeOpacity={0.85}
        >
          <Text className="text-white font-semibold">Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 px-6" style={{ paddingTop: insets.top + 24 }}>
      <Text className="text-3xl font-semibold mb-6">Recents</Text>

      <FlatList
        data={recentProjects}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingProjects}
            onRefresh={refreshProjects}
            tintColor={colorScheme === "dark" ? "white" : "black"}
          />
        }
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/project/${item.id}`)}
            activeOpacity={0.85}
          >
            <View className="flex-row items-center p-4 mb-3 rounded-xl bg-white dark:bg-neutral-900">
              {/* Thumbnail */}
              <View className="w-32 h-24 rounded-lg bg-neutral-100 dark:bg-neutral-800 overflow-hidden justify-center items-center mr-4 flex-shrink-0">
                {item.thumbnail_url ? (
                  <Image
                    source={{ uri: item.thumbnail_url }}
                    className="w-32 h-24"
                    resizeMode="cover"
                  />
                ) : (
                  <Text className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
                    No thumbnail
                  </Text>
                )}
              </View>

              {/* Info */}
              <View className="flex-1 bg-transparent justify-center">
                <View className="flex-row items-center gap-2 mb-1">
                  <Text className="text-base font-semibold flex-1">
                    {item.name}
                  </Text>
                  {item.access_type === "collaborated" && (
                    <View className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900">
                      <Text className="text-xs text-blue-600 dark:text-blue-300">
                        Shared
                      </Text>
                    </View>
                  )}
                </View>

                {!!item.description && (
                  <Text
                    className="text-sm text-neutral-500 mb-1"
                    numberOfLines={1}
                  >
                    {item.description}
                  </Text>
                )}
              </View>

              {/* Meta - Right side */}
              <Text className="text-xs text-neutral-400 ml-3">
                {timeAgo(item.updated_at)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View className="items-center mt-12">
            <Text className="text-neutral-500 text-lg">
              No recent projects
            </Text>
          </View>
        )}
      />
    </View>
  );
}
