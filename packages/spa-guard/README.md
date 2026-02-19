# @ovineko/spa-guard

Chunk load error handling for Single Page Applications with automatic error detection, beacon reporting, and deployment monitoring.

## Install

```bash
pnpm add @ovineko/spa-guard
```

Peer dependencies vary by integration - see sections below for specific requirements.

## Features

- ✅ **Automatic chunk load error detection** - Handles `vite:preloadError`, dynamic imports, and chunk failures
- ✅ **Global error listeners** - Captures `error`, `unhandledrejection`, and `securitypolicyviolation` events
- ✅ **Beacon-based error reporting** - Uses `navigator.sendBeacon()` with `fetch()` fallback for reliable error reporting
- ✅ **Vite plugin for inline script injection** - Runs before all chunks to catch early errors
- ✅ **Fastify server integration** - Ready-to-use plugin for handling error reports
- ✅ **Version checking** - Detects stale cached code after deployments
- ✅ **React Router v7 integration** - Works seamlessly with React Router error boundaries
- ✅ **Configurable max reload attempts** - Prevents infinite reload loops
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
      maxReloads: 3,
      reportBeacon: {
        endpoint: "/api/beacon",
      },
      checkVersion: {
        endpoint: "/api/version",
        interval: 60_000,
      },
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

## Detailed Usage

### Vite Plugin Setup

The Vite plugin injects an inline script into your HTML `<head>` that runs **before all other chunks**. This ensures error handling is active even if the main bundle fails to load.

```typescript
import { spaGuardVitePlugin } from "@ovineko/spa-guard/vite-plugin";

// Basic usage
spaGuardVitePlugin({
  maxReloads: 3,
  reportBeacon: {
    endpoint: "/api/beacon",
  },
});
```

**How it works:**

1. Reads minified inline script from `dist-inline/index.js`
2. Injects `window.__SPA_GUARD_OPTIONS__` configuration object
3. Prepends inline script to HTML `<head>` (before all other scripts)
4. Script registers error listeners immediately on page load
5. Captures errors even if main application bundle fails

**Configuration:**

- `maxReloads` - Maximum number of automatic reload attempts (default: 3)
- `reportBeacon.endpoint` - Server endpoint to receive error reports
- `checkVersion.endpoint` - Endpoint for version checking (optional)
- `checkVersion.interval` - Version check interval in milliseconds (default: 60000)

### Fastify Integration

The Fastify plugin provides a POST endpoint to receive beacon data from the client.

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

**Default behavior** (without handlers):

- `onBeacon`: Logs structured beacon data with Fastify logger
- `onUnknownBeacon`: Logs warning with raw body

**BeaconSchema structure:**

```typescript
interface BeaconSchema {
  errorMessage?: string; // Error message
  eventMessage?: string; // Event-specific message
  eventName?: string; // Event type (e.g., 'error', 'unhandledrejection')
  serialized?: string; // Serialized error details
}
```

### Options Configuration

The `Options` interface configures client-side behavior:

```typescript
interface Options {
  checkVersion?: {
    endpoint?: string; // Version check endpoint
    interval?: number; // Check interval (default: 60000ms)
  };
  maxReloads?: number; // Max reload attempts (default: 3)
  reportBeacon?: {
    endpoint?: string; // Error reporting endpoint
  };
}
```

**Options are merged from:**

1. Default values (hardcoded in library)
2. Plugin configuration (passed to `spaGuardVitePlugin`)
3. Runtime configuration via `window.__SPA_GUARD_OPTIONS__`

**Example with all options:**

```typescript
spaGuardVitePlugin({
  maxReloads: 5,
  reportBeacon: {
    endpoint: "/api/errors",
  },
  checkVersion: {
    endpoint: "/api/app-version",
    interval: 30_000, // Check every 30 seconds
  },
});
```

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
3. Sends beacon to server
4. Attempts automatic reload (up to `maxReloads`)
5. If reload fails, React Router error boundary catches error
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
console.log("Max reloads:", opts.maxReloads);
```

**Event system:**

- `events.subscribe(listener)` - Subscribe to all spa-guard events
- `events.emit(event)` - Emit event to all subscribers
- Uses Symbol-based storage for isolation
- Safe for server-side rendering (checks for `window` availability)

## API Reference

### Vite Plugin

#### `spaGuardVitePlugin(options: Options): Plugin`

Creates a Vite plugin that injects inline error handling script.

**Parameters:**

- `options: Options` - Configuration object

**Returns:** Vite `Plugin` object

**Example:**

```typescript
import { spaGuardVitePlugin } from "@ovineko/spa-guard/vite-plugin";

