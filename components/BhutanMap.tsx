import * as React from "react";
import { Dimensions, View, Text } from "react-native";
import Svg, {
  Path,
  Defs,
  G,
  Pattern,
  Image as SvgImage,
} from "react-native-svg";
import { useTheme } from "@/lib/theme";
import {
  textileDzongkhags,
  dzongkhagPaths,
  textileInfo,
  dzongkhagNames,
} from "@/constants/textileDzongkhags";

export default function BhutanMap() {
  const { colorScheme } = useTheme();
  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;
  const [selected, setSelected] = React.useState<string | null>(null);

  return (
    <View className="flex-1 w-full justify-center items-center">
      <Svg
        viewBox="0 0 1000 600"
        width="180%"
        height="100%"
        style={{ transform: [{ rotate: "90deg" }], alignSelf: "center" }}
      >
        <Defs>
          {Object.entries(textileDzongkhags).map(([id, image]) => (
            <Pattern
              key={`pattern-${id}`}
              id={`pattern-${id}`}
              patternUnits="userSpaceOnUse"
              width={600}
              height={500}
            >
              <SvgImage
                href={image}
                width={600}
                height={500}
                preserveAspectRatio="xMidYMid slice"
              />
            </Pattern>
          ))}
        </Defs>

        <G>
          {Object.entries(dzongkhagPaths).map(([id, d]) => {
            const hasTextile = id in textileDzongkhags;
            return (
              <Path
                key={id}
                d={d}
                fill={
                  hasTextile
                    ? `url(#pattern-${id})`
                    : colorScheme === "dark"
                      ? "#939393"
                      : "#ffffff"
                }
                stroke={colorScheme === "dark" ? "#fff" : "#000"}
                strokeWidth={0.5}
                onPress={() => setSelected(id)}
              />
            );
          })}
        </G>
      </Svg>

      {selected && (
        <View
          // Changed 'bottom-4' to 'top-4'
          className={`absolute right-4 top-4 p-3 rounded-lg max-w-[60%] elevation-4 
            ${colorScheme === "dark" ? "bg-placeholder" : "bg-white"}`}
          style={{
            shadowColor: colorScheme === "dark" ? "#000" : "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: colorScheme === "dark" ? 0.4 : 0.25,
            shadowRadius: 3.84,
          }}
        >
          <Text className="font-bold text-base mb-1 text-black dark:text-white">
            {textileInfo[selected]?.name || dzongkhagNames[selected] || selected}
          </Text>
          <Text className="text-sm text-gray-700 dark:text-gray-300">
            {textileInfo[selected]?.textile || "No textile data available."}
          </Text>
        </View>
      )}
    </View>
  );
}
