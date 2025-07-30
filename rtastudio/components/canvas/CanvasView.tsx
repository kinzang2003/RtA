import { useStorage } from "@/liveblocks.config";
import { useRoom, useSelf } from "@liveblocks/react";
import {
  View,
  PanResponder,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import Svg, { G } from "react-native-svg";
import {
  PinchGestureHandler,
  PinchGestureHandlerGestureEvent,
  PinchGestureHandlerStateChangeEvent,
  State,
} from "react-native-gesture-handler";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { colorToCss } from "@/utils/utils";
import LayerComponent from "./LayerComponent"; // Assuming LayerComponent is already memoized or will be
import RightSidebar from "../sidebar/RightSidebar";
import { FontAwesome } from "@expo/vector-icons";
import { router } from "expo-router";

// Define SIDEBAR_WIDTH using Dimensions for responsive design
const SIDEBAR_WIDTH = Dimensions.get("window").width * 0.6;

// Base SVG canvas dimensions (used for viewBox calculations)
const SVG_BASE_WIDTH = 1000;
const SVG_BASE_HEIGHT = 1000;

// Animated G is no longer strictly necessary for pan/zoom via viewBox,
// but can remain if individual layer transforms are intended later.
// For now, it will just wrap the layers without applying its own transforms.
const AnimatedG = Animated.createAnimatedComponent(G);

export function CanvasView() {
  // Liveblocks storage hooks to get layer data and room color
  const layerIds = useStorage((root) => root.layerIds);
  const layers = useStorage((root) => root.layers);
  const roomColor = useStorage((root) => root.roomColor);
  const room = useRoom(); // Liveblocks room instance
  const self = useSelf(); // Current user's presence
  // Get the currently selected layer ID from presence, or null if nothing is selected
  const selectedLayer = useSelf((me) =>
    me.presence?.selection?.length > 0 ? me.presence.selection[0] : null
  );

  // Animated values for camera transformations:
  // translateX, translateY will now represent the top-left corner of the SVG viewBox.
  // scale will represent the zoom level.
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  // State for the SVG viewBox string, updated by Animated.Value listeners
  const [viewBoxString, setViewBoxString] = useState(
    `0 0 ${SVG_BASE_WIDTH} ${SVG_BASE_HEIGHT}`
  );

  // Refs to store the *current numerical values* of Animated.Values
  // These are updated via listeners to avoid direct access to internal properties
  const currentTranslateX = useRef(0);
  const currentTranslateY = useRef(0);
  const currentScale = useRef(1);

  // State to control the visibility of the right sidebar
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  // State to ensure initial camera positioning runs only once
  const [hasInitializedCamera, setHasInitializedCamera] = useState(false);
  // State to track if a camera animation (e.g., centering on layer) is in progress)
  // This state will now always be false as camera animations are removed.
  const [isAnimatingCamera, setIsAnimatingCamera] = useState(false);

  // Ref to store the initial viewBox origin when a pan gesture starts
  const panStartViewBoxX = useRef(0);
  const panStartViewBoxY = useRef(0);

  // Animated value for the sidebar's horizontal translation
  const sidebarTranslateX = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;

  // Animate sidebar in/out based on showRightSidebar state
  useEffect(() => {
    Animated.timing(sidebarTranslateX, {
      toValue: showRightSidebar ? 0 : SIDEBAR_WIDTH,
      duration: 300,
      useNativeDriver: true, // Use native driver for better performance
    }).start();
  }, [showRightSidebar, sidebarTranslateX]);

  // Add listeners to Animated.Values to keep refs updated and update viewBoxString
  useEffect(() => {
    const updateViewBox = () => {
      // Use the ref values directly, as they are updated by listeners
      const currentX = currentTranslateX.current;
      const currentY = currentTranslateY.current;
      const currentZ = currentScale.current;
      const newWidth = SVG_BASE_WIDTH / currentZ;
      const newHeight = SVG_BASE_HEIGHT / currentZ;
      setViewBoxString(`${currentX} ${currentY} ${newWidth} ${newHeight}`);
    };

    // Listeners to update the current ref values
    const txListener = translateX.addListener(({ value }) => {
      currentTranslateX.current = value;
      updateViewBox(); // Update viewBox string whenever translateX changes
    });
    const tyListener = translateY.addListener(({ value }) => {
      currentTranslateY.current = value;
      updateViewBox(); // Update viewBox string whenever translateY changes
    });
    const scaleListener = scale.addListener(({ value }) => {
      currentScale.current = value;
      updateViewBox(); // Update viewBox string whenever scale changes
    });

    // Initial update of viewBoxString when component mounts
    updateViewBox();

    // Clean up listeners on component unmount
    return () => {
      translateX.removeListener(txListener);
      translateY.removeListener(tyListener);
      scale.removeListener(scaleListener);
    };
  }, [translateX, translateY, scale]);

  // Initialize camera position to center around existing layers when component mounts
  useEffect(() => {
    if (!hasInitializedCamera && layerIds && layers && layerIds.length > 0) {
      const positions = layerIds
        .map((id) => layers.get(id))
        .filter(
          (l): l is NonNullable<typeof l> =>
            !!l && typeof l.x === "number" && typeof l.y === "number"
        );

      if (positions.length > 0) {
        const minX = Math.min(...positions.map((l) => l.x));
        const minY = Math.min(...positions.map((l) => l.y));
        // Set initial animated values for the viewBox origin
        translateX.setValue(minX - 100);
        translateY.setValue(minY - 100);
        scale.setValue(1);
        setHasInitializedCamera(true);
      }
    }
  }, [layerIds, layers, hasInitializedCamera]);

  // Handler for clicking on the canvas (background) - now internal to PanResponder
  const handleCanvasClick = useCallback(() => {
    const isLayerSelected =
      self?.presence?.selection && self.presence.selection.length > 0;

    if (isLayerSelected) {
      // If a layer is selected, deselect it and close the sidebar.
      room.updatePresence({ selection: [] });
      setShowRightSidebar(false);
    } else {
      // If no layer is selected, and the sidebar is currently hidden,
      // then tapping the canvas should open the sidebar to show canvas properties.
      // This prevents re-opening if it's already open or in transition.
      if (!showRightSidebar) {
        // Only open if it's currently hidden
        setShowRightSidebar(true);
      }
      // Ensure no layer is selected in presence (redundant but safe)
      room.updatePresence({ selection: [] });
    }
  }, [self?.presence?.selection, room, setShowRightSidebar, showRightSidebar]); // Added showRightSidebar to dependencies

  // PanResponder for canvas dragging/panning and tap detection
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isAnimatingCamera, // Only claim if NOT animating (always false now)
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (isAnimatingCamera) return false; // Do not move if animating (always false now)
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        // Store the current viewBox origin as the starting point for this pan gesture
        panStartViewBoxX.current = currentTranslateX.current;
        panStartViewBoxY.current = currentTranslateY.current;
      },
      onPanResponderMove: (_, gestureState) => {
        // Calculate new viewBox origin based on initial stored position and gesture delta, scaled by current zoom
        // Moving right on screen means decreasing viewBox X
        translateX.setValue(
          panStartViewBoxX.current - gestureState.dx / currentScale.current
        );
        translateY.setValue(
          panStartViewBoxY.current - gestureState.dy / currentScale.current
        );
      },
      onPanResponderRelease: (evt, gestureState) => {
        const isTap =
          Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5;
        if (isTap) {
          handleCanvasClick();
        }
      },
      onPanResponderTerminate: (evt, gestureState) => {
        // No specific action needed here for viewBox, as it's continuously updated
      },
    })
  ).current;

  // Pinch gesture handler for zoom
  const onPinchGestureEvent = Animated.event(
    [{ nativeEvent: { scale: scale } }],
    { useNativeDriver: true }
  );

  const onPinchStateChange = useCallback(
    (event: PinchGestureHandlerStateChangeEvent) => {
      if (event.nativeEvent.oldState === State.ACTIVE) {
        // `currentScale.current` is already updated by listener
      }
    },
    []
  );

  // Handler for when a layer is pressed
  const handleLayerPress = (id: string) => {
    room.updatePresence({ selection: [id] });
    setShowRightSidebar(true);

    // Camera position remains unchanged as per user request.
  };

  // All layers are visible, no filtering based on component type
  const visibleLayerIds = layerIds;

  // Render null if layer data is not yet available
  if (!layerIds || !layers) {
    return null;
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex flex-row justify-start items-center p-3 bg-gray-100 border-b border-gray-200">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-3 p-2 rounded-full bg-white shadow-sm"
        >
          <FontAwesome name="angle-left" size={24} color="black" />
        </TouchableOpacity>
        <View className="flex-1"></View>
      </View>
      <View className="flex-1 overflow-hidden">
        <PinchGestureHandler
          onGestureEvent={onPinchGestureEvent}
          onHandlerStateChange={onPinchStateChange}
        >
          <View className="flex-1" {...panResponder.panHandlers}>
            <Svg
              width="100%"
              height="100%"
              viewBox={viewBoxString}
              style={{
                backgroundColor: roomColor ? colorToCss(roomColor) : "#fff",
              }}
            >
              <G>
                {visibleLayerIds?.map((id) => (
                  <LayerComponent
                    key={id}
                    id={id}
                    onLayerPointerDown={() => handleLayerPress(id)}
                  />
                ))}
              </G>
            </Svg>
          </View>
        </PinchGestureHandler>
      </View>
      <Animated.View
        style={[
          { transform: [{ translateX: sidebarTranslateX }] },
          {
            height: "100%",
            width: SIDEBAR_WIDTH,
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            zIndex: 10,
          },
        ]}
        className="bg-gray-50 shadow-lg"
      >
        <RightSidebar
          selectedLayerId={selectedLayer ?? ""}
          onClose={() => {
            setShowRightSidebar(false);
            room.updatePresence({ selection: [] });
          }}
        />
      </Animated.View>
    </View>
  );
}
