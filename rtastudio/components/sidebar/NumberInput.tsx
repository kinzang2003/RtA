import React, { useState, useEffect } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";

type NumberInputProps = {
  label: string;
  value: number | undefined; // Changed to allow undefined for initial state
  onChange: (newValue: number) => void;
  min?: number;
  max?: number;
  precision?: number; // New prop for decimal places, defaults to 0
};

export default function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  precision = 0, // Default to 0 decimal places if not provided
}: NumberInputProps) {
  // Internal state for the text input, allowing free typing
  const [inputValue, setInputValue] = useState(
    value !== undefined ? value.toFixed(precision) : ""
  );

  // Effect to update internal state when the external 'value' prop changes
  // This handles cases like layer selection changes, undo/redo, or external updates.
  useEffect(() => {
    const newValueString = value !== undefined ? value.toFixed(precision) : "";
    // Only update if the external value is different from the currently displayed value
    // This prevents cursor jumping when the external value is the same as what the user sees.
    // It will NOT interfere with active typing in inputValue.
    if (newValueString !== inputValue) {
      setInputValue(newValueString);
    }
  }, [value, precision]); // Removed inputValue from dependencies for correct behavior

  // Handle text input changes (updates internal state immediately)
  const handleTextChange = (text: string) => {
    // Allow empty string or just a sign for intermediate typing
    if (text === "" || text === "-" || text === ".") {
      setInputValue(text);
      return;
    }
    // Only allow valid numeric characters (including decimal point)
    if (/^-?\d*\.?\d*$/.test(text)) {
      setInputValue(text);
    }
  };

  // Handle input ending (blur or submit) - this is where the external onChange is called
  const handleEndEditing = () => {
    let parsedValue = parseFloat(inputValue);

    // If input is empty or invalid, default to 0 or the current prop value
    if (isNaN(parsedValue)) {
      parsedValue = value !== undefined ? value : 0; // Fallback to current prop value if input is invalid
    }

    // Apply min/max constraints
    if (min !== undefined) {
      parsedValue = Math.max(min, parsedValue);
    }
    if (max !== undefined) {
      parsedValue = Math.min(max, parsedValue);
    }

    // Round to specified precision for consistency before calling onChange
    parsedValue = parseFloat(parsedValue.toFixed(precision));

    // Only call onChange if the final parsed value is different from the current prop value
    if (parsedValue !== value) {
      onChange(parsedValue);
    }
    // Ensure the displayed value is formatted correctly after editing ends
    setInputValue(parsedValue.toFixed(precision));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={inputValue}
        onChangeText={handleTextChange}
        onEndEditing={handleEndEditing} // Call handleEndEditing when editing finishes
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    marginRight: 8,
    flex: 1, // Retained flex: 1 to make the input wide
  },
  label: {
    fontSize: 12, // Adjusted from 11px to 12 for consistency with default RN font sizes
    marginBottom: 4,
    color: "#808080", // Added color from previous MobileNumberInput
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc", // Kept original border color
    borderRadius: 8, // Increased border radius for rounded corners
    paddingVertical: 8, // Adjusted padding for better vertical spacing
    paddingHorizontal: 10, // Adjusted padding for better horizontal spacing
    fontSize: 16, // Kept original font size
    backgroundColor: "#f5f5f5", // Added light background color
    color: "#333", // Added text color
  },
});
