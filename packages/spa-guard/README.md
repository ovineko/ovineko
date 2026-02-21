# @ovineko/spa-guard

Production-ready error handling for Single Page Applications with automatic chunk error recovery, intelligent retry logic, and comprehensive error reporting.

## Install

```bash
pnpm add @ovineko/spa-guard
```

Peer dependencies vary by integration - see sections below for specific requirements.

> **Alpha software:** This package is in active development (`0.0.1-alpha`). The public API may change between versions without migration guides. This README always reflects the current state.

## Features

- ✅ **Automatic chunk load error detection** - Handles `vite:preloadError`, dynamic imports, and chunk failures across Chrome, Firefox, and Safari
- ✅ **Intelligent retry with cache busting** - Uses query parameters with UUID to bypass HTML cache after deployments
- ✅ **Smart retry cycle reset** - Automatically resets retry cycle when enough time has passed since last reload
- ✅ **Configurable retry delays** - Flexible delay arrays (e.g., `[1000, 2000, 5000]`) instead of simple max attempts
- ✅ **Infinite loop protection** - Prevents rapid retry resets with configurable minimum time between resets
- ✅ **Graceful fallback UI** - Shows user-friendly error screen after all retry attempts are exhausted
- ✅ **Configurable injection target** - Inject fallback UI into any element via CSS selector (default: `body`)
- ✅ **Error filtering** - Filter out specific errors from logging and reporting via `ignoredErrors` option
- ✅ **Deep error serialization** - Captures detailed error information for server-side analysis
- ✅ **Smart beacon reporting** - Sends error reports only after retry exhaustion to prevent spam
- ✅ **Dual build system** - Production minified (~5.9 KB) and trace minified (~7.3 KB) builds for different environments
- ✅ **Global error listeners** - Captures `error`, `unhandledrejection`, and `securitypolicyviolation` events
- ✅ **Vite plugin for inline script injection** - Runs before all chunks to catch early errors
- ✅ **HTML minification** - Automatically minifies fallback HTML to reduce bundle size
- ✅ **Fastify server integration** - Ready-to-use plugin for handling error reports
- ✅ **React Router v7 integration** - Works seamlessly with React Router error boundaries
- ✅ **TypeScript support** - Full type definitions with all exports
- ✅ **Framework-agnostic core** - Works with or without React
- ✅ **lazyWithRetry** - Drop-in React.lazy replacement with automatic module-level retry before page reload
- ✅ **Version checker** - Proactive new-deployment detection via HTML or JSON polling
- ✅ **Event hooks** - React hooks for subscribing to spa-guard events (`useSPAGuardEvents`, `useSPAGuardChunkError`)
- ✅ **Retry control** - Programmatic control over default retry behavior (`disableDefaultRetry`, `enableDefaultRetry`)
- ✅ **ESLint plugin** - Enforces usage of spa-guard wrappers instead of direct React imports

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

### Smart Retry Cycle Reset

When `enableRetryReset: true` (default), spa-guard automatically resets the retry cycle if enough time has passed since the last reload. This prevents retry attempts from accumulating unnecessarily.

**How it works:**

1. User is on `?spaGuardRetryAttempt=2` after waiting 2 seconds for a reload
2. User successfully uses the app for 5 seconds (longer than the retry delay)
3. A new error occurs
4. Instead of continuing to attempt 3, spa-guard:
   - Clears retry parameters from URL (without page reload)
   - Starts a fresh retry cycle from attempt 0
   - Generates a new retry ID

**Benefits:**

- Clean URLs when retries are successful
- Each error context gets its own independent retry cycle
- Better user experience for long-running sessions

**Infinite loop protection:**

The `minTimeBetweenResets` option (default: 5000ms) prevents infinite reset loops by ensuring a reset can only happen if the previous reset was at least this many milliseconds ago.

**Example:**

```typescript
spaGuardVitePlugin({
  enableRetryReset: true, // Enable smart reset (default)
  minTimeBetweenResets: 5000, // Minimum 5s between resets (default)
  reloadDelays: [1000, 2000, 5000],
});
```

**Disable if needed:**

