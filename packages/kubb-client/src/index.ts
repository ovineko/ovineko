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
import { getGlobalClient } from "./core/singleton.js";

const client = getGlobalClient();
export default client;
