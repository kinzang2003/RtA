// liveblocks.d.ts

import type { LiveMap, LiveList, LiveObject } from "@liveblocks/client";
import type { Color, Layer, Point } from "@/types";

declare module "@liveblocks/client" {
  interface Liveblocks {
    Presence: {
      selection: string[];
      cursor: Point | null;
      penColor: Color | null;
      pencilDraft: [x: number, y: number, pressure: number][] | null;
    };

    Storage: {
      roomColor: Color | null;
      layers: LiveMap<string, LiveObject<Layer>>;
      layerIds: LiveList<string>;
    };

    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
      };
    };

    RoomEvent: {};

    ThreadMetadata: {};

    RoomInfo: {};
  }
}