```typescript
spaGuardVitePlugin({
  enableRetryReset: false, // Keep old behavior - retry params persist
});
```

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
  enableRetryReset: true, // Auto-reset retry cycle when enough time passes (default: true)
  minTimeBetweenResets: 5000, // Min time between retry resets in ms (default: 5000)

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
  enableRetryReset?: boolean; // Auto-reset retry cycle when enough time passes (default: true)
  minTimeBetweenResets?: number; // Min time between retry resets to prevent loops (default: 5000)

  version?: string; // App version (auto-injected by Vite plugin from package.json)

  checkVersion?: {
    mode?: "html" | "json"; // Detection mode (default: "html")
    interval?: number; // Polling interval in ms (default: 60000)
    endpoint?: string; // JSON endpoint URL (required for "json" mode)
  };

  fallback?: {
    html?: string; // Custom error UI HTML (default: basic error screen)
    selector?: string; // CSS selector for injection target (default: "body")
  };

  ignoredErrors?: string[]; // Error message substrings to filter out (default: [])

  reportBeacon?: {
    endpoint?: string; // Server endpoint for beacon reports
  };

  lazyRetry?: {
    retryDelays?: number[]; // Delays in ms for module-level retries (default: [1000, 2000])
    callReloadOnFailure?: boolean; // Trigger page reload after all retries fail (default: true)
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
  enableRetryReset: true,
  minTimeBetweenResets: 5000,
  checkVersion: {
    mode: "html",
    interval: 60_000,
  },
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
- `securitypolicyviolation` - CSP violation

### React Integration

spa-guard provides two React error boundary components with automatic chunk error recovery.

#### ErrorBoundary (Class-based)

Standard React error boundary with spa-guard integration:

```tsx
import { ErrorBoundary } from "@ovineko/spa-guard/react-error-boundary";

function App() {
  return (
    <ErrorBoundary
      autoRetryChunkErrors={true}
      sendBeaconOnError={true}
      onError={(error, errorInfo) => {
        console.error("Error caught:", error, errorInfo);
      }}
    >
      <YourApp />
    </ErrorBoundary>
  );
}
```

#### ErrorBoundaryReactRouter (React Router)

For React Router v7 route-level error handling:

```tsx
import { createBrowserRouter, RouterProvider } from "react-router";
import { ErrorBoundaryReactRouter } from "@ovineko/spa-guard/react-router";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorBoundaryReactRouter />,
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

#### DebugSyncErrorTrigger

A React component that bridges the vanilla debug panel's "Sync Runtime Error" button with React Error Boundaries. It listens for a CustomEvent dispatched by the debug panel, stores the error in state, and throws it during render so that a parent Error Boundary catches it.

Place this component inside your ErrorBoundary:

```tsx
import { ErrorBoundary } from "@ovineko/spa-guard/react-error-boundary";
import { DebugSyncErrorTrigger } from "@ovineko/spa-guard/react";

function App() {
  return (
    <ErrorBoundary>
      <DebugSyncErrorTrigger />
      <YourApp />
    </ErrorBoundary>
  );
}
```

This component renders nothing under normal conditions. It only throws when triggered by the debug panel's "Sync Runtime Error" button.

**Props:**

```typescript
interface ErrorBoundaryProps {
  autoRetryChunkErrors?: boolean; // Auto-reload on chunk errors (default: true)
  sendBeaconOnError?: boolean; // Send error reports to server (default: true)
  fallback?: React.ComponentType<FallbackProps>; // Custom fallback component
  fallbackRender?: (props: FallbackProps) => React.ReactElement; // Render prop alternative
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void; // Error callback
  resetKeys?: Array<unknown>; // Keys that trigger error reset when changed
  children: ReactNode;
}
```

**Custom Fallback UI:**

```tsx
import { ErrorBoundary, type FallbackProps } from "@ovineko/spa-guard/react-error-boundary";

const CustomFallback = ({ error, resetError, isChunkError, isRetrying }: FallbackProps) => (
  <div>
    <h1>{isChunkError ? "Failed to load" : "Something went wrong"}</h1>
    <p>{error.message}</p>
    {isRetrying ? <p>Retrying...</p> : <button onClick={resetError}>Try Again</button>}
  </div>
);

function App() {
  return (
    <ErrorBoundary fallback={CustomFallback}>
      <YourApp />
    </ErrorBoundary>
  );
}
```

**Default Fallback Component:**

Both error boundaries use `DefaultErrorFallback` by default, which provides:

- Loading spinner with retry attempt counter
- Error message display
- "Try again" button (for non-chunk errors)
- "Reload page" button
- Minimal inline styles (no external dependencies)

**Error flow:**

1. Chunk load error occurs (e.g., after deployment)
2. spa-guard inline script detects error
3. Attempts automatic reload with query parameters (up to `reloadDelays.length` times)
4. React error boundary catches error and shows loading spinner during retries
5. If all reloads fail, sends beacon to server and shows error UI
6. User can manually retry or reload the page

### React Hooks

spa-guard provides React hooks to access retry state in your components.

#### useSpaGuardState()

Subscribe to spa-guard state changes:

```tsx
import { useSpaGuardState } from "@ovineko/spa-guard/react";

function RetryIndicator() {
  const state = useSpaGuardState();

  if (!state.isWaiting) {
    return null;
  }

  return <div className="retry-banner">Retrying... (Attempt {state.currentAttempt})</div>;
}
```

**State properties:**

```typescript
interface SpaGuardState {
  currentAttempt: number; // Current retry attempt (0-based)
  isFallbackShown: boolean; // Whether fallback UI is displayed
  isWaiting: boolean; // Whether waiting for a retry
  lastRetryResetTime?: number; // Timestamp of last retry reset (undefined if no reset has occurred)
  lastResetRetryId?: string; // Retry ID of last reset cycle (undefined if no reset has occurred)
}
```

**Example - Global retry indicator:**

```tsx
import { useSpaGuardState } from "@ovineko/spa-guard/react";

function App() {
  const spaGuardState = useSpaGuardState();

  return (
    <>
      {spaGuardState.isWaiting && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white p-4 text-center">
          Loading updated version... (Attempt {spaGuardState.currentAttempt})
        </div>
      )}
      <YourApp />
    </>
  );
}
```

#### useSPAGuardEvents(callback)

Subscribe to all spa-guard events (chunk errors, retries, fallback UI, etc.):

```tsx
import { useSPAGuardEvents } from "@ovineko/spa-guard/react";

