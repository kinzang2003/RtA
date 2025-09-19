import React, { useEffect, useState } from "react";
import { FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, View } from "@/components/Themed";

type Project = {
  id: string;
  name: string;
  designer?: string;
  created_at?: string;
  source: "owned" | "shared"; // NEW → track where it comes from
};

const Recents = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const storedOwned = await AsyncStorage.getItem("ownedProjects");
        const storedShared = await AsyncStorage.getItem("invitedProjects");

        const owned: Project[] = storedOwned
          ? JSON.parse(storedOwned).map((p: any) => ({ ...p, source: "owned" }))
          : [];

        const shared: Project[] = storedShared
          ? JSON.parse(storedShared).map((p: any) => ({
              ...p,
              source: "shared",
            }))
          : [];

        // merge + sort by most recent
        const merged = [...owned, ...shared].sort(
          (a, b) =>
            new Date(b.created_at || "").getTime() -
            new Date(a.created_at || "").getTime()
        );

        // take only 10 recent
        setProjects(merged.slice(0, 10));
      } catch (err) {
        console.error("Failed to load projects:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-gray-950">
        <ActivityIndicator
          size="large"
          color={colorScheme === "dark" ? "white" : "black"}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 px-6" style={{ paddingTop: insets.top + 24 }}>
      <Text className="text-3xl font-semibold text-black dark:text-white mb-6">
        Recents
      </Text>

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/project/${item.id}`)}>
            <View className="flex-row p-5 rounded-lg mb-3 items-center bg-white dark:bg-gray-800">
              <View className="flex-1 bg-transparent">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {item.name}
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {item.designer || "Unknown"}{" "}
                  {item.source === "shared" && (
                    <Text className="text-xs text-indigo-500">(Shared)</Text>
                  )}
                </Text>
              </View>
              <Text className="text-xs text-gray-400 dark:text-gray-500 text-right">
                {item.created_at
                  ? new Date(item.created_at).toLocaleDateString()
                  : ""}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View className="flex-1 justify-center items-center mt-10 bg-transparent">
            <Text className="text-gray-500 dark:text-gray-400 text-lg">
              No recent projects.
            </Text>
          </View>
        )}
      />
    </View>
  );
};

export default Recents;
