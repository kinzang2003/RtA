import { useEffect, useState, useMemo } from "react";
import {
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import RenderHtml from "react-native-render-html";
import { router, useLocalSearchParams } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { Text, View } from "@/components/Themed";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/lib/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useData } from "@/lib/data-provider";

const { width } = Dimensions.get("window");

const translations = {
  ENG: {
    description: "Description",
    textile: "Textile",
    motifs: "Motifs",
    processes: "Weaving Techniques and Processes",
  },
  DZO: {
    description: "འགྲེལ་བཤད།",
    textile: "ཚོན་ཆ།",
    motifs: "དཔེ་རིས།",
    processes: "གཟུགས་རྟགས་དང་གཟུགས་སྒྲུབ།",
  },
} as const;

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
  const { id, textile: textileParam, language } = useLocalSearchParams();
  const currentLanguage = (language as "ENG" | "DZO") || "ENG";
  const [textile, setTextile] = useState<TextileFormData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    description: true,
    textileImage: true,
    motifs: false,
    processes: false,
  });
  const { colorScheme } = useTheme();
  
  // Use DataProvider textiles - loads instantly from cache!
  const { textiles, isLoadingTextiles } = useData();

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  useEffect(() => {
    const initialize = () => {
      if (textileParam) {
        try {
          const parsed: TextileFormData = JSON.parse(textileParam as string);
          setTextile(parsed);
          return;
        } catch (err) {
          setError("Failed to parse textile data");
          return;
        }
      }

      // Find textile from cached data
      const foundTextile = textiles.find(t => t.id === id);
      if (foundTextile) {
        setTextile(foundTextile as unknown as TextileFormData);
      } else if (!isLoadingTextiles) {
        setError("Textile not found");
      }
    };

    initialize();
  }, [id, textileParam, textiles, isLoadingTextiles]);

  const tagsStyles = useMemo(
    () => ({
      p: {
        color: colorScheme === "dark" ? "#D1D5DB" : "#374151",
        fontSize: 14,
        lineHeight: 22,
      },
    }),
    [colorScheme]
  );

  if (isLoadingTextiles || (!textile && !error))
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
    <View className="flex-1 px-6" style={{ paddingTop: insets.top + 24 }}>
      <ScrollView>
        <View className="border-b border-red-400 p-3 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()}>
            <FontAwesome
              name="angle-left"
              size={24}
              color={colorScheme === "dark" ? "white" : "black"}
              className="mr-3"
            />
          </TouchableOpacity>
          <Text className="font-bold text-2xl flex-1">
            {textile.textileName}
          </Text>
        </View>
        <View className="border-b border-red-400">
          {/* Description Section */}
          <SectionHeader
            title={translations[currentLanguage].description}
            section="description"
            expanded={expandedSections.description}
            toggleSection={toggleSection}
          />
          {expandedSections.description && (
            <GlassDescriptionContainer>
              <Text className="text-sm leading-tight">
                {textile.description}
              </Text>
            </GlassDescriptionContainer>
          )}
        </View>
        <View className="border-b border-red-400">
          {/* Textile Image Section */}
          <SectionHeader
            title={translations[currentLanguage].textile}
            section="textileImage"
            expanded={expandedSections.textileImage}
            toggleSection={toggleSection}
          />
          {expandedSections.textileImage && (
            <View className="pt-1">
              <Image
                source={{ uri: textile.image }}
                className="w-full h-auto aspect-square -mt-16 -mb-8"
                contentFit="contain"
              />
            </View>
          )}
        </View>

        {/* Motifs Section */}
        {textile.motifs?.length > 0 && (
          <View className="border-b border-red-400">
            <SectionHeader
              title={translations[currentLanguage].motifs}
              section="motifs"
              expanded={expandedSections.motifs}
              toggleSection={toggleSection}
            />
            {expandedSections.motifs && (
              <View className="my-2">
                <View className="p-2.5">
                  <View className="flex-row flex-wrap justify-between">
                    {textile.motifs.map((motif) => (
                      <View
                        key={motif.id}
                        className="w-[48%] mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-2 items-center"
                      >
                        <Image
                          source={{ uri: motif.imageUrl }}
                          className="w-full h-[150px] rounded-lg"
                          contentFit="cover"
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
          </View>
        )}

        {/* Weaving Techniques and Processes Section */}
        <SectionHeader
          title={translations[currentLanguage].processes}
          section="processes"
          expanded={expandedSections.processes}
          toggleSection={toggleSection}
        />
        {expandedSections.processes && (
          <View className="my-2">
            <RenderHtml
              contentWidth={width - 52}
              source={{ html: `<p>${textile.weavingProcesses}</p>` }}
              tagsStyles={tagsStyles}
              baseStyle={{ padding: 10 }}
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
  const { colorScheme } = useTheme();
  return (
    <TouchableOpacity
      onPress={() => toggleSection(section)}
      className="h-11 justify-center flex-row items-center"
    >
      <Text className="font-bold text-base flex-1">{title}</Text>
      <FontAwesome
        name={expanded ? "angle-up" : "angle-down"}
        size={20}
        color={colorScheme === "dark" ? "white" : "black"}
      />
    </TouchableOpacity>
  );
}

function GlassDescriptionContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  const { colorScheme } = useTheme();

  const borderColor =
    colorScheme === "dark"
      ? "rgba(70, 70, 70, 0.4)"
      : "rgba(200, 200, 200, 0.4)";
  const shadowColor = colorScheme === "dark" ? "#000" : "#A0A0A0";

  const gradientColors: [string, string] =
    colorScheme === "dark"
      ? ["rgba(255, 255, 255, 0.4)", "rgba(255, 255, 255, 0)"]
      : ["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.4)"];

  return (
    <View
      style={{
        position: "relative",
        overflow: "hidden",
        marginVertical: 12,
        shadowColor: shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: colorScheme === "dark" ? 0.6 : 0.2,
        shadowRadius: 10,
        elevation: 8,
        borderWidth: 1,
        borderColor: borderColor,
        width: "90%",
        alignSelf: "center",
      }}
    >
      {/* Gradient overlay */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          ...StyleSheet.absoluteFillObject,
          opacity: 0.5,
        }}
      />

      {/* Blur background */}
      <BlurView
        intensity={colorScheme === "dark" ? 25 : 30}
        tint={colorScheme === "dark" ? "dark" : "light"}
        style={{
          padding: 20,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Content */}
        <View
          style={{
            position: "relative",
            zIndex: 20,
            backgroundColor: "transparent",
          }}
        >
          {children}
        </View>
      </BlurView>

      {/* Nails in corners */}
      <Image
        source={require("@/assets/images/nail.png")}
        style={{
          position: "absolute",
          top: 5,
          left: 5,
          width: 7,
          height: 7,
        }}
      />
      <Image
        source={require("@/assets/images/nail.png")}
        style={{
          position: "absolute",
          top: 5,
          right: 5,
          width: 7,
          height: 7,
        }}
      />
      <Image
        source={require("@/assets/images/nail.png")}
        style={{
          position: "absolute",
          bottom: 5,
          left: 5,
          width: 7,
          height: 7,
        }}
      />
      <Image
        source={require("@/assets/images/nail.png")}
        style={{
          position: "absolute",
          bottom: 5,
          right: 5,
          width: 7,
          height: 7,
        }}
      />
    </View>
  );
}
