import React, { memo } from "react";
import { TouchableOpacity, Dimensions } from "react-native";
import { Image } from "expo-image"; // Import Image from expo-image
import { Textile } from "@/types"; // Import the centralized Textile interface
import { Text, View } from "@/components/Themed";
import { getStableColorForId } from "@/utils/color"; // Import the stable color generator

// Make sure Language type is defined or imported, e.g., from "@/types" if moved there.
type Language = "ENG" | "DZO"; // Assuming this definition is available or placed here for now.

interface TextileListItemProps {
  item: Textile;
  onPress: () => void;
  language: Language; // Added language prop
}

const trimWords = (text: string, maxWords = 6) => {
  const words = text.trim().split(/\s+/);
  return words.length <= maxWords
    ? text
    : words.slice(0, maxWords).join(" ") + "...";
};

const TextileListItem = memo(
  ({ item, onPress, language }: TextileListItemProps) => {
    const screenWidth = Dimensions.get("window").width; // Still used for width calculation
    // Use the stable color generator for consistent colors based on item.id
    const durationBgColor = getStableColorForId(item.id + "-duration");
    const textileNameBgColor = getStableColorForId(item.id + "-name");

    // Conditional Tailwind class for Dzongkha font and increased size
    const dzongkhaItemTextClass =
      language === "DZO" ? "font-dzongkha text-xl" : "";
    const dzongkhaItemNameClass =
      language === "DZO" ? "font-dzongkha text-2xl" : ""; // Larger for textile name
    const dzongkhaSmallItemTextClass =
      language === "DZO" ? "font-dzongkha text-base" : ""; // For smaller text like Origin/Symbolism labels

    return (
      <TouchableOpacity onPress={onPress}>
        <View
          style={{
            width: screenWidth - 32,
            borderRadius: 12,
            padding: 8,
            marginBottom: 16,
            alignSelf: "center",
            overflow: "hidden",
          }}
        >
          {/* ROW 1 */}
          <View style={{ flexDirection: "row", height: 220 }}>
            {/* Column 1 */}
            <View style={{ flex: 2, marginRight: 8 }}>
              {/* Row 1: Duration + Textile Name */}
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  marginBottom: 4,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    backgroundColor: durationBgColor, // Now uses stable color
                    borderRadius: 8,
                  }}
                >
                  <Text
                    className={`text-xs text-center ${dzongkhaItemTextClass}`} // Apply class here
                    style={{ color: "white" }}
                  >
                    {item.duration}
                  </Text>
                </View>
                {/* Textile Name Section with dark overlay and white text */}
                <View
                  style={{
                    flex: 2,
                    marginLeft: 4,
                    borderRadius: 8,
                    overflow: "hidden",
                    position: "relative",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {/* Dark overlay for exposure effect */}
                  <View
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      backgroundColor: textileNameBgColor, // Now uses stable color
                      borderRadius: 8, // Match container border radius
                    }}
                  />
                  {/* Textile Name Text directly on top, now white */}
                  <Text
                    className={`font-sm ${dzongkhaItemNameClass}`} // Apply class here
                    style={{
                      color: "white", // Text color is white
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    {item.textileName}
                  </Text>
                </View>
              </View>

              {/* Row 2: Origin Image + Main Image */}
              <View style={{ flex: 2, flexDirection: "row" }}>
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
                      backgroundColor: "rgba(0,0,0,0.5)",
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      className={`text-center ${dzongkhaSmallItemTextClass}`} // Apply class here
                      style={{
                        color: "white",
                        fontWeight: "bold",
                        fontSize: 10,
                      }}
                    >
                      Origin
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

            {/* Column 2: Weaving Technique Image */}
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
              <View
                style={{
                  position: "absolute",
                  top: 6,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text
                  className={`text-center ${dzongkhaSmallItemTextClass}`} // Apply class here
                  style={{
                    color: "white",
                    fontWeight: "bold",
                    fontSize: 10,
                  }}
                >
                  WEAVING TECHNIQUE
                </Text>
              </View>
              <Text
                className={`absolute bottom-6 ${dzongkhaItemTextClass}`}
                style={{ color: "white" }}
              >
                {item.weavingTechniqueText}
              </Text>
            </View>
          </View>

          {/* ROW 2 */}
          <View
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
                  backgroundColor: "rgba(0,0,0,0.5)",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text
                  className={`text-center ${dzongkhaSmallItemTextClass}`} // Apply class here
                  style={{
                    color: "white",
                    fontWeight: "bold",
                    fontSize: 10,
                  }}
                >
                  Motifs Found
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
                  backgroundColor: "rgba(0,0,0,0.5)",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text
                  className={`text-center ${dzongkhaSmallItemTextClass}`} // Apply class here
                  style={{
                    color: "white",
                    fontWeight: "bold",
                    fontSize: 10,
                  }}
                >
                  SYMBOLISM & FACTS
                </Text>
              </View>
              <Text
                className={`absolute top-6 ${dzongkhaItemTextClass}`}
                style={{ color: "white" }}
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
