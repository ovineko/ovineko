import type { Middleware, RequestConfig } from "../core/types.js";

/**
 * Generate a request ID using crypto.randomUUID.
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
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
