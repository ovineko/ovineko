# @ovineko/spa-guard

Production-ready error handling for Single Page Applications with automatic chunk error recovery, intelligent retry logic, and comprehensive error reporting.

## Install

```bash
pnpm add @ovineko/spa-guard
```

Peer dependencies vary by integration - see sections below for specific requirements.

## Features

- ✅ **Automatic chunk load error detection** - Handles `vite:preloadError`, dynamic imports, and chunk failures across Chrome, Firefox, and Safari
- ✅ **Intelligent retry with cache busting** - Uses query parameters with UUID to bypass HTML cache after deployments
- ✅ **Configurable retry delays** - Flexible delay arrays (e.g., `[1000, 2000, 5000]`) instead of simple max attempts
- ✅ **Graceful fallback UI** - Shows user-friendly error screen after all retry attempts are exhausted
- ✅ **Configurable injection target** - Inject fallback UI into any element via CSS selector (default: `body`)
- ✅ **Error filtering** - Filter out specific errors from logging and reporting via `ignoredErrors` option
- ✅ **Deep error serialization** - Captures detailed error information for server-side analysis
- ✅ **Smart beacon reporting** - Sends error reports only after retry exhaustion to prevent spam
- ✅ **Dual build system** - Production minified (5KB) and trace verbose (10KB) builds for different environments
- ✅ **Global error listeners** - Captures `error`, `unhandledrejection`, and `securitypolicyviolation` events
- ✅ **Vite plugin for inline script injection** - Runs before all chunks to catch early errors
- ✅ **HTML minification** - Automatically minifies fallback HTML to reduce bundle size
- ✅ **Fastify server integration** - Ready-to-use plugin for handling error reports
- ✅ **React Router v7 integration** - Works seamlessly with React Router error boundaries
- ✅ **TypeScript support** - Full type definitions with all exports
- ✅ **Framework-agnostic core** - Works with or without React

## Quick Start

### Vite + React Router Setup

```tsx
// vite.config.ts
import { spaGuardVitePlugin } from "@ovineko/spa-guard/vite-plugin";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    spaGuardVitePlugin({
      // Production configuration
      reloadDelays: [1000, 2000, 5000], // 3 attempts with increasing delays
      fallback: {
        html: `
          <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif">
            <div style="text-align:center">
              <h1>Something went wrong</h1>
              <p>Please refresh the page to continue.</p>
              <button onclick="location.reload()">Refresh Page</button>
            </div>
          </div>
        `,
        selector: "body", // CSS selector where to inject fallback UI (default: "body")
      },
      reportBeacon: {
        endpoint: "/api/beacon",
      },
      ignoredErrors: [], // Filter out specific error messages from reporting
      useRetryId: true, // Use query parameters for cache busting (default: true)
    }),
    react(),
  ],
});
```

### Development with Trace Mode

```tsx
// vite.config.ts
export default defineConfig({
  plugins: [
    spaGuardVitePlugin({
      trace: true, // Enable verbose logging (10KB instead of 5KB)
      reloadDelays: [1000, 2000],
      reportBeacon: { endpoint: "/api/beacon" },
    }),
    react(),
  ],
});
```

### Fastify Server

```typescript
// server.ts
import { fastifySPAGuard } from "@ovineko/spa-guard/fastify";
import Fastify from "fastify";

const app = Fastify();

app.register(fastifySPAGuard, {
  path: "/api/beacon",
  onBeacon: async (beacon, request) => {
    // Log to Sentry, DataDog, or your monitoring service
    request.log.error(beacon, "Client error received");

    // Optional: Send to Sentry
    // Sentry.captureException(new Error(beacon.errorMessage), {
    //   extra: beacon
    // });
  },
});

await app.listen({ port: 3000 });
```

## How It Works

### Chunk Error Recovery Flow

When a chunk load error occurs (typically after deployment):

1. **Error Detection**: spa-guard detects chunk load error (e.g., "Failed to fetch dynamically imported module")
2. **Cache Bypass**: Generates unique retry ID using `crypto.randomUUID()` (or secure fallback)
3. **First Reload**: Adds query parameters `?spaGuardRetryId=uuid&spaGuardRetryAttempt=1`
4. **Browser Refresh**: Browser sees new URL → bypasses cache → requests fresh HTML from server
5. **Success or Retry**: If still failing, increases attempt count and tries again with longer delay
6. **Fallback UI**: After all attempts exhausted, shows custom error screen and sends beacon to server

**Why query parameters instead of sessionStorage?**