export default defineConfig({
  plugins: [
    spaGuardVitePlugin({
      maxReloads: 3,
      reportBeacon: { endpoint: "/api/beacon" },
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

**Example:**

```typescript
import { fastifySPAGuard } from "@ovineko/spa-guard/fastify";

app.register(fastifySPAGuard, {
  path: "/api/beacon",
  onBeacon: async (beacon, request) => {
    await Sentry.captureException(new Error(beacon.errorMessage), {
      extra: beacon,
    });
  },
});
```

### Types

#### `Options`

```typescript
interface Options {
  checkVersion?: {
    endpoint?: string;
    interval?: number; // Default: 60000
  };
  maxReloads?: number; // Default: 3
  reportBeacon?: {
    endpoint?: string;
  };
}
```

#### `BeaconSchema`

```typescript
interface BeaconSchema {
  errorMessage?: string;
  eventMessage?: string;
  eventName?: string;
  serialized?: string;
}
```

### Core Exports

From `@ovineko/spa-guard`:

- `events.subscribe(listener)` - Subscribe to spa-guard events
- `events.emit(event)` - Emit event to subscribers
- `listen()` - Initialize error listeners
- `options.getOptions()` - Get merged options from window
- `options.optionsWindowKey` - Window storage key constant

### Schema Exports

From `@ovineko/spa-guard/schema`:

- `beaconSchema` - TypeBox schema for validation
- `BeaconSchema` - TypeScript type

From `@ovineko/spa-guard/schema/parse`:

- `parseBeacon(data)` - Parse and validate beacon data

## Module Exports

spa-guard provides 8 export entry points:

| Export                   | Description                                  | Peer Dependencies                      |
| ------------------------ | -------------------------------------------- | -------------------------------------- |
| `.`                      | Core functionality (events, listen, options) | None                                   |
| `./schema`               | BeaconSchema type definitions                | `typebox@^1`                           |
| `./schema/parse`         | Beacon parsing utilities                     | `typebox@^1`                           |
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

## How It Works

### Inline Script Execution Flow

1. **Build time:** Vite plugin reads minified script from `dist-inline/index.js`
2. **Build time:** Plugin injects `window.__SPA_GUARD_OPTIONS__` configuration
3. **Build time:** Plugin prepends inline script to HTML `<head>` (before all chunks)
4. **Runtime:** Browser executes inline script immediately
5. **Runtime:** Script registers error event listeners
6. **Runtime:** Error handlers catch failures even if main bundle fails to load

### Error Detection

spa-guard registers multiple event listeners to catch different error types:

**`window.addEventListener('error', ...)`**

- Resource load failures (`<script>`, `<link>`, `<img>`)
- Synchronous JavaScript errors
- Uses capture phase (`{ capture: true }`) to catch early

**`window.addEventListener('unhandledrejection', ...)`**

- Promise rejections
- Dynamic `import()` failures
- Async/await errors without try/catch

**`window.addEventListener('securitypolicyviolation', ...)`**

- Content Security Policy violations
- Blocked scripts/resources

**`window.addEventListener('vite:preloadError', ...)`** (Vite-specific)

- Vite chunk preload failures
- CSS preload errors

### Beacon Reporting

Error data is sent to the server using a fire-and-forget pattern:

1. **Primary:** `navigator.sendBeacon(endpoint, JSON.stringify(data))`
   - Works even during page unload
   - Non-blocking
   - Reliable delivery
2. **Fallback:** `fetch(endpoint, { method: 'POST', body: data, keepalive: true })`
   - Used if beacon is unavailable
   - `keepalive: true` ensures delivery during navigation

**Beacon data structure:**

```json
{
  "errorMessage": "Failed to fetch dynamically imported module",
  "eventName": "unhandledrejection",
  "eventMessage": "...",
  "serialized": "{\"stack\":\"...\"}"
}
```

### Version Checking

If configured, spa-guard periodically checks for new deployments:

1. Poll `checkVersion.endpoint` at specified interval
2. Compare response with cached version
3. If version changed, notify user or trigger reload
4. Prevents chunk errors by detecting stale code proactively

## TypeScript

All exports are fully typed with TypeScript definitions:

```typescript
import type { Options } from "@ovineko/spa-guard/vite-plugin";
import type { BeaconSchema } from "@ovineko/spa-guard/schema";
import type { FastifySPAGuardOptions } from "@ovineko/spa-guard/fastify";

const options: Options = {
  maxReloads: 3,
  reportBeacon: {
    endpoint: "/api/beacon",
  },
};

const handleBeacon = (beacon: BeaconSchema) => {
  console.log(beacon.errorMessage);
};
```

**Type features:**

- JSDoc comments with default values
- BeaconSchema from TypeBox with runtime validation
- Fastify plugin types for type-safe integration
- Options interface with optional fields

## License

MIT
