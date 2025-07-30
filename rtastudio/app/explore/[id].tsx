import { useEffect, useState, useMemo } from "react";
import {
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StyleSheet, // Used for StyleSheet.absoluteFillObject
} from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import RenderHtml from "react-native-render-html";
import { router, useLocalSearchParams } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { Text, View } from "@/components/Themed"; // Using your Themed components
import { LinearGradient } from "expo-linear-gradient";
import { useColorScheme } from "nativewind"; // To get current color scheme

const { width } = Dimensions.get("window");

interface Motif {
  id: string;
  name: string;
  imageUrl: string;
}

interface Technique {
  id: string;
  technique: string;
}

interface TextileFormData {
  id: string;
  textileName: string;
  origin: string;
  duration: string;
  description: string;
  weavingProcesses: string;
  status: string;
  image: string;
  motifImage: string;
  symbolismImage: string;
  originImage: string;
  weavingTechniqueImage: string;
  symbolismText: string;
  weavingTechniqueText: string;
  techniques: Technique[];
  motifs: Motif[];
}

export default function TextileDetailScreen() {
  const { id, textile: textileParam } = useLocalSearchParams();
  const [textile, setTextile] = useState<TextileFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    motifs: false,
    processes: false,
  });
  const { colorScheme } = useColorScheme(); // Get current color scheme

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  useEffect(() => {
    const initialize = async () => {
      if (textileParam) {
        try {
          const parsed: TextileFormData = JSON.parse(textileParam as string);
          setTextile(parsed);
          setLoading(false);
          return;
        } catch (err) {
          setError("Failed to parse textile data");
          setLoading(false);
          return;
        }
      }

      try {
        // IMPORTANT: Replace 'https://your-api.com/textile/' with your actual API endpoint
        const response = await fetch(
          `https://rta-server.onrender.com/api/textile/${id}`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const [data]: TextileFormData[] = await response.json();
        setTextile(data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch textile data:", err);
        setError("Failed to fetch textile data");
        setLoading(false);
      }
    };

    initialize();
  }, [id, textileParam]);

  // Define HTML tags styles for RenderHtml to support dark mode using useMemo
  const tagsStyles = useMemo(
    () => ({
      p: {
        color: colorScheme === "dark" ? "#D1D5DB" : "#374151", // text-gray-300 dark:text-gray-700
        fontSize: 14,
        lineHeight: 22,
      },
      // Add other HTML tag styles as needed for dark mode
    }),
    [colorScheme]
  ); // Re-create only if colorScheme changes

  if (loading)
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator
          size="large"
          color={colorScheme === "dark" ? "white" : "gray"}
        />
      </View>
    );
  if (error || !textile)
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="mt-12 text-center text-red-500 dark:text-red-300">
          {error ?? "Textile not found"}
        </Text>
      </View>
    );

  return (
    // Ensure the ScrollView's parent View uses Themed.View for background consistency
    <View className="flex-1">
      <ScrollView className="p-6 pt-10">
        {" "}
        {/* Adjusted padding to match 26px */}
        <View className="border-b border-gray-200 dark:border-gray-700 h-12 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()}>
            <FontAwesome
              name="angle-left"
              size={24}
              color={colorScheme === "dark" ? "white" : "black"} // Dynamic color for icon
              className="mr-3" // Using Tailwind for margin
            />
          </TouchableOpacity>
          <Text className="font-bold text-2xl flex-1">
            {textile.textileName}
          </Text>
        </View>
        {/* Description (Museum-style Glass Box with Gradient) */}
        <Text className="font-bold text-base mt-6 mb-2">Description</Text>
        <GlassDescriptionContainer>
          <Text className="text-sm leading-tight text-gray-800 dark:text-gray-200">
            {" "}
            {/* Use Tailwind classes for text */}
            {textile.description}
          </Text>
        </GlassDescriptionContainer>
        {/* Textile Image */}
        <Text className="font-bold text-base mt-4 mb-0">Textile</Text>
        <View className="pt-1">
          {" "}
          {/* Adjusted to pt-1 for 4px */}
          <Image
            source={{ uri: textile.image }}
            className="w-full h-auto aspect-square -mt-16 -mb-8" // Using Tailwind, adjusted negative margins
            contentFit="contain" // Renamed resizeMode to contentFit for expo-image
          />
        </View>
        {/* Motifs */}
        {textile.motifs?.length > 0 && (
          <>
            <SectionHeader
              title="Motifs"
              section="motifs"
              expanded={expandedSections.motifs}
              toggleSection={toggleSection}
            />
            {expandedSections.motifs && (
              <View className="my-2">
                {" "}
                {/* marginVertical: 10 => my-2.5 */}
                <View className="p-2.5">
                  {" "}
                  {/* padding: 10 => p-2.5 */}
                  <View className="flex-row flex-wrap justify-between">
                    {textile.motifs.map((motif) => (
                      <View
                        key={motif.id}
                        className="w-[48%] mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-2 items-center" // Added background and padding for motifs
                      >
                        <Image
                          source={{ uri: motif.imageUrl }}
                          className="w-full h-[150px] rounded-lg"
                          contentFit="cover" // Renamed resizeMode to contentFit
                        />
                        <Text className="mt-1.5 text-center text-gray-800 dark:text-gray-200">
                          {motif.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </>
        )}
        {/* Weaving Techniques and Processes */}
        <SectionHeader
          title="Weaving Techniques and Processes"
          section="processes"
          expanded={expandedSections.processes}
          toggleSection={toggleSection}
        />
        {expandedSections.processes && (
          <View className="my-2">
            <RenderHtml
              contentWidth={width - 52} // 26px padding on each side for ScrollView.
              source={{ html: `<p>${textile.weavingProcesses}</p>` }}
              tagsStyles={tagsStyles} // Apply theme-aware styles here
              baseStyle={{ padding: 10 }} // Consider removing this if tagsStyles handle everything
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// SectionHeader component
function SectionHeader({
  title,
  section,
  expanded,
  toggleSection,
}: {
  title: string;
  section: string;
  expanded?: boolean;
  toggleSection: (section: string) => void;
}) {
  const { colorScheme } = useColorScheme(); // Get current color scheme
  return (
    <TouchableOpacity
      onPress={() => toggleSection(section)}
      className="h-11 justify-center flex-row items-center border-b border-gray-200 dark:border-gray-700"
    >
      <Text className="font-bold text-base flex-1">{title}</Text>
      <FontAwesome
        name={expanded ? "angle-up" : "angle-down"}
        size={20}
        color={colorScheme === "dark" ? "white" : "black"} // Dynamic color for icon
      />
    </TouchableOpacity>
  );
}

// NEW GlassDescriptionContainer with gradient and improved glass effect (no rounded edges)
function GlassDescriptionContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  const { colorScheme } = useColorScheme();

  // Define colors based on theme for the new effect
  const borderColor =
    colorScheme === "dark"
      ? "rgba(70, 70, 70, 0.4)"
      : "rgba(200, 200, 200, 0.4)"; // Subtle border
  const blurBackgroundColor =
    colorScheme === "dark"
      ? "rgba(30, 30, 30, 0.05)"
      : "rgba(255, 255, 255, 0.05)"; // Very subtle transparent background
  const shadowColor = colorScheme === "dark" ? "#000" : "#A0A0A0"; // Darker shadow for dark mode

  return (
    <View
      style={{
        position: "relative",
        overflow: "hidden",
        marginVertical: 12,
        // No borderRadius for the main container
        shadowColor: shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: colorScheme === "dark" ? 0.6 : 0.2,
        shadowRadius: 10,
        elevation: 8,
        borderWidth: 1,
        borderColor: borderColor,
      }}
    >
      <BlurView
        intensity={colorScheme === "dark" ? 25 : 30} // Slightly less intense blur for a clearer look
        tint={colorScheme === "dark" ? "dark" : "light"} // Dynamic tint
        style={{
          padding: 20,
          // No borderRadius here either
          backgroundColor: blurBackgroundColor,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gradient overlay for a subtle shimmer effect */}
        <LinearGradient
          colors={
            colorScheme === "dark"
              ? [
                  "rgba(255, 255, 255, 0.03)",
                  "rgba(255, 255, 255, 0)",
                  "rgba(255, 255, 255, 0.03)",
                ]
              : [
                  "rgba(255, 255, 255, 0.1)",
                  "rgba(255, 255, 255, 0)",
                  "rgba(255, 255, 255, 0.1)",
                ]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject} // Covers the entire blur view
        />
        {/* No metallic corner circles for a cleaner look */}
        {/* Content children */}
        <View style={{ position: "relative", zIndex: 20 }}>{children}</View>
      </BlurView>
    </View>
  );
}
