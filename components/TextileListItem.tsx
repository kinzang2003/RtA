import React, { memo } from "react";
import { TouchableOpacity, Dimensions } from "react-native";
import { Image } from "expo-image";
import { Text, View } from "@/components/Themed";
import { getStableColorForId, getGradientColorsForId } from "@/utils/color";
import { LinearGradient } from "expo-linear-gradient";

type Language = "ENG" | "DZO";

interface Textile {
  id: string;
  textileName: string;
  origin: string;
  duration: string;
  description: string;
  weavingProcesses: string;
  dateAdded: string;
  status: string;
  image: string;
  motifImage: string;
  symbolismImage: string;
  originImage: string;
  weavingTechniqueImage: string;
  symbolismText: string;
  weavingTechniqueText: string;
  type?: "ENG" | "DZO";
}

interface TextileListItemProps {
  item: Textile;
  onPress: () => void;
  language: Language;
}

// Helper: trim text
const trimWords = (text: string, maxWords = 6) => {
  const words = text.trim().split(/\s+/);
  return words.length <= maxWords
    ? text
    : words.slice(0, maxWords).join(" ") + "...";
};

// Helper: split duration into numbers and text
const splitDuration = (duration: string): { numbers: string; text: string } => {
  const match = duration.match(/^([\d\-]+)\s+(.+)$/);
  if (match) {
    return { numbers: match[1], text: match[2] };
  }
  return { numbers: duration, text: "" };
};

// Helper: remove leading numbers from textile name (e.g., "4. kushuthara" -> "kushuthara")
const cleanTextileName = (name: string): string => {
  return name.replace(/^\d+\.\s*/, "");
};

// Labels dictionary
const labels = {
  ENG: {
    origin: "Origin",
    weaving: "Weaving Technique",
    motifs: "Motifs Found",
    symbolism: "Symbolism & Facts",
  },
  DZO: {
    origin: "ཡུལ་སྐད།", // Dzongkha for "Origin"
    weaving: "བཤོས་ལག་ལེན།", // Dzongkha for "Weaving Technique"
    motifs: "དཔེ་རིས་འདུག་པ།", // Dzongkha for "Motifs Found"
    symbolism: "དོན་དག་དང་བརྗོད་དོན།", // Dzongkha for "Symbolism & Facts"
  },
};

