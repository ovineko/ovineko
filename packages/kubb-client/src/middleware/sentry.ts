import type { Middleware, RequestConfig, ResponseConfig } from "../core/types.js";

/**
 * Minimal Sentry SDK interface required by the middleware.
 * Accepts any object that implements these methods (e.g., @sentry/browser, @sentry/react).
 */
export interface SentryLike {
  addBreadcrumb: (breadcrumb: {
    category?: string;
    data?: Record<string, unknown>;
    level?: "debug" | "error" | "fatal" | "info" | "warning";
    message?: string;
    type?: string;
  }) => void;
  captureException: (
    error: unknown,
    context?: {
      extra?: Record<string, unknown>;
      tags?: Record<string, string>;
    },
  ) => void;
}

/**
 * Options for configuring the Sentry middleware.
 */
export interface SentryMiddlewareOptions {
  /** URL patterns to exclude from Sentry tracking (substring match). */
  excludeUrls?: string[];
  /** Maximum request/response body size to include in breadcrumb data (bytes). Defaults to 1024. */
  maxBodySize?: number;
  /** Sentry SDK instance (must implement addBreadcrumb and captureException). */
  Sentry: SentryLike;
  /** Additional tags to attach to captured exceptions. */
  tags?: Record<string, string>;
}

const MIDDLEWARE_NAME = "sentry";
const DEFAULT_MAX_BODY_SIZE = 1024;

/**
 * Creates middleware that integrates with Sentry for error tracking.
 * - onRequest: adds a breadcrumb for outgoing requests
 * - onResponse: adds a breadcrumb for responses (info for 2xx, warning for 4xx/5xx)
 * - onError: captures exceptions with context and tags
 */
export function createSentryMiddleware(options: SentryMiddlewareOptions): Middleware {
  const { excludeUrls = [], maxBodySize = DEFAULT_MAX_BODY_SIZE, Sentry, tags = {} } = options;

  if (
    !Sentry ||
    typeof Sentry.addBreadcrumb !== "function" ||
    typeof Sentry.captureException !== "function"
  ) {
    throw new Error(
      "[@ovineko/kubb-client] Sentry SDK is invalid: must implement addBreadcrumb and captureException methods.",
    );
  }

  return {
    name: MIDDLEWARE_NAME,

    onError(error: unknown): void {
      Sentry.captureException(error, {
        extra: {
          middleware: MIDDLEWARE_NAME,
        },
        tags: {
          ...tags,
          source: "kubb-client",
        },
      });
    },

    onRequest(config: RequestConfig): RequestConfig {
      if (shouldExcludeUrl(config.url, excludeUrls)) {
        return config;
      }

      Sentry.addBreadcrumb({
        category: "http",
        data: {
          method: config.method ?? "GET",
          url: config.url ?? "",
          ...truncateBody(config.data, maxBodySize),
        },
        level: "info",
        message: `${config.method ?? "GET"} ${config.url ?? ""}`,
        type: "http",
      });

      return config;
    },

    onResponse(response: ResponseConfig): ResponseConfig {
      const level = response.status >= 400 ? "warning" : "info";

      Sentry.addBreadcrumb({
        category: "http",
        data: {
          status: response.status,
          statusText: response.statusText,
        },
        level,
        message: `${response.status} ${response.statusText}`,
        type: "http",
      });

      return response;
    },
  };
}

function shouldExcludeUrl(url: string | undefined, excludeUrls: string[]): boolean {
  if (!url || excludeUrls.length === 0) {
    return false;
  }

  return excludeUrls.some((pattern) => url.includes(pattern));
}

function truncateBody(data: unknown, maxSize: number): { body?: string } {
  if (data === undefined || data === null) {
    return {};
  }

  if (data instanceof FormData) {
    return { body: "[FormData]" };
  }

  try {
    const str = typeof data === "string" ? data : JSON.stringify(data);
    if (str.length > maxSize) {
      return { body: str.slice(0, maxSize) + "..." };
    }
    return { body: str };
  } catch {
    return { body: "[unserializable]" };
  }
}
