---
title: React (@ovineko/spa-guard-react)
sidebar_position: 3
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# @ovineko/spa-guard-react

React hooks, components, and error boundaries for [spa-guard](./core).

## Install

<Tabs>
  <TabItem value="pnpm" label="pnpm" default>
    ```bash
    pnpm add @ovineko/spa-guard-react @ovineko/spa-guard react
    ```
  </TabItem>
  <TabItem value="npm" label="npm">
    ```bash
    npm install @ovineko/spa-guard-react @ovineko/spa-guard react
    ```
  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash
    yarn add @ovineko/spa-guard-react @ovineko/spa-guard react
    ```
  </TabItem>
  <TabItem value="bun" label="bun">
    ```bash
    bun add @ovineko/spa-guard-react @ovineko/spa-guard react
    ```
  </TabItem>
  <TabItem value="deno" label="deno">
    ```bash
    deno add npm:@ovineko/spa-guard-react npm:@ovineko/spa-guard npm:react
    ```
  </TabItem>
</Tabs>

## Usage

### lazyWithRetry

Wrap `React.lazy` to automatically retry chunk load failures with configurable delays.

```tsx
import { Suspense } from "react";
import { lazyWithRetry } from "@ovineko/spa-guard-react";

const LazyHome = lazyWithRetry(() => import("./pages/Home"));

// Override retry delays for a specific route
const LazyCheckout = lazyWithRetry(() => import("./pages/Checkout"), {
  retryDelays: [500, 1000, 2000, 4000],
});

export function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyHome />
    </Suspense>
  );
}
```

### ErrorBoundary

Catches errors in child components and integrates with spa-guard retry state.

```tsx
import { ErrorBoundary } from "@ovineko/spa-guard-react/error-boundary";

export function App() {
  return (
    <ErrorBoundary>
      <MyApp />
    </ErrorBoundary>
  );
}
```

## API

From `@ovineko/spa-guard-react`:

- `lazyWithRetry(importFn, options?)` — lazy component with automatic retry
- `useSpaGuardState()` — reactive hook for current spa-guard state
- `useSPAGuardChunkError()` — hook to detect chunk load errors
- `useSPAGuardEvents()` — hook to subscribe to spa-guard events
- `DefaultErrorFallback` — default fallback UI component
- `Spinner` — loading spinner component
- `DebugSyncErrorTrigger` — trigger sync errors for testing
- `ForceRetryError` — error class to force a retry
- `LazyRetryOptions` — options type for `lazyWithRetry`
- `SpaGuardState` — spa-guard state type

From `@ovineko/spa-guard-react/error-boundary`:

- `ErrorBoundary` — error boundary with spa-guard integration
- `ErrorBoundaryProps` — props for `ErrorBoundary`
- `FallbackProps` — props passed to fallback component

## Related Packages

- [@ovineko/spa-guard](./core) — core package
- [@ovineko/spa-guard-react-router](./react-router) — React Router integration
- [@ovineko/spa-guard-vite](./vite) — Vite plugin
