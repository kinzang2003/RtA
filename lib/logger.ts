/**
 * Minimal logger for React Native mobile app.
 * - Debug/info only output in development (__DEV__).
 * - Warn/error always log, but callers should avoid PII.
 */

const isDev = typeof __DEV__ !== "undefined" && __DEV__;

function safeConsole(method: "log" | "info" | "warn" | "error", ...args: any[]) {
  // Guard against console being undefined in rare RN environments
  if (typeof console?.[method] === "function") {
    // eslint-disable-next-line no-console
    console[method](...args);
  }
}

export const logger = {
  debug: (...args: any[]) => {
    if (isDev) safeConsole("log", ...args);
  },
  info: (...args: any[]) => {
    if (isDev) safeConsole("info", ...args);
  },
  // Hide warnings in production to avoid leaking internals/PII
  warn: (...args: any[]) => {
    if (isDev) safeConsole("warn", ...args);
  },
  error: (...args: any[]) => safeConsole("error", ...args),
};