function EventLogger() {
  useSPAGuardEvents((event) => {
    if (event.name === "chunk-error") {
      console.log("Chunk error:", event.error, "retrying:", event.isRetrying);
    }
    if (event.name === "retry-attempt") {
      console.log(`Retry ${event.attempt} (delay: ${event.delay}ms)`);
    }
  });

  return null;
}
```

The callback ref is kept up-to-date without resubscribing, so you can safely reference component state or props inside the callback.

#### useSPAGuardChunkError()

Convenience hook that tracks the latest chunk error event:

```tsx
import { useSPAGuardChunkError } from "@ovineko/spa-guard/react";

function ChunkErrorBanner() {
  const chunkError = useSPAGuardChunkError();

  if (!chunkError) return null;

  return (
    <div className="error-banner">
      A chunk error occurred. {chunkError.isRetrying ? "Retrying..." : "Please reload the page."}
    </div>
  );
}
```

### Debug Panel

spa-guard provides a framework-agnostic `createDebugger()` function for development and testing. It creates a vanilla JS debug panel that lets you simulate error scenarios and observe how spa-guard handles them in real time. Works with any SPA framework.

```typescript
import { createDebugger } from "@ovineko/spa-guard/runtime/debug";

// Create the debug panel - returns a cleanup function
const destroy = createDebugger();

// Later: remove the panel and clean up all subscriptions
destroy();
```

**React usage:**

```tsx
import { useEffect } from "react";
import { createDebugger } from "@ovineko/spa-guard/runtime/debug";

