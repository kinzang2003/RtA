import React, { useState } from "react";
import {
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, View } from "@/components/Themed";
import { useData } from "@/lib/data-provider";
import { useTheme } from "@/lib/theme";

export default function Search() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  
  // Use global data - loads instantly!
  const { 
    ownedProjects, 
    collaboratedProjects, 
    isLoadingProjects, 
    refreshProjects 
  } = useData();

  const filteredOwned = ownedProjects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredShared = collaboratedProjects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View className="flex-1 px-6" style={{ paddingTop: insets.top + 24 }}>
      <Text className="text-3xl font-semibold text-black dark:text-white mb-6">
        Search
      </Text>

      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Find projects"
        placeholderTextColor={colorScheme === "dark" ? "#FFFFFF" : "#9ca3af"}
        className="bg-white dark:bg-placeholder px-4 py-3 rounded-xl text-base mb-6"
      />

      {filteredShared.length > 0 && (
        <>
          <Text className="text-lg font-semibold text-black dark:text-white mb-3">
            Shared Projects
          </Text>
          <FlatList
            data={filteredShared}
            horizontal
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={isLoadingProjects}
                onRefresh={refreshProjects}
                tintColor={colorScheme === "dark" ? "white" : "black"}
              />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                className="mr-4"
                onPress={() => router.push(`/project/${item.id}`)}
              >
                <View className="w-32 h-24 rounded-lg mb-1 overflow-hidden justify-center items-center bg-indigo-200 dark:bg-indigo-900">
                  {item.thumbnail_url ? (
                    <Image
                      source={{ uri: item.thumbnail_url }}
                      className="w-32 h-24"
                      resizeMode="cover"
                    />
                  ) : (
                    <Text className="text-xs text-gray-500 dark:text-gray-400">
                      No thumbnail
                    </Text>
                  )}
                </View>
                <Text className="text-sm font-medium text-black dark:text-white">
                  {item.name || "Untitled"}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {item.updated_at ? (
                    <>
                      {Date.now() - new Date(item.updated_at).getTime() < 3600000
                        ? "Just now"
                        : Date.now() - new Date(item.updated_at).getTime() < 86400000
                        ? `${Math.floor((Date.now() - new Date(item.updated_at).getTime()) / 3600000)}h ago`
                        : `${Math.floor((Date.now() - new Date(item.updated_at).getTime()) / 86400000)}d ago`}
                    </>
                  ) : null}
                </Text>
              </TouchableOpacity>
            )}
          />
        </>
      )}

      {filteredOwned.length > 0 && (
        <>
          <Text className="text-lg font-semibold text-black dark:text-white mb-3 mt-6">
            Owned Projects
          </Text>
          <FlatList
            data={filteredOwned}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={isLoadingProjects}
                onRefresh={refreshProjects}
                tintColor={colorScheme === "dark" ? "white" : "black"}
              />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                className="mb-4 flex-row items-center"
                onPress={() => router.push(`/project/${item.id}`)}
              >
                <View className="w-32 h-24 rounded-lg mr-3 overflow-hidden justify-center items-center bg-green-200 dark:bg-green-900">
                  {item.thumbnail_url ? (
                    <Image
                      source={{ uri: item.thumbnail_url }}
                      className="w-32 h-24"
                      resizeMode="cover"
                    />
                  ) : (
                    <Text className="text-xs text-gray-500 dark:text-gray-400">
                      No thumbnail
                    </Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium text-black dark:text-white">
                    {item.name || "Untitled"}
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {item.updated_at ? (
                      <>
                        {Date.now() - new Date(item.updated_at).getTime() < 3600000
                          ? "Just now"
                          : Date.now() - new Date(item.updated_at).getTime() < 86400000
                          ? `${Math.floor((Date.now() - new Date(item.updated_at).getTime()) / 3600000)}h ago`
                          : `${Math.floor((Date.now() - new Date(item.updated_at).getTime()) / 86400000)}d ago`}
                      </>
                    ) : null}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </>
      )}

      {filteredOwned.length === 0 && filteredShared.length === 0 && (
        <View className="flex-1 justify-center items-center mt-10">
          <Text className="text-gray-500 dark:text-gray-400 text-lg">
            No projects found
          </Text>
        </View>
      )}
    </View>
  );
}
