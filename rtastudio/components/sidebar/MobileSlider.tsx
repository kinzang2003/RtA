import Slider from "@react-native-community/slider";
import { View, Text } from "react-native";

export default function MobileSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <View style={{ marginVertical: 10 }}>
      <Text style={{ fontSize: 12, marginBottom: 6 }}>{label}</Text>
      <Slider
        minimumValue={min}
        maximumValue={max}
        value={value}
        onValueChange={onChange}
        step={1}
      />
    </View>
  );
}