function App() {
  useEffect(() => createDebugger(), []);

  return <YourApp />;
}
```

Since `createDebugger()` returns a cleanup function directly, the arrow shorthand implicitly returns it as the `useEffect` cleanup. No wrapper needed.

**Options:**

```typescript
function createDebugger(options?: {
  position?: "bottom-left" | "bottom-right" | "top-left" | "top-right"; // default: "bottom-right"
  defaultOpen?: boolean; // default: true
}): () => void;
```

**Features:**

- Framework-agnostic vanilla JS (no React dependency)
- Fixed-position overlay panel with toggle open/close
- Error scenario buttons: ChunkLoadError, Network Timeout, Sync Runtime Error, Async Runtime Error, Finally Error
- Button visual states (default, loading, triggered)
- Live spa-guard state display (attempt, isWaiting, isFallbackShown)
- Scrollable event history with timestamps
- Clear history button
- Single-instance deduplication (second call returns existing cleanup function with a warning)
- Errors use fire-and-forget dispatch (reach spa-guard's window event listeners instead of being caught)

### Version Checker

spa-guard can proactively detect new deployments by periodically polling for version changes. This helps notify users before chunk errors occur.

The version is automatically injected by the Vite plugin from your project's `package.json`.

#### Setup

```tsx
import { useEffect } from "react";
import { startVersionCheck } from "@ovineko/spa-guard/runtime";

function App() {
  useEffect(() => {
    startVersionCheck();
  }, []);

  useEffect(() => {
    const handleVersionChange = (event: CustomEvent) => {
      const { oldVersion, latestVersion } = event.detail;
      console.log(`New version detected: ${oldVersion} → ${latestVersion}`);
      // Show a toast, banner, etc.
    };

    window.addEventListener("spa-guard:version-change", handleVersionChange as EventListener);
    return () => {
      window.removeEventListener("spa-guard:version-change", handleVersionChange as EventListener);
    };
  }, []);

  return <YourApp />;
}
```

#### Configuration

Configure version checking via the Vite plugin options:

```typescript
spaGuardVitePlugin({
  // version is auto-detected from package.json
  checkVersion: {
    mode: "html", // "html" (default) or "json"
    interval: 60_000, // polling interval in ms (default: 60s)
    endpoint: "/api/version", // required for "json" mode
  },
});
```

**Two modes:**

- **HTML mode** (default): Re-fetches the current page and parses the version from the injected `__SPA_GUARD_OPTIONS__`. No extra server endpoint needed.
- **JSON mode**: Fetches a dedicated JSON endpoint that returns `{ "version": "1.2.3" }`. Lower bandwidth, but requires a server endpoint.

#### API

- `startVersionCheck()` - Start periodic version polling. No-op if no version is configured or already running.
- `stopVersionCheck()` - Stop version polling and clear the interval.

### Retry Control

spa-guard allows your SPA to take over error handling from the inline script by disabling the default retry behavior:

```typescript
import { disableDefaultRetry, enableDefaultRetry, isDefaultRetryEnabled } from "@ovineko/spa-guard";

// Disable the inline script's automatic page reload on chunk errors
disableDefaultRetry();

// Check current state
console.log(isDefaultRetryEnabled()); // false

// Re-enable if needed
enableDefaultRetry();
```

When default retry is disabled, chunk errors will still emit events (via `subscribe` or `useSPAGuardEvents`), but the inline script will not trigger automatic page reloads. Your SPA can then implement custom error UI and retry logic.

### Core API (Framework-agnostic)

The core module provides low-level APIs for custom integrations:

```typescript
import { events, listen, options, disableDefaultRetry } from "@ovineko/spa-guard";
import { startVersionCheck } from "@ovineko/spa-guard/runtime";

// Subscribe to spa-guard events
events.subscribe((event) => {
  console.log("SPA Guard event:", event);
});

// Emit custom event
events.emitEvent({ name: "chunk-error", error: new Error("test"), isRetrying: false });

// Initialize error listeners (automatically called by inline script)
listen();

// Get merged options
const opts = options.getOptions();
console.log("Reload delays:", opts.reloadDelays);

// Start version checking
startVersionCheck();

