---
title: React Router (@ovineko/spa-guard-react-router)
sidebar_position: 4
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# @ovineko/spa-guard-react-router

React Router v7 error boundary integration for [spa-guard](./core).

Catches route errors via `useRouteError()` and automatically retries chunk loading failures with spa-guard integration.

## Install

<Tabs>
  <TabItem value="pnpm" label="pnpm" default>
    ```bash
    pnpm add @ovineko/spa-guard-react-router @ovineko/spa-guard @ovineko/spa-guard-react react react-router
    ```
  </TabItem>
  <TabItem value="npm" label="npm">
    ```bash
    npm install @ovineko/spa-guard-react-router @ovineko/spa-guard @ovineko/spa-guard-react react react-router
    ```
  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash
    yarn add @ovineko/spa-guard-react-router @ovineko/spa-guard @ovineko/spa-guard-react react react-router
    ```
  </TabItem>
  <TabItem value="bun" label="bun">
    ```bash
    bun add @ovineko/spa-guard-react-router @ovineko/spa-guard @ovineko/spa-guard-react react react-router
    ```
  </TabItem>
  <TabItem value="deno" label="deno">
    ```bash
    deno add npm:@ovineko/spa-guard-react-router npm:@ovineko/spa-guard npm:@ovineko/spa-guard-react npm:react npm:react-router
    ```
  </TabItem>
</Tabs>

## Usage

Register `ErrorBoundaryReactRouter` as the `errorElement` (or `ErrorBoundary`) for your routes:

```tsx
import { createBrowserRouter, RouterProvider } from "react-router";
import { ErrorBoundaryReactRouter } from "@ovineko/spa-guard-react-router";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    ErrorBoundary: ErrorBoundaryReactRouter,
  },
]);

export function Root() {
  return <RouterProvider router={router} />;
}
```

### Custom fallback

```tsx
import {
  ErrorBoundaryReactRouter,
  type RouterFallbackProps,
} from "@ovineko/spa-guard-react-router";

function MyFallback({ error, isChunkError, isRetrying }: RouterFallbackProps) {
  if (isRetrying) return <div>Reloading...</div>;
  if (isChunkError) return <div>Failed to load module — retrying…</div>;
  return <div>Something went wrong: {String(error)}</div>;
}

// In your route definition:
<ErrorBoundaryReactRouter fallback={MyFallback} />;
```

## API

From `@ovineko/spa-guard-react-router`:

- `ErrorBoundaryReactRouter` — error boundary component for React Router routes
- `ErrorBoundaryReactRouterProps` — props for `ErrorBoundaryReactRouter`
  - `autoRetryChunkErrors?` — retry chunk errors automatically (default: `true`)
  - `fallback?` — custom fallback component or render function
  - `onError?` — callback invoked on any route error
  - `sendBeacon?` — send beacon on error (default: `true`)
- `RouterFallbackProps` — props passed to the fallback component
  - `error` — the route error caught by `useRouteError()`
  - `isChunkError` — whether the error is a chunk load failure
  - `isRetrying` — whether spa-guard is currently retrying
  - `spaGuardState` — current spa-guard state

## Related Packages

- [@ovineko/spa-guard](./core) — core package
- [@ovineko/spa-guard-react](./react) — React hooks and error boundary
- [@ovineko/spa-guard-vite](./vite) — Vite plugin
