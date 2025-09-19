import {
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { getStableColorForId } from "@/utils/color";
import { Text, View } from "@/components/Themed";

interface Project {
  id: string;
  name?: string;
  created_at?: string;
  color?: string;
}

export default function Search() {
  const [ownedProjects, setOwnedProjects] = useState<Project[]>([]);
  const [sharedProjects, setSharedProjects] = useState<Project[]>([]);
  const [projectColors, setProjectColors] = useState<Record<string, string>>(
    {}
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const storedOwned = await AsyncStorage.getItem("ownedProjects");
        const storedShared = await AsyncStorage.getItem("invitedProjects");
        const storedColors = await AsyncStorage.getItem("projectColors");

        const currentColors: Record<string, string> = storedColors
          ? JSON.parse(storedColors)
          : {};
        let colorsUpdated = false;

        if (storedOwned) {
          const parsedOwned: Project[] = JSON.parse(storedOwned);
          const withColors = parsedOwned.map((proj) => {
            if (!currentColors[proj.id]) {
              currentColors[proj.id] = getStableColorForId(proj.id);
              colorsUpdated = true;
            }
            return { ...proj, color: currentColors[proj.id] };
          });
          setOwnedProjects(withColors);
        }

        if (storedShared) {
          const parsedShared: Project[] = JSON.parse(storedShared);
          const withColors = parsedShared.map((proj) => {
            if (!currentColors[proj.id]) {
              currentColors[proj.id] = getStableColorForId(proj.id);
              colorsUpdated = true;
            }
            return { ...proj, color: currentColors[proj.id] };
          });
          setSharedProjects(withColors);
        }

        if (colorsUpdated) {
          await AsyncStorage.setItem(
            "projectColors",
            JSON.stringify(currentColors)
          );
          setProjectColors(currentColors);
        }
      } catch (error) {
        console.error("Error fetching projects in search:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const filteredOwned = ownedProjects.filter((p) =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredShared = sharedProjects.filter((p) =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator
          size="large"
          color={colorScheme === "dark" ? "white" : "gray"}
        />
      </View>
    );
  }

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

      {/* Shared Projects */}
      <View className="mb-6">
        <Text className="text-lg font-semibold mb-2 text-black dark:text-white">
          Shared with You
        </Text>
        {filteredShared.length === 0 ? (
          <Text className="text-gray-500 dark:text-gray-400">
            No shared projects match this search.
          </Text>
        ) : (
          <FlatList
            data={filteredShared}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="mr-4"
                onPress={() => router.push(`/project/${item.id}`)}
              >
                <View
                  className="w-32 h-24 rounded-lg mb-1 justify-center items-center"
                  style={{ backgroundColor: item.color || "#e5e7eb" }}
                />
                <Text className="text-sm font-medium text-black dark:text-white">
                  {item.name || "Untitled"}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {item.created_at
                    ? `${formatDistanceToNow(new Date(item.created_at))} ago`
                    : "Unknown"}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Owned Projects */}
      <View style={{ flex: 1 }}>
        <Text className="text-lg font-semibold mb-2 text-black dark:text-white">
          Your Projects
        </Text>
        {filteredOwned.length === 0 ? (
          <Text className="text-gray-500 dark:text-gray-400">
            No projects match this search.
          </Text>
        ) : (
          <FlatList
            data={filteredOwned}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="mb-4 flex-row items-center"
                onPress={() => router.push(`/project/${item.id}`)}
              >
                <View
                  className="w-32 h-24 rounded-lg mr-3 justify-center items-center"
                  style={{ backgroundColor: item.color || "#e5e7eb" }}
                />
                <View className="flex-1">
                  <Text className="text-base font-medium text-black dark:text-white">
                    {item.name || "Untitled"}
                  </Text>
                  <Text className="text-gray-500 dark:text-gray-400 text-sm">
                    {item.created_at
                      ? `${formatDistanceToNow(new Date(item.created_at))} ago`
                      : "Unknown"}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          />
        )}
      </View>
    </View>
  );
}