// Take over retry behavior
disableDefaultRetry();
```

**Event system:**

- `events.subscribe(listener)` - Subscribe to all spa-guard events
- `events.emitEvent(event)` - Emit event to all subscribers
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
  enableRetryReset?: boolean; // Auto-reset retry cycle when enough time passes (default: true)
  minTimeBetweenResets?: number; // Min time between retry resets in ms (default: 5000)

  version?: string; // App version (auto-injected by Vite plugin)

  checkVersion?: {
    mode?: "html" | "json"; // Detection mode (default: "html")
    interval?: number; // Polling interval in ms (default: 60000)
    endpoint?: string; // JSON endpoint URL (required for "json" mode)
  };

  fallback?: {
    html?: string; // Custom error UI HTML
    selector?: string; // CSS selector for injection target (default: "body")
  };

  ignoredErrors?: string[]; // Error message substrings to filter out (default: [])

  reportBeacon?: {
    endpoint?: string; // Error reporting endpoint
  };

  lazyRetry?: {
    retryDelays?: number[]; // Delays in ms for lazy import retries (default: [1000, 2000])
    callReloadOnFailure?: boolean; // Trigger page reload after all retries fail (default: true)
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
- `events.emitEvent(event)` - Emit event to subscribers
- `listen()` - Initialize error listeners
- `options.getOptions()` - Get merged options from globalThis.window
- `options.optionsWindowKey` - Window storage key constant
- `disableDefaultRetry()` - Disable inline script's automatic retry
- `enableDefaultRetry()` - Re-enable automatic retry
- `isDefaultRetryEnabled()` - Check if default retry is enabled

### Schema Exports

From `@ovineko/spa-guard/schema`:

- `beaconSchema` - TypeBox schema for validation
- `BeaconSchema` - TypeScript type

From `@ovineko/spa-guard/schema/parse`:

- `parseBeacon(data)` - Parse and validate beacon data

### Runtime Exports

From `@ovineko/spa-guard/runtime`:

- `getState()` - Get current spa-guard state (currentAttempt, isFallbackShown, isWaiting, lastRetryResetTime, lastResetRetryId)
- `subscribeToState(callback)` - Subscribe to state changes, returns unsubscribe function
- `startVersionCheck()` - Start periodic version polling
- `stopVersionCheck()` - Stop version polling
- `SpaGuardState` - TypeScript type for state object

**Example:**

```typescript
import { getState, subscribeToState } from "@ovineko/spa-guard/runtime";

// Get current state
const state = getState();
console.log("Current attempt:", state.currentAttempt);
console.log("Is fallback shown:", state.isFallbackShown);
console.log("Is waiting for retry:", state.isWaiting);
console.log("Last retry reset time:", state.lastRetryResetTime);
console.log("Last reset retry ID:", state.lastResetRetryId);

// Subscribe to state changes
const unsubscribe = subscribeToState((state) => {
  console.log("State changed:", state);
});

// Later: unsubscribe
unsubscribe();
```

### lazyWithRetry

`lazyWithRetry` is a drop-in replacement for `React.lazy` that adds automatic retry logic for dynamic imports. Instead of immediately failing on a chunk load error, it retries the import with configurable delays and only falls back to a full page reload via `attemptReload()` if all retries are exhausted.

#### Basic Usage

```tsx
import { lazyWithRetry } from "@ovineko/spa-guard/react";
import { Suspense } from "react";
import { ErrorBoundary } from "@ovineko/spa-guard/react-error-boundary";

// Uses global options from window.__SPA_GUARD_OPTIONS__.lazyRetry
const LazyHome = lazyWithRetry(() => import("./pages/Home"));

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div>Loading...</div>}>
        <LazyHome />
      </Suspense>
    </ErrorBoundary>
  );
}
```

#### Global Configuration

Configure default retry behavior via `window.__SPA_GUARD_OPTIONS__`:

```typescript
window.__SPA_GUARD_OPTIONS__ = {
  lazyRetry: {
    retryDelays: [1000, 2000], // 2 retry attempts: 1s then 2s (default)
    callReloadOnFailure: true, // Fall back to page reload after all retries (default)
  },
};
```

These global options are used by all `lazyWithRetry` calls unless overridden per-import.

#### Per-Import Override

Override global options for individual components:

```tsx
// More retries for a critical checkout flow
const LazyCheckout = lazyWithRetry(
  () => import("./pages/Checkout"),
  { retryDelays: [500, 1000, 2000, 4000] }, // 4 attempts
);

// Disable page reload for a non-critical widget
const LazyWidget = lazyWithRetry(() => import("./widgets/Optional"), {
  retryDelays: [1000], // 1 retry attempt
  callReloadOnFailure: false, // just throw to error boundary, no reload
});
```

Per-import options always take priority over global options.

#### Cancelling Retries with AbortSignal

Use an `AbortSignal` to cancel in-progress retries and prevent memory leaks (e.g., when a component unmounts before the import resolves):

```tsx
const controller = new AbortController();

