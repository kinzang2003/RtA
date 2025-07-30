import React, { useEffect, useState } from "react";
import { FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Menu, Provider } from "react-native-paper";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, View } from "@/components/Themed";
import { getStableColorForId } from "@/utils/color"; // Import getStableColorForId

type Room = {
  id: string;
  title: string;
  designer: string;
  image: string; // This will store the assigned color
  lastViewedAt?: string;
};

const Recents = () => {
  const [rooms, setRooms] = useState<Array<Room & { name: string }>>([]);
  const [sortBy, setSortBy] = useState("recent");
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadRooms = async () => {
      try {
        const storedOwnedRooms = await SecureStore.getItemAsync("rooms");
        const storedInvitedRooms =
          await SecureStore.getItemAsync("roomInvites");

        const parsedOwnedRooms = storedOwnedRooms
          ? JSON.parse(storedOwnedRooms)
          : [];
        const parsedInvitedRooms = storedInvitedRooms
          ? JSON.parse(storedInvitedRooms)
          : [];

        const allRooms = [...parsedOwnedRooms, ...parsedInvitedRooms];

        const storedColors = await SecureStore.getItemAsync("roomColors");
        const roomColors: Record<string, string> = storedColors
          ? JSON.parse(storedColors)
          : {};

        let colorsUpdated = false;

        const augmentedRooms = allRooms.map(
          (room: { id: string; title: string }) => {
            if (!roomColors[room.id]) {
              roomColors[room.id] = getStableColorForId(room.id); // Assign stable color
              colorsUpdated = true;
            }

            return {
              id: room.id,
              title: room.title,
              name: room.title || "Untitled",
              designer: "John Doe", // Placeholder, ideally from backend
              image: roomColors[room.id], // Use the assigned color for the 'image' property
              lastViewedAt: new Date().toISOString(), // This will be current time, not actual last viewed
            };
          }
        );

        if (colorsUpdated) {
          await SecureStore.setItemAsync(
            "roomColors",
            JSON.stringify(roomColors)
          );
        }

        setRooms(augmentedRooms);
      } catch (err) {
        console.error("Failed to load rooms:", err);
      } finally {
        setLoading(false);
      }
    };

    loadRooms();
  }, []);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const sortedRooms = [...rooms].sort((a, b) => {
    if (sortBy === "alphabet") return a.name.localeCompare(b.name);
    const dateA = a.lastViewedAt ? new Date(a.lastViewedAt).getTime() : 0;
    const dateB = b.lastViewedAt ? new Date(b.lastViewedAt).getTime() : 0;
    return dateB - dateA;
  });

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
    <Provider>
      <View
        className="flex-1 px-6 bg-black dark:bg-gray-900" // Added dark mode background
        style={{ paddingTop: insets.top + 24 }}
      >
        <View className="flex-row justify-between items-center mb-6 bg-transparent">
          <Text className="text-3xl font-semibold text-black dark:text-white">
            Recents
          </Text>
          <Menu
            visible={menuVisible}
            onDismiss={closeMenu}
            anchor={
              <TouchableOpacity onPress={openMenu}>
                <MaterialIcons
                  name="sort"
                  size={24}
                  color={colorScheme === "dark" ? "white" : "black"}
                />
              </TouchableOpacity>
            }
            contentStyle={{
              backgroundColor: colorScheme === "dark" ? "#374151" : "#FFFFFF",
            }}
          >
            <Menu.Item
              onPress={() => {
                setSortBy("alphabet");
                closeMenu();
              }}
              title={
                <Text className="text-gray-900 dark:text-gray-100">
                  Sort by Alphabet
                </Text>
              }
            />
            <Menu.Item
              onPress={() => {
                setSortBy("recent");
                closeMenu();
              }}
              title={
                <Text className="text-gray-900 dark:text-gray-100">
                  Sort by Recently Viewed
                </Text>
              }
            />
          </Menu>
        </View>

        <FlatList
          data={sortedRooms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                router.push(`/canvas/${item.id}`);
              }}
            >
              <View className="flex-row p-5 rounded-lg mb-3 items-center bg-white dark:bg-gray-800">
                <View className="flex-row flex-1 items-center bg-transparent">
                  <View
                    className="w-32 h-24 rounded-lg mr-3 justify-center items-center"
                    style={{
                      backgroundColor: item.image, // Use the assigned stable color
                    }}
                  ></View>
                  <View className="bg-transparent">
                    <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {item.name}
                    </Text>
                    <Text className="text-sm text-gray-600 dark:text-gray-400">
                      {item.designer}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-gray-400 dark:text-gray-500 text-right">
                  {item.lastViewedAt
                    ? new Date(item.lastViewedAt).toLocaleTimeString()
                    : "No recent activity"}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 50 }}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View className="flex-1 justify-center items-center mt-10 bg-transparent">
              <Text className="text-gray-500 dark:text-gray-400 text-lg">
                No rooms found.
              </Text>
            </View>
          )}
        />
      </View>
    </Provider>
  );
};

export default Recents;
