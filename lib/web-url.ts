import { logger } from "@/lib/logger";

/**
 * Single source of truth for web URLs in the mobile app.
 *
 * We intentionally rely on ONE env var:
 * - EXPO_PUBLIC_WEB_EDITOR_URL (e.g. https://rtastudio.rtabhutan.org or http://10.0.0.5:3000)
 *
 * All other URLs (auth routes, API routes) are derived from it.
 */

export function getWebBaseUrl(): string {
  const baseUrl = process.env.EXPO_PUBLIC_WEB_EDITOR_URL;
  if (!baseUrl) {
    logger.error("[Config] Missing EXPO_PUBLIC_WEB_EDITOR_URL env");
    throw new Error("Missing web base URL");
  }
  return baseUrl.replace(/\/$/, "");
}

export function getWebAuthUrl(): string {
  // Auth UI is hosted under /auth on the same domain.
  return new URL("/auth", getWebBaseUrl()).toString();
}

export function getWebApiUrl(pathname: string): string {
  // Always build from the domain root (so it works even if baseUrl included a path).
  return new URL(pathname, getWebBaseUrl()).toString();
}
