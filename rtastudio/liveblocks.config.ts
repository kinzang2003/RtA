import * as SecureStore from "expo-secure-store";
import { createRoomContext } from "@liveblocks/react";
import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";

import { createClient } from "@liveblocks/client";
import { Color, Layer, Point } from "@/types";

declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      // Example, real-time cursor coordinates
      // cursor: { x: number; y: number };
      selection: string[];
      cursor: Point | null;
      penColor: Color | null;
      pencilDraft: [x: number, y: number, pressure: number][] | null;
    };

    // The Storage tree for the room, for useMutation, useStorage, etc.
    Storage: {
      // Example, a conflict-free list
      // animals: LiveList<string>;
      roomColor: Color | null;
      layers: LiveMap<string, LiveObject<Layer>>;
      layerIds: LiveList<string>;
    };

    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        // Example properties, for useSelf, useUser, useOthers, etc.
        name: string;
        avatar: string;
      };
    };

    // Custom events, for useBroadcastEvent, useEventListener
    RoomEvent: {};
    // Example has two events, using a union
    // | { type: "PLAY" }
    // | { type: "REACTION"; emoji: "🔥" };

    // Custom metadata set on threads, for useThreads, useCreateThread, etc.
    ThreadMetadata: {
      // Example, attaching coordinates to a thread
      // x: number;
      // y: number;
    };

    // Custom room info set with resolveRoomsInfo, for useRoomInfo
    RoomInfo: {
      // Example, rooms with a title and url
      // title: string;
      // url: string;
    };
  }
}

// The typings are inferred from the global declaration
const client = createClient({
  authEndpoint: async () => {
    const token = await SecureStore.getItemAsync("authToken");
    if (!token) {
      throw new Error("No auth token found");
    }

    const res = await fetch(
      "https://rta-studio.vercel.app/api/liveblocks-auth",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      throw new Error("Liveblocks authentication failed");
    }

    const data = await res.json();
    return {
      token: data.token,
    };
  },
});

export const {
  RoomProvider,
  useOthers,
  useMyPresence,
  useStorage,
  useUpdateMyPresence,
} = createRoomContext(client);