- **Bypasses HTML cache**: Even if `index.html` has aggressive cache headers, unique URL forces fresh fetch
- **No storage limitations**: Works in private browsing, cross-domain, and storage-disabled environments
- **Cache-Control agnostic**: Doesn't rely on server cache configuration

### Retry Delay Strategy

```typescript
reloadDelays: [1000, 2000, 5000]; // Default
```

- **Attempt 1**: Wait 1000ms (1s) → reload with `?spaGuardRetryAttempt=1`
- **Attempt 2**: Wait 2000ms (2s) → reload with `?spaGuardRetryAttempt=2`
- **Attempt 3**: Wait 5000ms (5s) → reload with `?spaGuardRetryAttempt=3`
- **Exhausted**: Show fallback UI, send beacon to server

### Secure Random ID Generation

Three-tier fallback chain for maximum compatibility:

1. **crypto.randomUUID()** - Modern browsers in secure contexts (HTTPS/localhost)
2. **crypto.getRandomValues()** - Older browsers in secure contexts
3. **Math.random()** - Last resort for insecure contexts (HTTP)

## Detailed Usage

### Vite Plugin Configuration

The Vite plugin injects an inline script into your HTML `<head>` that runs **before all other chunks**. This ensures error handling is active even if the main bundle fails to load.

```typescript
import { spaGuardVitePlugin } from "@ovineko/spa-guard/vite-plugin";

spaGuardVitePlugin({
  // Retry configuration
  reloadDelays: [1000, 2000, 5000], // Array of delays in milliseconds
  useRetryId: true, // Use query parameters for cache busting (default: true)

  // Fallback UI configuration
  fallback: {
    html: `
      <div style="...">
        <h1>Something went wrong</h1>
        <button onclick="location.reload()">Refresh</button>
      </div>
    `,
    selector: "body", // CSS selector for injection target (default: "body")
  },

  // Error filtering
  ignoredErrors: [], // Array of error message substrings to ignore

  // Beacon reporting
  reportBeacon: {
    endpoint: "/api/beacon", // Server endpoint for error reports
  },

  // Build mode
  trace: false, // Set to true for verbose debug build (10KB vs 5KB)
});
```

**How it works:**

1. Reads minified inline script from `dist-inline/index.js` (or `dist-inline-trace/index.js` if trace mode)
2. Injects `window.__SPA_GUARD_OPTIONS__` configuration object
3. Prepends inline script to HTML `<head>` (before all other scripts)
4. Script registers error listeners immediately on page load
5. Captures errors even if main application bundle fails

### Options Interface

```typescript
interface Options {
  reloadDelays?: number[]; // Array of retry delays in ms (default: [1000, 2000, 5000])
  useRetryId?: boolean; // Use query params for cache busting (default: true)

  fallback?: {
    html?: string; // Custom error UI HTML (default: basic error screen)
    selector?: string; // CSS selector for injection target (default: "body")
  };

  ignoredErrors?: string[]; // Error message substrings to filter out (default: [])

  reportBeacon?: {
    endpoint?: string; // Server endpoint for beacon reports
  };
}

interface VitePluginOptions extends Options {
  trace?: boolean; // Enable verbose trace build (default: false)
}
```

**Default values:**

```typescript
{
  reloadDelays: [1000, 2000, 5000],
  useRetryId: true,
  fallback: {
    html: `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif">
        <div style="text-align:center">
          <h1>Something went wrong</h1>
          <p>Please refresh the page to continue.</p>
          <button onclick="location.reload()">Refresh Page</button>
        </div>
      </div>
    `,
    selector: "body",
  },
  ignoredErrors: [],
}
```

### Fastify Integration

The Fastify plugin provides a POST endpoint to receive beacon data from clients.

```typescript
import { fastifySPAGuard } from "@ovineko/spa-guard/fastify";

app.register(fastifySPAGuard, {
  path: "/api/beacon",

  // Custom beacon handler
  onBeacon: async (beacon, request) => {
    const error = new Error(beacon.errorMessage || "Unknown client error");

    // Log structured data
    request.log.error(
      {
        errorMessage: beacon.errorMessage,
        eventName: beacon.eventName,
        eventMessage: beacon.eventMessage,
        serialized: beacon.serialized,
      },
      "SPA Guard beacon received",
    );

    // Send to monitoring service
    await sendToMonitoring(error, beacon);
  },

  // Handle unknown/invalid beacon formats
  onUnknownBeacon: async (body, request) => {
    request.log.warn({ body }, "Received unknown beacon format");
  },
});
```

**BeaconSchema structure:**

```typescript
interface BeaconSchema {
  errorMessage?: string; // Error message
  eventMessage?: string; // Event-specific message
  eventName?: string; // Event type (e.g., 'chunk_error_max_reloads', 'error', 'unhandledrejection')
  serialized?: string; // Serialized error details (JSON string)
}
```

