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
import { useData } from "@/lib/data-provider";
import { useTheme } from "@/lib/theme";

import TextileListItem from "@/components/TextileListItem";
import BhutanMap from "@/components/BhutanMap";

type Language = "ENG" | "DZO";

export default function ExploreScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMapView, setIsMapView] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<Language>("ENG");
  const { colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Use global textiles data - loads instantly!
  const { textiles, isLoadingTextiles, refreshTextiles } = useData();

  const filteredTextiles = textiles.filter(
    (item) =>
      (item.textileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.origin.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (currentLanguage === "ENG" ? item.type !== "DZO" : item.type === "DZO")
  );

  const toggleLanguage = () => {
    setCurrentLanguage((prev) => (prev === "ENG" ? "DZO" : "ENG"));
  };

  const placeholderText =
    currentLanguage === "ENG"
      ? "Type in a pattern or dzongkhag"
      : "དཔེ་རིས་དང་རྫོང་ཁག་གི་མིང་བཙུགས་དགོ།";

  const dzongkhaFont = currentLanguage === "DZO" ? "font-dzongkha" : "";

  return (
    <View className="flex-1 px-6" style={{ paddingTop: insets.top + 24 }}>
      {/* Header with language switch */}
      <View className="flex-row items-center justify-between mb-6">
        <Text
          className={`text-3xl font-semibold text-black dark:text-white ${dzongkhaFont}`}
        >
          {currentLanguage === "ENG" ? "Explore" : "འཚོལ་ཞིབ།"}
        </Text>

        <TouchableOpacity
          onPress={toggleLanguage}
          className="px-3 py-1 rounded-md bg-gray-200 dark:bg-placeholder"
        >
          <Text className={`text-base font-medium ${dzongkhaFont}`}>
            {currentLanguage === "ENG" ? " རྫོང་ཁ། " : "English"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Toggle buttons */}
      <View className="flex-row mb-6">
        <TouchableOpacity
          className={`${
            !isMapView
              ? "bg-red-200 dark:bg-red-700"
              : "bg-gray-200 dark:bg-placeholder"
          } px-4 py-2 rounded-lg mr-2`}
          onPress={() => setIsMapView(false)}
        >
          <Text
            className={`${
              !isMapView
                ? "text-red-500 dark:text-red-300"
                : "text-gray-600 dark:text-gray-400"
            } font-semibold ${dzongkhaFont} leading-none`}
          >
            {currentLanguage === "ENG" ? "List" : "ཐོ་བུམ།"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`${
            isMapView
              ? "bg-red-200 dark:bg-red-700"
              : "bg-gray-200 dark:bg-placeholder"
          } px-4 py-2 rounded-lg`}
          onPress={() => setIsMapView(true)}
        >
          <Text
            className={`${
              isMapView
                ? "text-red-500 dark:text-red-300"
                : "text-gray-600 dark:text-gray-400"
            } font-semibold ${dzongkhaFont} leading-none`}
          >
            {currentLanguage === "ENG" ? "Map" : "ས་ཁྲ།"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search input */}
      {!isMapView && (
        <TextInput
          placeholder={placeholderText}
          placeholderTextColor={colorScheme === "dark" ? "#FFFFFF" : "#9ca3af"}
          className={`
            ${Platform.OS === "ios" ? "shadow-md shadow-black/25" : "elevation-5"}
            bg-white dark:bg-placeholder
            px-4 py-3 rounded-xl text-lg
            text-gray-800 dark:text-white
            mb-6 border border-gray-200 dark:border-placeholder
            ${dzongkhaFont}
          `}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      )}

      {isLoadingTextiles ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator
            size="large"
            color={colorScheme === "dark" ? "white" : "gray"}
          />
        </View>
      ) : isMapView ? (
        <View className="flex-1">
          <BhutanMap />
        </View>
      ) : (
        <FlatList
          refreshing={isLoadingTextiles}
          onRefresh={refreshTextiles}
          data={filteredTextiles}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TextileListItem
              item={item}
              language={currentLanguage}
              onPress={() =>
                router.push({
                  pathname: "/explore/[id]",
                  params: {
                    id: item.id,
                    textile: JSON.stringify(item),
                    language: currentLanguage,
                  },
                })
              }
            />
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