const LazyPage = lazyWithRetry(() => import("./pages/Page"), { signal: controller.signal });

// Cancel retries when no longer needed
controller.abort();
```

Aborting clears any pending `setTimeout` timers immediately and rejects the import promise with an `AbortError`.

#### Integration with attemptReload

`lazyWithRetry` integrates with spa-guard's existing page reload logic:

1. Component renders inside `<Suspense>`
2. `React.lazy` calls the import function through `retryImport`
3. On import failure, `retryImport` checks if it is a chunk load error
4. If yes: retries with delays from `retryDelays` array, emitting `lazy-retry-attempt` events
5. If all retries fail: emits `lazy-retry-exhausted` event, then calls `attemptReload()` (if `callReloadOnFailure: true`) before throwing to the error boundary
6. `attemptReload()` adds `?spaGuardRetryId=...&spaGuardRetryAttempt=N` to the URL and reloads the page

This means `lazyWithRetry` provides a two-level retry strategy:

- Level 1 (new): Retry the individual module import with delays — no page disruption
- Level 2 (existing): If all module retries fail, trigger the full page reload cycle

#### Events

Subscribe to lazy retry events via the event system:

```typescript
import { events } from "@ovineko/spa-guard";

events.subscribe((event) => {
  if (event.name === "lazy-retry-attempt") {
    console.log(`Retry ${event.attempt}/${event.totalAttempts} after ${event.delay}ms`);
  }
  if (event.name === "lazy-retry-success") {
    console.log(`Succeeded on attempt ${event.attempt}`);
  }
  if (event.name === "lazy-retry-exhausted") {
    console.log(`All retries exhausted. Will reload: ${event.willReload}`);
  }
});
```

**Event payload types:**

```typescript
type LazyRetryAttempt = {
  name: "lazy-retry-attempt";
  attempt: number; // current attempt number (1-based)
  delay: number; // delay in ms before this attempt
  totalAttempts: number; // total number of retry attempts
};

type LazyRetrySuccess = {
  name: "lazy-retry-success";
  attempt: number; // 1-based retry number on which import succeeded (1 = first retry)
};

type LazyRetryExhausted = {
  name: "lazy-retry-exhausted";
  totalAttempts: number; // number of attempts made
  willReload: boolean; // whether attemptReload() will be called
};
```

#### API Reference

##### `lazyWithRetry<T>(importFn, options?)`

Creates a lazy React component with retry logic.

```typescript
import { lazyWithRetry } from "@ovineko/spa-guard/react";
import type { LazyRetryOptions } from "@ovineko/spa-guard/react";
```

**Parameters:**

- `importFn: () => Promise<{ default: T }>` - Dynamic import function
- `options?: LazyRetryOptions` - Per-import options (override global)

**Returns:** `LazyExoticComponent<T>` - Same type as `React.lazy()`

##### `LazyRetryOptions`

```typescript
interface LazyRetryOptions {
  /**
   * Array of delays in milliseconds for retry attempts.
   * Each element = one retry attempt with that delay.
   * Overrides window.__SPA_GUARD_OPTIONS__.lazyRetry.retryDelays.
   * @default [1000, 2000]
   */
  retryDelays?: number[];

  /**
   * Call attemptReload() after all retries are exhausted.
   * Overrides window.__SPA_GUARD_OPTIONS__.lazyRetry.callReloadOnFailure.
   * @default true
   */
  callReloadOnFailure?: boolean;

  /**
   * AbortSignal to cancel in-progress retries and clear pending timers.
   */
  signal?: AbortSignal;
}
```

##### Global `lazyRetry` Options

```typescript
interface Options {
  // ... existing options ...