**Beacon events:**

- `chunk_error_max_reloads` - All reload attempts exhausted for chunk error
- `error` - Non-chunk global error
- `unhandledrejection` - Non-chunk promise rejection
- `uncaughtException` - Uncaught exception
- `securitypolicyviolation` - CSP violation

### React Router Integration

spa-guard works seamlessly with React Router v7 error boundaries:

```tsx
import { createBrowserRouter, RouterProvider } from "react-router";
import { ErrorBoundaryReloadPage } from "@ovineko/react-error-boundary";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorBoundaryReloadPage />,
    children: [
      {
        path: "users/:id",
        lazy: () => import("./pages/UserPage"),
      },
    ],
  },
]);

function Root() {
  return <RouterProvider router={router} />;
}
```

**Error flow:**

1. Chunk load error occurs (e.g., after deployment)
2. spa-guard inline script detects error
3. Attempts automatic reload with query parameters (up to `reloadDelays.length` times)
4. If all reloads fail, sends beacon to server and shows fallback UI
5. React Router error boundary catches error (if no fallback UI configured)
6. `ErrorBoundaryReloadPage` displays fallback UI

### Core API (Framework-agnostic)

The core module provides low-level APIs for custom integrations:

```typescript
import { events, listen, options } from "@ovineko/spa-guard";

// Subscribe to spa-guard events
events.subscribe((event) => {
  console.log("SPA Guard event:", event);
});

// Emit custom event
events.emit({ type: "custom", data: "..." });

// Initialize error listeners (automatically called by inline script)
listen();

// Get merged options
const opts = options.getOptions();
console.log("Reload delays:", opts.reloadDelays);
```

**Event system:**

- `events.subscribe(listener)` - Subscribe to all spa-guard events
- `events.emit(event)` - Emit event to all subscribers
- Uses Symbol-based storage for isolation
- Safe for server-side rendering (checks for `globalThis.window` availability)

## Error Detection

spa-guard registers multiple event listeners to catch different error types:

**`globalThis.window.addEventListener('error', ...)`**

- Resource load failures (`<script>`, `<link>`, `<img>`)
- Synchronous JavaScript errors
- Uses capture phase (`{ capture: true }`) to catch early

**`globalThis.window.addEventListener('unhandledrejection', ...)`**

- Promise rejections
- Dynamic `import()` failures
- Async/await errors without try/catch

**`globalThis.window.addEventListener('securitypolicyviolation', ...)`**

- Content Security Policy violations
- Blocked scripts/resources

**`globalThis.window.addEventListener('vite:preloadError', ...)`** (Vite-specific)

- Vite chunk preload failures
- CSS preload errors

### Chunk Error Patterns

spa-guard detects chunk errors across browsers using regex patterns:

```typescript
const patterns = [
  /Failed to fetch dynamically imported module/i, // Chrome/Edge
  /Importing a module script failed/i, // Firefox
  /error loading dynamically imported module/i, // Safari
  /Unable to preload CSS/i, // CSS chunk errors
  /Loading chunk \d+ failed/i, // Webpack
  /Loading CSS chunk \d+ failed/i, // Webpack CSS
  /ChunkLoadError/i, // Generic
  /Failed to fetch/i, // Network failures
];
```

## Deep Error Serialization

spa-guard captures maximum error information for server analysis:

**Error types:**

- `Error` - Standard JavaScript errors (name, message, stack, custom properties)
- `ErrorEvent` - DOM error events (message, filename, lineno, colno, error)
- `PromiseRejectionEvent` - Unhandled promise rejections (reason, promise)
- `SecurityPolicyViolationEvent` - CSP violations (blockedURI, violatedDirective, etc.)
- `Event` - Generic events (type, target, timeStamp)

**Example serialized output:**

```json
{
  "type": "ErrorEvent",
  "message": "Failed to fetch dynamically imported module",
  "filename": "https://example.com/app.js",
  "lineno": 42,
  "colno": 15,
  "error": {
    "type": "Error",
    "name": "TypeError",
    "message": "Failed to fetch dynamically imported module",
    "stack": "TypeError: Failed to fetch...\n    at loadChunk..."
  }
}
```

## Beacon Reporting

Error data is sent to the server using a fire-and-forget pattern:

1. **Primary:** `navigator.sendBeacon(endpoint, JSON.stringify(data))`
   - Works even during page unload
   - Non-blocking
   - Reliable delivery
2. **Fallback:** `fetch(endpoint, { method: 'POST', body: data, keepalive: true })`
   - Used if beacon is unavailable
   - `keepalive: true` ensures delivery during navigation