const TextileListItem = memo(
  ({ item, onPress, language }: TextileListItemProps) => {
    const screenWidth = Dimensions.get("window").width;
    const gradientColors = getGradientColorsForId(item.id + "-name");
    const durationGradientColors: [string, string] = ["#000C40", "#787F98"];
    const { numbers: durationNumbers, text: durationText } = splitDuration(item.duration);

    // Classes for Dzongkha readability
    const dzongkhaItemTextClass =
      language === "DZO" ? "font-dzongkha text-2xl" : "text-sm";

    const dzongkhaItemNameClass =
      language === "DZO" ? "font-dzongkha text-3xl" : "text-base font-bold";

    const dzongkhaSmallItemTextClass =
      language === "DZO" ? "font-dzongkha text-xl" : "text-xs";

    return (
      <TouchableOpacity onPress={onPress}>
        <View className="w-full rounded-xl p-2 mb-4 overflow-hidden" style={{ width: screenWidth - 32, alignSelf: "center" }}>
          {/* ROW 1 */}
          <View className="flex-row" style={{ height: 220 }}>
            {/* Column 1 */}
            <View className="flex-2 mr-2" style={{ flex: 2, marginRight: 8 }}>
              {/* Duration + Textile Name */}
              <View className="flex-row mb-1" style={{ flex: 1, flexDirection: "row", marginBottom: 4 }}>
                <LinearGradient
                  colors={durationGradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flex: 1,
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderRadius: 8,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    className="text-xs" lightColor="#fff" darkColor="#fff"
                  >
                    Duration
                  </Text>
                  <Text
                    className="text-lg font-bold" lightColor="#fff" darkColor="#fff"
                  >
                    {durationNumbers}
                  </Text>
                  {durationText && (
                    <Text
                      className="text-xs" lightColor="#fff" darkColor="#fff"
                    >
                      {durationText}
                    </Text>
                  )}
                </LinearGradient>

                <LinearGradient
                  colors={gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flex: 2,
                    marginLeft: 4,
                    borderRadius: 8,
                    overflow: "hidden",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    className={`text-center font-bold ${dzongkhaItemNameClass}`} lightColor="#fff" darkColor="#fff"
                  >
                    {cleanTextileName(item.textileName)}
                  </Text>
                </LinearGradient>
              </View>

              {/* Origin Image + Main Image */}
              <View className="flex-row" style={{ flex: 2, flexDirection: "row" }}>
                <View
                  style={{
                    flex: 1,
                    marginRight: 4,
                    position: "relative",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Image
                    source={{ uri: item.originImage }}
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: 8,
                    }}
                    contentFit="cover"
                  />
                  <View
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      borderRadius: 8,
                      backgroundColor: "rgba(0,0,0,0.4)",
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      bottom: 6,
                      alignSelf: "center",
                      backgroundColor: "rgba(0,0,0,0.5)",
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      className={`text-center font-bold text-xs ${dzongkhaSmallItemTextClass}`} lightColor="#fff" darkColor="#fff"
                    >
                      {labels[language].origin}
                    </Text>
                  </View>
                </View>

                <View style={{ flex: 2, position: "relative" }}>
                  <Image
                    source={{ uri: item.image }}
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: 12,
                    }}
                    contentFit="cover"
                  />
                  <View
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      borderRadius: 12,
                      backgroundColor: "rgba(0,0,0,0.4)",
                    }}
                  />
                </View>
              </View>
            </View>

            {/* Column 2: Weaving Technique */}
            <View
              style={{
                flex: 1,
                position: "relative",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Image
                source={{ uri: item.weavingTechniqueImage }}
                style={{ width: "100%", height: "100%", borderRadius: 12 }}
                contentFit="cover"
              />
              <View
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  borderRadius: 12,
                  backgroundColor: "rgba(0,0,0,0.4)",
                }}
              />
              <View
                style={{
                  position: "absolute",
                  top: 6,
                  alignSelf: "center",
                  backgroundColor: "rgba(0,0,0,0.5)",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text
                  className={`text-center font-bold text-xs ${dzongkhaSmallItemTextClass}`} lightColor="#fff" darkColor="#fff"
                >
                  {labels[language].weaving}
                </Text>
              </View>
              <Text
                className={`absolute bottom-6 ${dzongkhaItemTextClass}`} lightColor="#fff" darkColor="#fff"
              >
                {item.weavingTechniqueText}
              </Text>
            </View>
          </View>

          {/* ROW 2 */}
          <View
            className="flex-row justify-between mt-2"
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 8,
              gap: 5,
            }}
          >
            <View
              style={{
                position: "relative",
                width: (screenWidth - 48) / 2,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Image
                source={{ uri: item.motifImage }}
                style={{ width: "100%", height: 80, borderRadius: 12 }}
                contentFit="cover"
              />
              <View
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  borderRadius: 12,
                  backgroundColor: "rgba(0,0,0,0.4)",
                }}
              />
              <View
                style={{
                  position: "absolute",
                  bottom: 6,
                  alignSelf: "center",
                  backgroundColor: "rgba(0,0,0,0.5)",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text
                  className={`text-center font-bold text-xs ${dzongkhaSmallItemTextClass}`} lightColor="#fff" darkColor="#fff"
                >
                  {labels[language].motifs}
                </Text>
              </View>
            </View>

            <View
              style={{
                position: "relative",
                width: (screenWidth - 48) / 2,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Image
                source={{ uri: item.symbolismImage }}
                style={{ width: "100%", height: 80, borderRadius: 12 }}
                contentFit="cover"
              />
              <View
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  borderRadius: 12,
                  backgroundColor: "rgba(0,0,0,0.4)",
                }}
              />
              <View
                style={{
                  position: "absolute",
                  bottom: 6,
                  alignSelf: "center",
                  backgroundColor: "rgba(0,0,0,0.5)",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text
                  className={`text-center font-bold text-xs ${dzongkhaSmallItemTextClass}`} lightColor="#fff" darkColor="#fff"
                >
                  {labels[language].symbolism}
                </Text>
              </View>
              <Text
                className={`absolute top-6 text-center px-1 ${dzongkhaItemTextClass}`} lightColor="#fff" darkColor="#fff"
              >
                {trimWords(item.symbolismText)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
);

export default TextileListItem;