  lazyRetry?: {
    /**
     * Array of retry delays in ms for dynamic imports.
     * @default [1000, 2000]
     */
    retryDelays?: number[];

    /**
     * Call attemptReload() after all lazy import retries fail.
     * @default true
     */
    callReloadOnFailure?: boolean;
  };
}
```

## Module Exports

spa-guard provides 11 export entry points:

| Export                   | Description                                                                                                                   | Peer Dependencies               |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `.`                      | Core functionality (events, listen, options, version checker, retry control)                                                  | None                            |
| `./schema`               | BeaconSchema type definitions                                                                                                 | `typebox@^1`                    |
| `./schema/parse`         | Beacon parsing utilities                                                                                                      | `typebox@^1`                    |
| `./runtime`              | Runtime state management and subscriptions                                                                                    | None                            |
| `./react`                | React hooks and components (useSpaGuardState, useSPAGuardEvents, useSPAGuardChunkError, lazyWithRetry, DebugSyncErrorTrigger) | `react@^19`                     |
| `./runtime/debug`        | Debug panel factory (`createDebugger`) - framework-agnostic vanilla JS                                                        | None                            |
| `./react-router`         | React Router error boundary (ErrorBoundaryReactRouter)                                                                        | `react@^19`, `react-router@^7`  |
| `./fastify`              | Fastify server plugin                                                                                                         | `fastify@^4 \|\| ^5`            |
| `./vite-plugin`          | Vite build plugin                                                                                                             | `vite@^7 \|\| ^8`               |
| `./react-error-boundary` | React error boundary component (ErrorBoundary)                                                                                | `react@^19`                     |
| `./eslint`               | ESLint plugin with `configs.recommended` preset (`no-direct-error-boundary`, `no-direct-lazy`)                                | `eslint@^9 \|\| ^10` (optional) |

**Import examples:**

```typescript
// Core
import { events, listen, disableDefaultRetry } from "@ovineko/spa-guard";

// Runtime state + version check
import { getState, subscribeToState, startVersionCheck } from "@ovineko/spa-guard/runtime";

// React hooks and components
import {
  useSpaGuardState,
  useSPAGuardEvents,
  useSPAGuardChunkError,
  DebugSyncErrorTrigger,
} from "@ovineko/spa-guard/react";

// Lazy imports with retry
import { lazyWithRetry } from "@ovineko/spa-guard/react";
import type { LazyRetryOptions } from "@ovineko/spa-guard/react";

// Debug panel (framework-agnostic)
import { createDebugger } from "@ovineko/spa-guard/runtime/debug";

// React error boundaries
import { ErrorBoundary } from "@ovineko/spa-guard/react-error-boundary";
import { ErrorBoundaryReactRouter } from "@ovineko/spa-guard/react-router";

// Schema
import type { BeaconSchema } from "@ovineko/spa-guard/schema";

// Vite plugin
import { spaGuardVitePlugin } from "@ovineko/spa-guard/vite-plugin";

// Fastify
import { fastifySPAGuard } from "@ovineko/spa-guard/fastify";

// ESLint plugin
import spaGuardEslint from "@ovineko/spa-guard/eslint";
```

## Build Sizes

- **Production:** `dist-inline/index.js` ~5.9 KB minified (Terser)
- **Trace:** `dist-inline-trace/index.js` ~7.3 KB minified (Terser)
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

## ESLint Plugin

spa-guard includes an ESLint plugin (`@ovineko/spa-guard/eslint`) that enforces usage of spa-guard wrappers instead of direct React imports. This ensures all error boundaries and lazy loading are properly integrated with spa-guard's retry logic.

### Setup

```javascript
// eslint.config.js (flat config)
import spaGuardEslint from "@ovineko/spa-guard/eslint";

export default [spaGuardEslint.configs.recommended];
```

### Rules

#### `no-direct-error-boundary`

Disallows importing `ErrorBoundary` from `react-error-boundary`. Auto-fixes to import from `@ovineko/spa-guard/react-error-boundary` instead.

```typescript
// Bad
import { ErrorBoundary } from "react-error-boundary";

// Good (auto-fixed)
import { ErrorBoundary } from "@ovineko/spa-guard/react-error-boundary";
```

#### `no-direct-lazy`

Disallows importing `lazy` from `react`. Auto-fixes to import `lazyWithRetry` from `@ovineko/spa-guard/react` instead. Handles split-import cases where other specifiers (e.g., `Suspense`) remain on the original `react` import.

```typescript
// Bad
import { lazy } from "react";

// Good (auto-fixed)
import { lazyWithRetry } from "@ovineko/spa-guard/react";

// Bad (split import)
import { lazy, Suspense } from "react";

// Good (auto-fixed)
import { Suspense } from "react";
import { lazyWithRetry } from "@ovineko/spa-guard/react";
```

## License

MIT