**Important:** Beacons are sent **only after retry exhaustion** for chunk errors to prevent spam during normal recovery.

## API Reference

### Vite Plugin

#### `spaGuardVitePlugin(options: VitePluginOptions): Plugin`

Creates a Vite plugin that injects inline error handling script.

**Parameters:**

- `options: VitePluginOptions` - Configuration object

**Returns:** Vite `Plugin` object

**Example:**

```typescript
import { spaGuardVitePlugin } from "@ovineko/spa-guard/vite-plugin";

export default defineConfig({
  plugins: [
    spaGuardVitePlugin({
      reloadDelays: [1000, 2000, 5000],
      reportBeacon: { endpoint: "/api/beacon" },
      trace: false,
    }),
  ],
});
```

### Fastify Plugin

#### `fastifySPAGuard(fastify, options: FastifySPAGuardOptions): Promise<void>`

Registers a POST endpoint to receive beacon data from clients.

**Parameters:**

- `fastify` - Fastify instance
- `options: FastifySPAGuardOptions` - Configuration object

**FastifySPAGuardOptions:**

```typescript
interface FastifySPAGuardOptions {
  path: string; // Route path (e.g., "/api/beacon")
  onBeacon?: (beacon: BeaconSchema, request: any) => Promise<void> | void;
  onUnknownBeacon?: (body: unknown, request: any) => Promise<void> | void;
}
```

### Types

#### `Options`

```typescript
interface Options {
  reloadDelays?: number[]; // Retry delays in ms (default: [1000, 2000, 5000])
  useRetryId?: boolean; // Use query params for cache busting (default: true)

  fallback?: {
    html?: string; // Custom error UI HTML
    selector?: string; // CSS selector for injection target (default: "body")
  };

  ignoredErrors?: string[]; // Error message substrings to filter out (default: [])

  reportBeacon?: {
    endpoint?: string; // Error reporting endpoint
  };
}
```

#### `VitePluginOptions`

```typescript
interface VitePluginOptions extends Options {
  trace?: boolean; // Enable verbose trace build (default: false)
}
```

#### `BeaconSchema`

```typescript
interface BeaconSchema {
  errorMessage?: string;
  eventMessage?: string;
  eventName?: string;
  serialized?: string; // JSON stringified error details
}
```

### Core Exports

From `@ovineko/spa-guard`:

- `events.subscribe(listener)` - Subscribe to spa-guard events
- `events.emit(event)` - Emit event to subscribers
- `listen()` - Initialize error listeners
- `options.getOptions()` - Get merged options from globalThis.window
- `options.optionsWindowKey` - Window storage key constant

### Schema Exports

From `@ovineko/spa-guard/schema`:

- `beaconSchema` - TypeBox schema for validation
- `BeaconSchema` - TypeScript type

From `@ovineko/spa-guard/schema/parse`:

- `parseBeacon(data)` - Parse and validate beacon data

### Runtime Exports

From `@ovineko/spa-guard/runtime`:

- `getState()` - Get current spa-guard state (currentAttempt, isFallbackShown, isWaiting)
- `subscribeToState(callback)` - Subscribe to state changes, returns unsubscribe function
- `SpaGuardState` - TypeScript type for state object

**Example:**

```typescript
import { getState, subscribeToState } from "@ovineko/spa-guard/runtime";

// Get current state
const state = getState();
console.log("Current attempt:", state.currentAttempt);
console.log("Is fallback shown:", state.isFallbackShown);
console.log("Is waiting for retry:", state.isWaiting);

// Subscribe to state changes
const unsubscribe = subscribeToState((state) => {
  console.log("State changed:", state);
});

// Later: unsubscribe
unsubscribe();
```

## Module Exports

spa-guard provides 9 export entry points:

| Export                   | Description                                  | Peer Dependencies                      |
| ------------------------ | -------------------------------------------- | -------------------------------------- |
| `.`                      | Core functionality (events, listen, options) | None                                   |
| `./schema`               | BeaconSchema type definitions                | `typebox@^1`                           |
| `./schema/parse`         | Beacon parsing utilities                     | `typebox@^1`                           |
| `./runtime`              | Runtime state management and subscriptions   | None                                   |
| `./react`                | React integration (placeholder)              | `react@^19`                            |
| `./react-router`         | React Router integration                     | `react@^19`, `react-router@^7`         |
| `./fastify`              | Fastify server plugin                        | None                                   |
| `./vite-plugin`          | Vite build plugin                            | `vite@^7 \|\| ^8`                      |
| `./react-error-boundary` | Error boundary re-export                     | `react@^19`, `react-error-boundary@^6` |

