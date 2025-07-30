import React from "react";
import { Polygon as SvgPolygon } from "react-native-svg";
import { PolygonLayer } from "@/types"; // Assuming @/types points to your types file
import { colorToCss } from "@/utils/utils"; // Assuming @/utils/utils points to your utils file

type Props = {
  id: string;
  layer: PolygonLayer;
  onPress: (layerId: string) => void; // Simplified to match mobile LayerComponent's onPress
};

export default function Polygon({ id, layer, onPress }: Props) {
  const {
    x,
    y,
    width,
    height,
    sides = 3, // Default to 3 for a triangle
    fill,
    stroke,
    strokeWidth,
    opacity,
    rotation,
  } = layer;

  const centerX = width / 2;
  const centerY = height / 2;
  const angleStep = (2 * Math.PI) / sides;

  // Fit the polygon inside the width and height box
  // For react-native-svg, transformations are often applied directly to the element
  // or its parent G, and points are relative to the element's local coordinate system.
  // We'll calculate points relative to (0,0) and use x, y for translation.
  const radiusX = width / 2;
  const radiusY = height / 2;

  const points = Array.from({ length: sides }, (_, i) => {
    // Start from top, rotate by -PI/2 to align the first vertex upwards
    const angle = i * angleStep - Math.PI / 2;
    const px = centerX + radiusX * Math.cos(angle);
    const py = centerY + radiusY * Math.sin(angle);
    return `${px},${py}`;
  }).join(" ");

  return (
    <SvgPolygon
      key={id}
      points={points}
      x={x} // Apply layer's x position
      y={y} // Apply layer's y position
      fill={fill ? colorToCss(fill) : "#CCC"}
      stroke={stroke ? colorToCss(stroke) : "#CCC"}
      strokeWidth={strokeWidth ?? 1}
      opacity={opacity ? opacity / 100 : 1} // Convert 0-100 to 0-1
      rotation={rotation ?? 0} // Apply rotation
      originX={centerX} // Set origin for rotation
      originY={centerY} // Set origin for rotation
      onPress={() => onPress(id)} // Handle press event
    />
  );
}
