import type { Middleware, RequestConfig } from "../core/types.js";

/**
 * Options for configuring the auth middleware.
 */
export interface AuthMiddlewareOptions {
  /** Function that returns the current token (sync or async). */
  getToken: () => null | Promise<null | string | undefined> | string | undefined;
  /** Authorization header prefix. Defaults to "Bearer". */
  prefix?: string;
  /** URL paths to skip auth injection for (exact match on pathname). */
  skipPaths?: string[];
}

const MIDDLEWARE_NAME = "auth";
const DEFAULT_PREFIX = "Bearer";

/**
 * Creates middleware that injects Authorization header into requests.
 * Skips injection if no token is available or if the request URL matches a skip path.
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions): Middleware {
  const { getToken, prefix = DEFAULT_PREFIX, skipPaths = [] } = options;

  return {
    name: MIDDLEWARE_NAME,
    async onRequest(config: RequestConfig): Promise<RequestConfig> {
      if (shouldSkipPath(config.url, skipPaths)) {
        return config;
      }

      const token = await getToken();

      if (!token) {
        return config;
      }

      const headers = new Headers(config.headers as HeadersInit | undefined);
      headers.set("Authorization", `${prefix} ${token}`);

      return {
        ...config,
        headers: Object.fromEntries(headers.entries()),
      };
    },
  };
}

function shouldSkipPath(url: string | undefined, skipPaths: string[]): boolean {
  if (!url || skipPaths.length === 0) {
    return false;
  }

  // Extract pathname from url (handles both relative and absolute URLs)
  let pathname: string;
  try {
    pathname = new URL(url, "http://localhost").pathname;
  } catch {
    pathname = url;
  }

  return skipPaths.some((path) => pathname === path || pathname.startsWith(path + "/"));
}
