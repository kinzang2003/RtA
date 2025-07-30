import { CanvasView } from "@/components/canvas/CanvasView";
import { useLocalSearchParams } from "expo-router";
import { RoomProvider } from "@/liveblocks.config";
import { LiveMap, LiveObject, LiveList } from "@liveblocks/client";
import { Layer, Color } from "@/types";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Canvas() {
  const { id } = useLocalSearchParams();

  if (!id || typeof id !== "string") return null;

  const initialStorage = {
    roomColor: {
      r: 0,
      g: 0,
      b: 0,
    } as Color,
    layers: new LiveMap<string, LiveObject<Layer>>(),
    layerIds: new LiveList([]),
  };

  return (
    <SafeAreaView style={{flex:1}} >
    <RoomProvider
      id={`room:${id}`}
      initialPresence={{
        selection: [],
        cursor: null,
        penColor: null,
        pencilDraft: null,
      }}
      initialStorage={initialStorage}
    >
      <CanvasView />
    </RoomProvider>
    </SafeAreaView>
  );
}
