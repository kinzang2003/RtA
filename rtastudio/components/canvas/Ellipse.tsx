import React from "react";
import { Ellipse as SvgEllipse } from "react-native-svg";
import { EllipseLayer } from "@/types";
import { colorToCss } from "@/utils/utils";

export default function Ellipse({
  id,
  layer,
  onPress, // Added onPress prop
}: {
  id: string;
  layer: EllipseLayer;
  onPress?: () => void; // Made onPress optional
}) {
  // Destructure rotation from layer, defaulting to 0 if not present
  const { x, y, width, height, fill, stroke, opacity, rotation = 0 } = layer;

  // Calculate the center of the ellipse for rotation origin
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  return (
    <SvgEllipse
      cx={centerX} // Use centerX for cx
      cy={centerY} // Use centerY for cy
      rx={width / 2}
      ry={height / 2}
      fill={fill ? colorToCss(fill) : "#ccc"}
      stroke={stroke ? colorToCss(stroke) : "#ccc"}
      strokeWidth={1}
      opacity={opacity ? opacity / 100 : 1}
      // Apply the rotation transform around the ellipse's center
      transform={`rotate(${rotation}, ${centerX}, ${centerY})`}
      onPress={onPress} // Applied onPress to the SvgEllipse element
    />
  );
}
