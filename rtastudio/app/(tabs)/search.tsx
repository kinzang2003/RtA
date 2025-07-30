import {
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { getStableColorForId } from "@/utils/color";
import { Text, View } from "@/components/Themed";

type Room = {
  id: string;
  title?: string;
  createdAt?: string;
  color?: string; // Add color property
};

type SharedFile = {
  id: string;
  room?: Room;
};

export default function Search() {
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [userProjects, setUserProjects] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roomColors, setRoomColors] = useState<Record<string, string>>({}); // Re-introduced for persistence
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();

  const fetchFromStorage = async () => {
    setRefreshing(true);
    try {
      const storedOwnedRooms = await SecureStore.getItemAsync("rooms");
      const storedInvitedRooms = await SecureStore.getItemAsync("roomInvites");
      const storedColors = await SecureStore.getItemAsync("roomColors"); // Load room colors

      const currentRoomColors: Record<string, string> = storedColors
        ? JSON.parse(storedColors)
        : {};
      let colorsUpdated = false;

      if (storedOwnedRooms) {
        const parsedOwnedRooms = JSON.parse(storedOwnedRooms);
        const ownedRoomsWithColors = parsedOwnedRooms.map((room: Room) => {
          if (!currentRoomColors[room.id]) {
            currentRoomColors[room.id] = getStableColorForId(room.id); // Assign stable color
            colorsUpdated = true;
          }
          return { ...room, color: currentRoomColors[room.id] }; // Add color to room object
        });
        setUserProjects(ownedRoomsWithColors);
      } else {
        setUserProjects([]);
      }

      if (storedInvitedRooms) {
        const parsedInvitedRooms = JSON.parse(storedInvitedRooms);
        const mappedInvitedRooms: SharedFile[] = parsedInvitedRooms.map(
          (room: Room) => {
            if (room.id && !currentRoomColors[room.id]) {
              currentRoomColors[room.id] = getStableColorForId(room.id); // Assign stable color
              colorsUpdated = true;
            }
            return {
              id: room.id,
              room: {
                ...room,
                color: room.id ? currentRoomColors[room.id] : undefined,
              }, // Add color to nested room object
            };
          }
        );
        setSharedFiles(mappedInvitedRooms);
      } else {
        setSharedFiles([]);
      }

      // Save updated colors back to SecureStore only if new colors were generated
      if (colorsUpdated) {
        await SecureStore.setItemAsync(
          "roomColors",
          JSON.stringify(currentRoomColors)
        );
      }
      setRoomColors(currentRoomColors); // Update state with latest colors
    } catch (error) {
      console.error("Error loading search data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFromStorage();
  }, []);

  const filteredSharedFiles = sharedFiles.filter((file) =>
    file.room?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUserProjects = userProjects.filter((room) =>
    room.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (refreshing) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100 dark:bg-gray-900">
        <ActivityIndicator
          size="large"
          color={colorScheme === "dark" ? "white" : "gray"}
        />
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-gray-100 dark:bg-gray-900 px-6"
      style={{ paddingTop: insets.top + 24 }}
    >
      <Text className="text-3xl font-semibold text-black dark:text-white mb-6">
        Search
      </Text>
      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Find files"
        placeholderTextColor={colorScheme === "dark" ? "#A0A0A0" : "#9ca3af"}
        className="bg-white dark:bg-placeholder px-4 py-3 rounded-xl text-base text-gray-800 dark:text-white mb-4"
      />
      <View className="mb-4 h-60 bg-transparent">
        <Text className="text-lg font-semibold mb-2 text-black dark:text-white">
          Shared with You
        </Text>
        {filteredSharedFiles.length === 0 ? (
          <Text className="text-gray-500 dark:text-gray-400 mb-0">
            No files shared with you match this search.
          </Text>
        ) : (
          <FlatList
            data={filteredSharedFiles}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.room?.id || item.id}
            style={{ flex: 1 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="mr-4"
                onPress={() => {
                  if (item.room?.id) {
                    router.push(`/canvas/${item.room.id}`);
                  }
                }}
              >
                <View
                  className="w-32 h-24 rounded-lg mb-1 justify-center items-center"
                  style={{
                    backgroundColor: item.room?.color || "#e5e7eb", // Use the assigned stable color
                  }}
                ></View>

                <Text className="text-sm font-medium text-black dark:text-white">
                  {item.room?.title || "Untitled"}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {item.room?.createdAt
                    ? `${formatDistanceToNow(
                        new Date(item.room.createdAt)
                      )} ago`
                    : "Unknown"}
                </Text>
              </TouchableOpacity>
            )}
            refreshing={refreshing}
            onRefresh={fetchFromStorage}
          />
        )}
      </View>
      <View style={{ flex: 1 }} className="bg-transparent">
        <Text className="text-lg font-semibold mt-4 mb-2 text-black dark:text-white">
          Your Projects
        </Text>
        {filteredUserProjects.length === 0 ? (
          <Text className="text-gray-500 dark:text-gray-400">
            No projects match this search.
          </Text>
        ) : (
          <FlatList
            data={filteredUserProjects}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            style={{ flex: 1 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="mb-4 flex-row items-center"
                onPress={() => {
                  router.push(`/canvas/${item.id}`);
                }}
              >
                <View
                  className="w-32 h-24 rounded-lg mr-3 justify-center items-center"
                  style={{
                    backgroundColor: item.color || "#e5e7eb", // Use the assigned stable color
                  }}
                ></View>

                <View className="flex-1 bg-transparent">
                  <Text className="text-base font-medium text-black dark:text-white">
                    {item.title}
                  </Text>
                  <Text className="text-gray-500 dark:text-gray-400 text-sm">
                    {item.createdAt
                      ? `${formatDistanceToNow(new Date(item.createdAt))} ago`
                      : "Unknown"}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            refreshing={refreshing}
            onRefresh={fetchFromStorage}
          />
        )}
      </View>
    </View>
  );
}
