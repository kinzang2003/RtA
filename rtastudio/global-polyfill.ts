// global-polyfill.ts (create this file)
import { URL as PolyfillURL } from "react-native-url-polyfill";

if (typeof window === "undefined") {
  (global as any).window = {};
}

// Provide only what Liveblocks needs
if (typeof global.URL === "undefined") {
  (global as any).URL = PolyfillURL;
}

window.addEventListener = () => {}; // Needed for Liveblocks reconnect workaround
window.postMessage = () => {}; // For Liveblocks DevTools (optional)
