import { useStorage } from "@/liveblocks.config";
import Rectangle from "./Rectangle"; // Assuming this accepts an 'onPress' prop
import Ellipse from "./Ellipse"; // Assuming this accepts an 'onPress' prop
import Path from "./Path"; // Assuming this accepts an 'onPress' prop
import Polygon from "./Polygon";
import { Layer, LayerType } from "@/types";
import { colorToCss } from "@/utils/utils";
import { G, Text as SvgText, Rect } from "react-native-svg";

function getGroupBoundingBox(
  groupLayer: any,
  layers: ReadonlyMap<string, Layer>
) {
  const children = groupLayer.children
    .map((childId: string) => layers.get(childId))
    .filter(Boolean) as Layer[];

  const bounds = children.map((layer) => {
    return {
      minX: layer.x,
      minY: layer.y,
      maxX: layer.x + layer.width,
      maxY: layer.y + layer.height,
    };
  });

  const x1 = Math.min(...bounds.map((b) => b.minX));
  const y1 = Math.min(...bounds.map((b) => b.minY));
  const x2 = Math.max(...bounds.map((b) => b.maxX));
  const y2 = Math.max(...bounds.map((b) => b.maxY));

  return {
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1,
  };
}

export default function LayerComponent({
  id,
  onLayerPointerDown,
}: {
  id: string;
  onLayerPointerDown: (layerId: string) => void;
}) {
  const layer = useStorage((root) => root.layers.get(id));
  const layers = useStorage((root) => root.layers);

  if (!layer) return null;

  switch (layer.type) {
    case LayerType.Rectangle:
      return (
        <Rectangle
          id={id}
          layer={layer}
          onPress={() => onLayerPointerDown(id)}
        />
      );
    case LayerType.Ellipse:
      return (
        <Ellipse id={id} layer={layer} onPress={() => onLayerPointerDown(id)} />
      );
    case LayerType.Path:
      return (
        <Path
          x={layer.x}
          y={layer.y}
          points={layer.points}
          fill={colorToCss(layer.fill)}
          stroke={colorToCss(layer.stroke)}
          opacity={layer.opacity}
          onPress={() => onLayerPointerDown(id)}
        />
      );
    case LayerType.Text:
      return (
        <SvgText
          key={id}
          x={layer.x}
          y={layer.y + layer.fontSize}
          fontSize={layer.fontSize}
          fill={colorToCss(layer.fill)}
          stroke={colorToCss(layer.stroke)}
          opacity={layer.opacity / 100}
          fontFamily={layer.fontFamily}
          fontWeight={layer.fontWeight?.toString() || "400"}
          onPress={() => onLayerPointerDown(id)}
        >
          {/* Corrected: Render layer.text directly as SvgText expects plain string children */}
          {layer.text}
        </SvgText>
      );
    case LayerType.Polygon:
      return (
        <Polygon id={id} layer={layer} onPress={() => onLayerPointerDown(id)} />
      );
    case LayerType.Group:
      if (!layers || typeof layers.get !== "function") return null;
      const bounds = getGroupBoundingBox(layer, layers);
      const stroke =
        layer.groupType === "motif"
          ? "#0b99ff"
          : layer.groupType === "textile"
          ? "#a855f7"
          : "red";

      return (
        <G key={id}>
          <Rect
            x={bounds.x - 1}
            y={bounds.y - 1}
            width={bounds.width + 2}
            height={bounds.height + 2}
            stroke={stroke}
            strokeWidth={2}
            fill="transparent"
            onPress={() => onLayerPointerDown(id)}
          />
          {layer.children.map((childId: string) => (
            <LayerComponent
              key={childId}
              id={childId}
              onLayerPointerDown={onLayerPointerDown}
            />
          ))}
        </G>
      );
    default:
      return null;
  }
}
