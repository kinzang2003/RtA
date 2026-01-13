/**
 * WebView Integration Utilities
 * Handles secure communication between React Native and Web Editor
 */

import { User } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export interface WebViewMessage {
  type: "auth.session" | "project.load" | "project.save" | "error";
  payload?: Record<string, any>;
  timestamp?: number;
}

export interface WebViewResponse {
  type:
    | "canvas.ready"
    | "project.saved"
    | "error"
    | "canvas.state"
    | "collaborators.update"
    | "console"
    | "auth.request"
    | "request-supabase-session" // alias used by web bridge
    | "supabase-session-imported"; // ack from web after session import
  payload?: Record<string, any>;
}

/**
 * Safely inject a postMessage into WebView
 * Returns JavaScript code that sends the message when executed
 */
export function createPostMessageJS(message: WebViewMessage): string {
  const messageJSON = JSON.stringify(message);

  return `
    (function() {
      try {
        const message = ${messageJSON};
        window.postMessage(message, "*");
      } catch (error) {
      }
    })();
    true;
  `;
}

/**
 * Generate auth session message from user data
 */
export function createAuthSessionMessage(
  user: User,
  accessToken: string,
  refreshToken?: string
): WebViewMessage {
  return {
    type: "auth.session",
    payload: {
      userId: user.id,
      email: user.email,
      accessToken,
      refreshToken,
      userMetadata: user.user_metadata,
      timestamp: Date.now(),
    },
    timestamp: Date.now(),
  };
}

/**
 * Generate project load message
 */
export function createProjectLoadMessage(projectId: string): WebViewMessage {
  return {
    type: "project.load",
    payload: {
      projectId,
      timestamp: Date.now(),
    },
    timestamp: Date.now(),
  };
}

/**
 * Generate project save request message
 */
export function createProjectSaveMessage(): WebViewMessage {
  return {
    type: "project.save",
    payload: {
      timestamp: Date.now(),
    },
    timestamp: Date.now(),
  };
}

/**
 * Generate error message
 */
export function createErrorMessage(
  code: string,
  message: string,
  details?: any
): WebViewMessage {
  return {
    type: "error",
    payload: {
      code,
      message,
      details,
      timestamp: Date.now(),
    },
    timestamp: Date.now(),
  };
}

/**
 * Parse and validate response from web editor
 */
export function parseWebViewResponse(
  jsonString: string
): WebViewResponse | null {
  try {
    const message = JSON.parse(jsonString);

    // Validate message has required fields
    if (!message.type) {
      logger.warn("[WebView] Invalid message format: missing type", message);
      return null;
    }

    return message as WebViewResponse;
  } catch (error) {
    logger.error("[WebView] Failed to parse message", error);
    return null;
  }
}

/**
 * WebView configuration object
 */
export const WEBVIEW_CONFIG = {
  // Critical header for mobile detection
  headers: {
    "x-react-native-webview": "1",
  },
  // JavaScript settings
  javaScriptEnabled: true,
  domStorageEnabled: true,
  sharedCookiesEnabled: true,
  thirdPartyCookiesEnabled: true,
  // Loading & gestures
  startInLoadingState: true,
  allowsBackForwardNavigationGestures: true,
  // Security
  mixedContentMode: "always" as const,
  // ✅ Critical for real-time collaboration (WebRTC, WebSockets)
  allowsInlineMediaPlayback: true,
  mediaPlaybackRequiresUserAction: false,
  javaScriptCanOpenWindowsAutomatically: true,
};

/**
 * Build editor URL with optional auth token
 */
export function buildEditorURL(
  baseURL: string,
  projectId: string,
  fromApp: boolean = true,
  accessToken?: string,
  refreshToken?: string
): string {
  // Always route through the auth import bridge without embedding tokens in the URL.
  const bridge = new URL(`/auth/import-session`, baseURL);
  bridge.searchParams.set("redirect_to", `/project/${projectId}`);
  if (fromApp) bridge.searchParams.set("app", "1");
  return bridge.toString();
}

/**
 * Validate project ID format (UUID v4)
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Logging utility for debugging
 */
export const webViewLogger = {
  info: (message: string, data?: any) => {
    logger.info(`[WebView Integration] ${message}`, data);
  },
  error: (message: string, error?: any) => {
    logger.error(`[WebView Integration] ${message}`, error);
  },
  warn: (message: string, data?: any) => {
    logger.warn(`[WebView Integration] ${message}`, data);
  },
};