**Import examples:**

```typescript
// Core
import { events, listen } from "@ovineko/spa-guard";

// Schema
import type { BeaconSchema } from "@ovineko/spa-guard/schema";

// Vite plugin
import { spaGuardVitePlugin } from "@ovineko/spa-guard/vite-plugin";

// Fastify
import { fastifySPAGuard } from "@ovineko/spa-guard/fastify";
```

## Build Sizes

- **Production:** `dist-inline/index.js` ~5KB minified (Terser)
- **Trace:** `dist-inline-trace/index.js` ~10KB unminified (debug)
- **Main library:** `dist/` varies by export

## Advanced Usage

### Disable Query Parameters (PII Concerns)

If query parameters are problematic for your use case:

```typescript
spaGuardVitePlugin({
  useRetryId: false, // Disable query parameters
  reloadDelays: [1000, 2000], // Still retries, but without cache busting
});
```

**Note:** Without `useRetryId`, retries use `globalThis.window.location.reload()` which may not bypass aggressive HTML cache.

### Custom Fallback UI

Provide fully custom HTML for error screen:

```typescript
spaGuardVitePlugin({
  fallback: {
    html: `
      <style>
        .spa-guard-error {
          font-family: system-ui, -apple-system, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          padding: 20px;
          box-sizing: border-box;
        }
        .spa-guard-container {
          max-width: 500px;
          text-align: center;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          padding: 40px;
          border-radius: 20px;
        }
        .spa-guard-button {
          background: white;
          color: #667eea;
          border: none;
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          margin-top: 20px;
        }
        .spa-guard-button:hover {
          transform: scale(1.05);
        }
      </style>
      <div class="spa-guard-error">
        <div class="spa-guard-container">
          <h1>⚠️ Application Error</h1>
          <p>We're experiencing technical difficulties. Please try reloading the page.</p>
          <button class="spa-guard-button" onclick="location.reload()">Reload Application</button>
        </div>
      </div>
    `,
    selector: "body", // Inject into document.body
  },
});
```

### Custom Injection Target

Inject fallback UI into a specific element instead of `<body>`:

```typescript
spaGuardVitePlugin({
  fallback: {
    html: `<div>Error occurred. <button onclick="location.reload()">Retry</button></div>`,
    selector: "#app", // Inject into <div id="app">
  },
});
```

### Error Filtering

Filter out specific errors from being logged or reported:

```typescript
spaGuardVitePlugin({
  ignoredErrors: [
    "ResizeObserver loop", // Ignore benign ResizeObserver errors
    "Non-Error promise rejection", // Ignore specific promise rejections
    "Script error", // Ignore generic script errors from third-party scripts
  ],
  reportBeacon: {
    endpoint: "/api/beacon",
  },
});
```

**How it works:**

- Errors containing any of the `ignoredErrors` substrings will not be logged to console
- Beacons for filtered errors will not be sent to the server
- Useful for filtering out known benign errors or third-party script noise
- Case-sensitive substring matching

### Custom Retry Strategy

Adjust retry delays for different environments:

```typescript
// Aggressive retries for production
spaGuardVitePlugin({
  reloadDelays: [500, 1000, 2000, 5000, 10000], // 5 attempts
});

// Quick retries for development
spaGuardVitePlugin({
  trace: true,
  reloadDelays: [100, 500], // 2 fast attempts
});
```

## TypeScript

All exports are fully typed with TypeScript definitions:

```typescript
import type { Options, VitePluginOptions } from "@ovineko/spa-guard/vite-plugin";
import type { BeaconSchema } from "@ovineko/spa-guard/schema";
import type { FastifySPAGuardOptions } from "@ovineko/spa-guard/fastify";

const options: VitePluginOptions = {
  reloadDelays: [1000, 2000, 5000],
  reportBeacon: {
    endpoint: "/api/beacon",
  },
  trace: false,
};

const handleBeacon = (beacon: BeaconSchema) => {
  console.log(beacon.errorMessage);
  console.log(beacon.serialized);
};
```

**Type features:**

- JSDoc comments with default values
- BeaconSchema from TypeBox with runtime validation
- Fastify plugin types for type-safe integration
- Options interface with optional fields

## Future Enhancements

Detailed specifications for planned features are documented in [TODO.md](TODO.md):

- **Version Checker Module** - Detect new deployments via HTML or JSON polling
- **Enhanced Event Emitter Architecture** - Rich event system for SPA integration with React hooks

These features are designed to extend spa-guard's capabilities while maintaining the minimal inline script footprint.

## License

MIT
