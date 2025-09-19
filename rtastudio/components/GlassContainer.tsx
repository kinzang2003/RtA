import { ScrollView, StyleSheet, Dimensions, View } from "react-native";
import { useColorScheme } from "nativewind";
import GlassDark from "@/assets/images/glass-dark.svg";
import GlassLight from "@/assets/images/glass-light.svg";

export function GlassContainer({ children }: { children: React.ReactNode }) {
  const { colorScheme } = useColorScheme();
  const Glass = colorScheme === "dark" ? GlassDark : GlassLight;

  const screenWidth = Dimensions.get("window").width;
  const glassWidth = screenWidth - 100; // margin
  const aspectRatio = 290 / 469;
  const glassHeight = glassWidth / aspectRatio;

  return (
    <View style={[styles.wrapper, { width: glassWidth, height: glassHeight }]}>
      <Glass width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
      <ScrollView
        style={StyleSheet.absoluteFill}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: "center",
    marginVertical: 16,
  },
  scrollContainer: {
    padding: 20,
  },
});
