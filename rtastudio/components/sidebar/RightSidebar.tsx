import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useStorage } from "@/liveblocks.config";
import { useMutation, useSelf } from "@liveblocks/react";
import MobileColorPicker from "./MobileColorPicker";
import NumberInput from "./NumberInput";
import Slider from "./MobileSlider";
import { LayerType } from "@/types";
import { hexToRgb, colorToCss } from "@/utils/utils";
import { FontAwesome } from "@expo/vector-icons";
import Tabs from "./Tabs";
import { useRef, useCallback, useEffect } from "react"; // Import useRef, useCallback, useEffect

// Accepts selectedLayerId and onClose as props
type RightSidebarProps = {
  selectedLayerId: string;
  onClose: () => void;
};

const DEBOUNCE_DELAY_ROOM_COLOR = 100; // Debounce delay for room color updates in milliseconds

export default function RightSidebar({
  selectedLayerId,
  onClose,
}: RightSidebarProps) {
  const selection = useSelf((me) => me.presence.selection);
  const layers = useStorage((root) => root.layers);
  const roomColor = useStorage((root) => root.roomColor);
  const selectedLayer = selectedLayerId ? layers?.get(selectedLayerId) : null;

  // Ref for managing the debounce timeout for room color updates
  const roomColorDebounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Clean up any pending debounce timeout when the component unmounts
  useEffect(() => {
    return () => {
      if (roomColorDebounceTimeout.current) {
        clearTimeout(roomColorDebounceTimeout.current);
      }
    };
  }, []);

  // Liveblocks mutation to update a layer's properties
  const updateLayer = useMutation(
    (
      { storage },
      updates: {
        id?: string;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        opacity?: number;
        cornerRadius?: number;
        fill?: string;
        stroke?: string;
        fontSize?: number;
        fontWeight?: number;
        fontFamily?: string;
        strokeWidth?: number;
        rotation?: number;
        sides?: number; // Added sides for Polygon layer
      }
    ) => {
      const targetId = updates.id ?? selectedLayerId;
      if (!targetId) return;

      const liveLayers = storage.get("layers");
      const layer = liveLayers.get(targetId);

      if (layer) {
        console.log("Updating layer:", targetId, "with updates:", updates);
        layer.update({
          ...(updates.x !== undefined && { x: updates.x }),
          ...(updates.y !== undefined && { y: updates.y }),
          ...(updates.width !== undefined && { width: updates.width }),
          ...(updates.height !== undefined && { height: updates.height }),
          ...(updates.opacity !== undefined && { opacity: updates.opacity }),
          ...(updates.cornerRadius !== undefined && {
            cornerRadius: updates.cornerRadius,
          }),
          ...(updates.sides !== undefined && { sides: updates.sides }), // Update sides property
          ...(updates.strokeWidth !== undefined && {
            strokeWidth: updates.strokeWidth,
          }),
          // Convert hex color to RGB before storing
          ...(updates.fill !== undefined && { fill: hexToRgb(updates.fill) }),
          ...(updates.stroke !== undefined && {
            stroke: hexToRgb(updates.stroke),
          }),
          ...(updates.rotation !== undefined && { rotation: updates.rotation }),
          ...(updates.fontSize !== undefined && { fontSize: updates.fontSize }),
          ...(updates.fontWeight !== undefined && {
            fontWeight: updates.fontWeight,
          }),
          ...(updates.fontFamily !== undefined && {
            fontFamily: updates.fontFamily,
          }),
        });
      }
    },
    [selectedLayerId]
  );

  // Original Liveblocks mutation to update the room's background color
  const _updateRoomColor = useMutation(({ storage }, color: string) => {
    storage.set("roomColor", hexToRgb(color));
  }, []);

  // Debounced version of the room color update mutation
  const debouncedUpdateRoomColor = useCallback(
    (color: string) => {
      // Clear any existing timeout to prevent previous updates from firing
      if (roomColorDebounceTimeout.current) {
        clearTimeout(roomColorDebounceTimeout.current);
      }
      // Set a new timeout to call the actual mutation after the debounce delay
      // Explicitly cast the return type of setTimeout to NodeJS.Timeout
      roomColorDebounceTimeout.current = setTimeout(() => {
        _updateRoomColor(color);
      }, DEBOUNCE_DELAY_ROOM_COLOR) as unknown as NodeJS.Timeout;
    },
    [_updateRoomColor]
  ); // Dependency on _updateRoomColor ensures the latest mutation is used

  // Dynamically build the array of Tab.Panel components for layer colors
  const layerColorTabs = [];
  let defaultInitialTab = "";

  if (selectedLayer && "fill" in selectedLayer) {
    layerColorTabs.push(
      <Tabs.Panel label="Fill" key="fill-tab">
        <MobileColorPicker
          label="Fill Color"
          value={colorToCss(selectedLayer.fill)}
          onChange={(val) => {
            // Layer fill color updates immediately without debouncing
            console.log("MobileColorPicker onChange (fill):", val);
            updateLayer({ fill: val });
          }}
        />
      </Tabs.Panel>
    );
    defaultInitialTab = "Fill";
  }

  if (selectedLayer && "stroke" in selectedLayer) {
    layerColorTabs.push(
      <Tabs.Panel label="Stroke" key="stroke-tab">
        <MobileColorPicker
          label="Stroke Color"
          value={colorToCss(selectedLayer.stroke)}
          onChange={(val) => {
            // Layer stroke color updates immediately without debouncing
            console.log("MobileColorPicker onChange (stroke):", val);
            updateLayer({ stroke: val });
          }}
        />
      </Tabs.Panel>
    );
    if (!defaultInitialTab) {
      defaultInitialTab = "Stroke";
    }
  }

  return (
    <View
      className="bg-white border-l border-gray-200 flex-col"
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={{ flex: 1 }}>
        <View className="p-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-bold text-gray-800">Properties</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <FontAwesome name="times" size={24} color="black" />
            </TouchableOpacity>
          </View>

          {selectedLayer ? (
            <>
              {/* Log selectedLayer for debugging. This should be outside JSX if it outputs text directly. */}
              {/* For debugging purposes, you can keep console.log outside the return statement or in a useEffect. */}
              {console.log("Selected Layer:", selectedLayer)}

              <Text className="text-lg font-bold mb-3 text-gray-800">
                Layer: {selectedLayer.name || selectedLayerId}
              </Text>

              {/* Position & Size */}
              <Text className="text-base font-semibold mt-4 mb-2 text-gray-700">
                Position & Size
              </Text>
              {"x" in selectedLayer && "y" in selectedLayer && (
                <View className="flex-row justify-between mb-3 gap-3">
                  <NumberInput
                    label="X"
                    value={selectedLayer.x}
                    onChange={(val) => updateLayer({ x: val })}
                  />
                  <NumberInput
                    label="Y"
                    value={selectedLayer.y}
                    onChange={(val) => updateLayer({ y: val })}
                  />
                </View>
              )}

              {"width" in selectedLayer && "height" in selectedLayer && (
                <View className="flex-row justify-between mb-3 gap-3">
                  <NumberInput
                    label="W"
                    value={selectedLayer.width}
                    onChange={(val) => updateLayer({ width: val })}
                  />
                  <NumberInput
                    label="H"
                    value={selectedLayer.height}
                    onChange={(val) => updateLayer({ height: val })}
                  />
                </View>
              )}

              {/* Rotation (for Rectangle, Text, Polygon, and Ellipse) */}
              {(selectedLayer.type === LayerType.Rectangle ||
                selectedLayer.type === LayerType.Text ||
                selectedLayer.type === LayerType.Polygon ||
                selectedLayer.type === LayerType.Ellipse) && ( // Added LayerType.Ellipse here
                <>
                  <Text className="text-base font-semibold mt-4 mb-2 text-gray-700">
                    Rotation
                  </Text>
                  <NumberInput
                    label="Rotation"
                    // Type assertion to 'any' is used here to allow access to 'rotation'
                    // property on selectedLayer without strict type checking,
                    // as 'rotation' might be optional on the union type 'Layer'.
                    // The ideal solution is to ensure 'rotation' is explicitly defined
                    // as an optional property on all relevant layer types in your 'types.ts'.
                    value={(selectedLayer as any).rotation ?? 0}
                    onChange={(val) => updateLayer({ rotation: val })}
                  />
                </>
              )}

              {/* Sides (only for Polygon) */}
              {selectedLayer.type === LayerType.Polygon && (
                <>
                  <Text className="text-base font-semibold mt-4 mb-2 text-gray-700">
                    Sides
                  </Text>
                  <NumberInput
                    label="Sides"
                    // Type assertion to 'any' is used here for 'sides' as well.
                    value={(selectedLayer as any).sides ?? 3} // Default to 3 sides
                    min={3} // Minimum 3 sides for a polygon
                    max={20} // Arbitrary max, adjust as needed
                    onChange={(val) => updateLayer({ sides: val })}
                  />
                </>
              )}

              {/* Corners */}
              {selectedLayer.type === LayerType.Rectangle &&
                "cornerRadius" in selectedLayer && (
                  <>
                    <Text className="text-base font-semibold mt-4 mb-2 text-gray-700">
                      Corners
                    </Text>
                    <NumberInput
                      label="Corners"
                      value={selectedLayer.cornerRadius ?? 0}
                      onChange={(val) => updateLayer({ cornerRadius: val })}
                    />
                  </>
                )}

              {/* Appearance */}
              <Text className="text-base font-semibold mt-4 mb-2 text-gray-700">
                Appearance
              </Text>
              {"opacity" in selectedLayer && (
                <Slider
                  label="Opacity"
                  value={selectedLayer.opacity}
                  onChange={(val) => updateLayer({ opacity: val })}
                  min={0}
                  max={100}
                />
              )}

              {/* Tabs for Fill and Stroke Color Pickers */}
              {layerColorTabs.length > 0 && (
                <Tabs initialTab={defaultInitialTab}>{layerColorTabs}</Tabs>
              )}

              {/* Typography Section (only for Text layers) */}
              {selectedLayer.type === LayerType.Text && (
                <>
                  <Text className="text-base font-semibold mt-4 mb-2 text-gray-700">
                    Typography
                  </Text>
                  <NumberInput
                    label="Font Size"
                    value={selectedLayer.fontSize}
                    onChange={(val) => updateLayer({ fontSize: val })}
                  />
                  <NumberInput
                    label="Font Weight"
                    value={selectedLayer.fontWeight}
                    onChange={(val) => updateLayer({ fontWeight: val })}
                  />
                </>
              )}
            </>
          ) : (
            // This block is shown when no layer is selected
            <>
              <Text className="text-base font-semibold mt-4 mb-2 text-gray-700">
                Canvas Properties
              </Text>
              <MobileColorPicker
                label="Canvas Background"
                value={colorToCss(roomColor ?? { r: 255, g: 255, b: 255 })}
                onChange={debouncedUpdateRoomColor}
              />
              <Text className="mt-4">No layer selected</Text>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
