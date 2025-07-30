import {
  FlatList,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, View } from "@/components/Themed";
import { useColorScheme } from "nativewind";

import TextileListItem from "@/components/TextileListItem";
import { Textile } from "@/types";
import BhutanMap from "@/components/BhutanMap";

type Language = "ENG" | "DZO";

export default function ExploreScreen() {
  const router = useRouter();
  const [textiles, setTextiles] = useState<Textile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [isMapView, setIsMapView] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<Language>("ENG"); // New state for language
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();

  const handleRefresh = () => {
    setRefreshing(true);
    fetch("https://rta-server.onrender.com/api/textile")
      .then((res) => res.json())
      .then((data: Textile[]) => {
        setTextiles(data);
        setRefreshing(false);
      })
      .catch((err) => {
        console.error("Failed to refresh textiles:", err);
        setRefreshing(false);
      });
  };

  const filteredTextiles = textiles.filter(
    (item) =>
      (item.textileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.origin.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (currentLanguage === "ENG" ? item.type !== "DZO" : item.type === "DZO") // Filter based on language
  );

  useEffect(() => {
    fetch("https://rta-server.onrender.com/api/textile")
      .then((res) => res.json())
      .then((data: Textile[]) => {
        setTextiles(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch textiles:", err);
        setLoading(false);
      });
  }, []);

  const renderItem = ({ item }: { item: Textile }) => (
    <TextileListItem
      item={item}
      language={currentLanguage} // Pass the current language to the list item
      onPress={() =>
        router.push({
          pathname: "/explore/[id]",
          params: { id: item.id, textile: JSON.stringify(item) },
        })
      }
    />
  );

  const toggleLanguage = () => {
    setCurrentLanguage((prevLang) => (prevLang === "ENG" ? "DZO" : "ENG"));
  };

  const placeholderText =
    currentLanguage === "ENG"
      ? "Type in a pattern or dzongkhag"
      : "དཔེ་རིས་དང་རྫོང་ཁག་གི་མིང་བཙུགས་དགོ།"; // Dzongkha for "Type in a pattern or dzongkhag"

  // Tailwind classes for Dzongkha font and increased size
  const dzongkhaTextClass =
    currentLanguage === "DZO" ? "font-dzongkha text-xl" : "";
  const dzongkhaTitleClass =
    currentLanguage === "DZO" ? "font-dzongkha text-6xl" : "";
  const dzongkhaButtonTextClass =
    currentLanguage === "DZO" ? "font-dzongkha text-4xl" : "";
  const dzongkhaPlaceholderClass =
    currentLanguage === "DZO" ? "font-dzongkha text-5xl" : "";

  return (
    <View
      className="flex-1 px-6 bg-gray-100 dark:bg-gray-900"
      style={{ paddingTop: insets.top + 24 }}
    >
      <TouchableOpacity onPress={toggleLanguage}>
        <Text
          className={`text-3xl font-semibold mb-6 text-black dark:text-white ${dzongkhaTitleClass}`}
        >
          {currentLanguage === "ENG" ? "Explore" : "འཚོལ་ཞིབ།"}
        </Text>
      </TouchableOpacity>

      <View className="flex-row mb-6">
        <TouchableOpacity
          className={`${
            isMapView
              ? "bg-gray-200 dark:bg-gray-700"
              : "bg-red-200 dark:bg-red-900"
          } px-4 py-2 rounded-lg mr-2`}
          onPress={() => setIsMapView(false)}
        >
          <Text
            className={`${
              isMapView
                ? "text-gray-600 dark:text-gray-400"
                : "text-red-500 dark:text-red-300"
            } font-semibold ${dzongkhaButtonTextClass}`}
          >
            {currentLanguage === "ENG" ? "List" : "ཐོ་བུམ་"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`${
            isMapView
              ? "bg-red-200 dark:bg-red-900"
              : "bg-gray-200 dark:bg-gray-700"
          } px-4 py-2 rounded-lg`}
          onPress={() => setIsMapView(true)}
        >
          <Text
            className={`${
              isMapView
                ? "text-red-500 dark:text-red-300"
                : "text-gray-600 dark:text-gray-400"
            } font-semibold ${dzongkhaButtonTextClass}`}
          >
            {currentLanguage === "ENG" ? "Map" : "ས་ཁྲ་"}
          </Text>
        </TouchableOpacity>
      </View>

      {!isMapView && (
        <TextInput
          placeholder={placeholderText}
          placeholderTextColor={colorScheme === "dark" ? "#A0A0A0" : "#9ca3af"}
          className={`
            ${Platform.OS === "ios" ? "shadow-md shadow-black/25" : "elevation-5"}
            bg-white dark:bg-placeholder
            px-4 py-3 rounded-xl text-base text-gray-800 dark:text-white
            mb-6 border border-gray-200 dark:border-placeholder
            ${dzongkhaPlaceholderClass}
          `}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      )}

      {loading ? (
        <View className="flex-1 justify-center items-center bg-transparent">
          <ActivityIndicator
            size="large"
            color={colorScheme === "dark" ? "white" : "gray"}
          />
        </View>
      ) : isMapView ? (
        <View className="flex-1 justify-start items-center bg-transparent">
          <BhutanMap />
        </View>
      ) : (
        <FlatList
          refreshing={refreshing}
          onRefresh={handleRefresh}
          data={filteredTextiles}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          className="flex-1"
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
