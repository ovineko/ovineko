import type { Middleware, RequestConfig } from "../core/types.js";

/**
 * Generate a request ID using crypto.randomUUID with fallback.
 */
export function generateRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // Fallback: generate a v4-like UUID using crypto.getRandomValues
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Set version 4 (0100xxxx in byte 6)
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  // Set variant 10xxxxxx in byte 8
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const REQUEST_ID_HEADER = "X-Request-Id";
const MIDDLEWARE_NAME = "request-id";

/**
 * Creates middleware that injects X-Request-Id header into every request.
 * Skips injection if the header is already present.
 */
export function createRequestIdMiddleware(): Middleware {
  return {
    name: MIDDLEWARE_NAME,
    onRequest(config: RequestConfig): RequestConfig {
      const headers = new Headers(config.headers as HeadersInit | undefined);

      if (headers.has(REQUEST_ID_HEADER)) {
        return config;
      }

      headers.set(REQUEST_ID_HEADER, generateRequestId());

      return {
        ...config,
        headers: Object.fromEntries(headers.entries()),
      };
    },
  };
}
