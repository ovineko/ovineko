// Core client
export { createClient } from "./core/client.js";
export { MiddlewareOrchestrator } from "./core/middleware.js";
export { getGlobalClient, resetGlobalClient, setGlobalClient } from "./core/singleton.js";

// Types
export type {
  Client,
  ClientConfiguration,
  ClientSetup,
  ClientWithSetup,
  Middleware,
  RequestConfig,
  ResponseConfig,
  ResponseErrorConfig,
} from "./core/types.js";

// Middleware
export {
  createAuthMiddleware,
  createRequestIdMiddleware,
  createSentryMiddleware,
  generateRequestId,
} from "./middleware/index.js";
export type {
  AuthMiddlewareOptions,
  SentryLike,
  SentryMiddlewareOptions,
} from "./middleware/index.js";

// Default export: global client instance for Kubb compatibility
// Generated code does: import client from "@ovineko/kubb-client"
// Uses a Proxy so that setGlobalClient() and resetGlobalClient() are reflected
// in already-imported references.
import type { ClientWithSetup } from "./core/types.js";

import { getGlobalClient } from "./core/singleton.js";

const client: ClientWithSetup = new Proxy((() => {}) as unknown as ClientWithSetup, {
  apply(_target, _thisArg, args) {
    return Reflect.apply(
      getGlobalClient() as unknown as (...a: unknown[]) => unknown,
      undefined,
      args,
    );
  },
  get(_target, prop, receiver) {
    return Reflect.get(getGlobalClient(), prop, receiver);
  },
});
export default client;
