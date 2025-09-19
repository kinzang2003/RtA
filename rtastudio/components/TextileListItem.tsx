import React, { memo } from "react";
import { TouchableOpacity, Dimensions } from "react-native";
import { Image } from "expo-image";
import { Text, View } from "@/components/Themed";
import { getStableColorForId } from "@/utils/color";

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
    const durationBgColor = getStableColorForId(item.id + "-duration");
    const textileNameBgColor = getStableColorForId(item.id + "-name");

    // Classes for Dzongkha readability
    const dzongkhaItemTextClass =
      language === "DZO" ? "font-dzongkha text-2xl" : "text-sm";

    const dzongkhaItemNameClass =
      language === "DZO" ? "font-dzongkha text-3xl" : "text-base font-bold";

    const dzongkhaSmallItemTextClass =
      language === "DZO" ? "font-dzongkha text-xl" : "text-xs";

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
              {/* Duration + Textile Name */}
              <View style={{ flex: 1, flexDirection: "row", marginBottom: 4 }}>
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    backgroundColor: durationBgColor,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    className={`text-xs text-center ${dzongkhaItemTextClass}`}
                    style={{ color: "white" }}
                  >
                    {item.duration}
                  </Text>
                </View>

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
                  <View
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      backgroundColor: textileNameBgColor,
                      borderRadius: 8,
                    }}
                  />
                  <Text
                    className={`font-sm ${dzongkhaItemNameClass}`}
                    style={{
                      color: "white",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    {item.textileName}
                  </Text>
                </View>
              </View>

              {/* Origin Image + Main Image */}
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
                      className={`text-center ${dzongkhaSmallItemTextClass}`}
                      style={{
                        color: "white",
                        fontWeight: "bold",
                        fontSize: 10,
                      }}
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
                  backgroundColor: "rgba(0,0,0,0.5)",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text
                  className={`text-center ${dzongkhaSmallItemTextClass}`}
                  style={{
                    color: "white",
                    fontWeight: "bold",
                    fontSize: 10,
                  }}
                >
                  {labels[language].weaving}
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
                  className={`text-center ${dzongkhaSmallItemTextClass}`}
                  style={{
                    color: "white",
                    fontWeight: "bold",
                    fontSize: 10,
                  }}
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
                  backgroundColor: "rgba(0,0,0,0.5)",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text
                  className={`text-center ${dzongkhaSmallItemTextClass}`}
                  style={{
                    color: "white",
                    fontWeight: "bold",
                    fontSize: 10,
                  }}
                >
                  {labels[language].symbolism}
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
