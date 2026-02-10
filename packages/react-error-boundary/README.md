# @ovineko/react-error-boundary

Error boundary utilities for React with optional Sentry integration and auto-reload.

## Install

```bash
pnpm add @ovineko/react-error-boundary
```

Peer dependencies: `react@^19`, `react-router@^7`, `react-error-boundary@^6`.
Optional: `@sentry/react@^10` for error tracking.

## Features

- ✅ **Auto-reload on error** - Automatically reloads the page after an error in production
- ✅ **Sentry integration** - Optional automatic error reporting to Sentry
- ✅ **Development debugger** - Shows detailed error information in dev mode with ERROR_DEBUGGER
- ✅ **React Router compatible** - Works seamlessly with React Router v7 error boundaries
- ✅ **Type-safe** - Full TypeScript support with proper error typing
- ✅ **Zero-config** - Works out of the box with sensible defaults

## Quick Start

```tsx
import { ErrorBoundaryReloadPage } from "@ovineko/react-error-boundary";
import { createBrowserRouter, RouterProvider } from "react-router";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorBoundaryReloadPage />,
  },
]);

function Root() {
  return <RouterProvider router={router} />;
}
```

## Usage

### Basic Error Boundary with Auto-Reload

The simplest usage is to add `ErrorBoundaryReloadPage` as the `errorElement` in your React Router routes:

```tsx
import { ErrorBoundaryReloadPage } from "@ovineko/react-error-boundary";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorBoundaryReloadPage />,
    children: [
      {
        path: "users/:id",
        element: <UserPage />,
        // Inherits error boundary from parent
      },
    ],
  },
]);
```

**Behavior:**

- In **production**: Logs error to console, sends to Sentry (if configured), and reloads the page after 100ms
- In **development** (with ERROR_DEBUGGER): Displays detailed error information without reloading

### With Sentry Integration

Install Sentry as an optional peer dependency:

```bash
pnpm add @sentry/react
```

Initialize Sentry in your app entry point:

```tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: import.meta.env.MODE,
  // ... other Sentry options
});
```

The `ErrorBoundaryReloadPage` component will automatically detect `@sentry/react` and send errors to Sentry:

```tsx
import { ErrorBoundaryReloadPage } from "@ovineko/react-error-boundary";

// No additional configuration needed - just use the component
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorBoundaryReloadPage />,
  },
]);
```

**How it works:**

- If `@sentry/react` is installed, errors are automatically captured using `captureException`
- If `@sentry/react` is not installed, the component works normally without Sentry integration
- Lazy loading: Sentry is dynamically imported only when needed

### Development Mode with ERROR_DEBUGGER

In development, you can enable detailed error debugging by setting the global `ERROR_DEBUGGER` variable:

```tsx
// In your dev environment setup
declare global {
  interface Window {
    ERROR_DEBUGGER?: {
      buildErrorDebuggerHTML: (errors: string[], index: number) => string;
    };
  }
}

// Implement your custom error debugger
window.ERROR_DEBUGGER = {
  buildErrorDebuggerHTML: (errors, index) => {
    return `Error at index ${index}:\n${errors.join("\n")}`;
  },
};
```

**Behavior with ERROR_DEBUGGER:**

- Displays formatted error information on screen
- Does NOT auto-reload the page (for debugging)
- Shows full error details including stack traces

### Using captureException Directly

You can also use the `captureException` utility directly in your code:

```tsx
import { captureException } from "@ovineko/react-error-boundary";

async function handleAction() {
  try {
    await riskyOperation();
  } catch (error) {
    // Manually send error to Sentry (if available)
    await captureException(error);

    // Handle error...
  }
}
```

## API Reference

### `ErrorBoundaryReloadPage`

React component for handling errors in React Router error boundaries.

**Type:**

```tsx
const ErrorBoundaryReloadPage: React.FC;
```

**Behavior:**

1. Captures the error using React Router's `useRouteError()` hook
2. Wraps the error in a custom `ErrorBoundary` error class with enhanced metadata
3. Sends error to Sentry via `captureException()` (if `@sentry/react` is installed)
4. Logs error to console with `console.error()`
5. In **production** (no ERROR_DEBUGGER): Reloads page after 100ms
6. In **development** (with ERROR_DEBUGGER): Displays formatted error details

**Usage:**

```tsx
import { ErrorBoundaryReloadPage } from "@ovineko/react-error-boundary";

<Route path="/" element={<App />} errorElement={<ErrorBoundaryReloadPage />} />;
```

---

### `captureException`

Async utility function for sending errors to Sentry.

**Type:**

```tsx
const captureException: (...args: Parameters<typeof captureException>) => Promise<string>;
```

**Parameters:**

- `...args`: Same parameters as `@sentry/react` `captureException` function

**Returns:**

- `Promise<string>`: Sentry event ID if successful, empty string otherwise

**Behavior:**

- Dynamically imports `@sentry/react` on first use (lazy loading)
- Returns empty string if `@sentry/react` is not installed
- Caches import promise to avoid multiple dynamic imports
- Safe to call even without Sentry installed (no-op)

**Usage:**

```tsx
import { captureException } from "@ovineko/react-error-boundary";

try {
  await someOperation();
} catch (error) {
  const eventId = await captureException(error);
  console.log("Sent to Sentry with ID:", eventId);
}
```

## TypeScript

This package is written in TypeScript and includes full type definitions. All exports are fully typed.

**Type imports:**

```tsx
import type { captureException } from "@ovineko/react-error-boundary";
```

## License

MIT
