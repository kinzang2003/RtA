import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
  Modal,
  Dimensions,
} from "react-native";
import ColorPicker from "react-native-wheel-color-picker";
import { colorToCss, hexToRgb } from "@/utils/utils"; // Assuming hexToRgb is available

const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
const PICKER_SIZE = 250; // Fixed size for the color picker overlay

export default function MobileColorPicker({
  value, // Expects a CSS color string (e.g., "rgb(R,G,B)" or "#RRGGBB")
  onChange, // Expects to receive a hex string (e.g., "#RRGGBB")
  label = "Color",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value); // State for the hex input field
  // Moved swatchLayout and colorSwatchRef declarations here
  const [swatchLayout, setSwatchLayout] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const colorSwatchRef = useRef<View>(null);

  useEffect(() => {
    // Update input value when external 'value' prop changes
    setInputValue(value);
  }, [value]);

  // Measure the layout of the color swatch when it renders or changes
  const onSwatchLayout = () => {
    if (colorSwatchRef.current) {
      colorSwatchRef.current.measure((fx, fy, w, h, px, py) => {
        setSwatchLayout({ x: px, y: py, width: w, height: h });
      });
    }
  };

  const handleColorChangeComplete = (color: string) => {
    setInputValue(color);
    onChange(color);
  };

  const handleHexInputChange = (text: string) => {
    setInputValue(text);
  };

  const handleHexInputBlur = () => {
    if (/^#[0-9a-fA-F]{6}$/.test(inputValue)) {
      onChange(inputValue);
    } else {
      setInputValue(value);
    }
  };

  const swatchColor = value || "#ffffff";

  // Calculate picker position
  const pickerLeft = Math.max(
    0,
    Math.min(
      swatchLayout.x - PICKER_SIZE + swatchLayout.width / 2, // Attempt to center horizontally, shifted left
      windowWidth - PICKER_SIZE // Don't go off right edge
    )
  );

  const pickerTop = Math.max(
    0,
    Math.min(
      swatchLayout.y - PICKER_SIZE + 300, // Attempt to center vertically, shifted up
      windowHeight - PICKER_SIZE // Don't go off bottom edge
    )
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.controlsRow}>
        {/* Color Swatch */}
        <TouchableOpacity
          ref={colorSwatchRef}
          onLayout={onSwatchLayout} // Capture layout on render
          style={[styles.colorSwatch, { backgroundColor: swatchColor }]}
          onPress={() => setIsPickerOpen(true)} // Open picker on press
        />

        {/* Hex Input */}
        <TextInput
          style={styles.hexInput}
          value={String(
            inputValue.startsWith("#")
              ? inputValue
              : colorToCss(hexToRgb(inputValue))
          )}
          onChangeText={handleHexInputChange}
          onBlur={handleHexInputBlur}
          autoCapitalize="none"
          placeholder="#RRGGBB"
        />
      </View>

      {/* Modal for Color Picker Wheel */}
      <Modal
        transparent={true}
        visible={isPickerOpen}
        onRequestClose={() => setIsPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsPickerOpen(false)} // Close picker when tapping outside
        >
          <View
            style={[
              styles.pickerWheelContainer,
              {
                left: pickerLeft,
                top: pickerTop,
                width: PICKER_SIZE,
                height: PICKER_SIZE,
              },
            ]}
          >
            <ColorPicker
              color={value}
              onColorChangeComplete={handleColorChangeComplete}
              thumbSize={20}
              sliderSize={0} // Set sliderSize to 0 to hide shades and colors
              noSnap={true}
              row={false}
              // swatches={false} // Hide swatches
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  label: {
    fontSize: 12,
    marginBottom: 6,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  colorSwatch: {
    width: 30,
    height: 30,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  hexInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    backgroundColor: "#ededed",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent", // Made the overlay transparent
    zIndex: 1000, // Ensure it's on top
  },
  pickerWheelContainer: {
    position: "absolute", // Absolute position within the modal overlay
    backgroundColor: "transparent", // White background for the picker
    borderRadius: 10,
    padding: 20, // Padding around the picker
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.25,
    // shadowRadius: 3.84,
    // elevation: 5,
    overflow: "hidden", // Ensure clipping
  },
});
