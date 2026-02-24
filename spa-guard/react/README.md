# @ovineko/spa-guard-react

[![npm](https://img.shields.io/npm/v/@ovineko/spa-guard-react)](https://www.npmjs.com/package/@ovineko/spa-guard-react)
[![license](https://img.shields.io/npm/l/@ovineko/spa-guard-react)](./LICENSE)

React hooks, components, and error boundaries for [spa-guard](../spa-guard/README.md).

## Install

```sh
npm install @ovineko/spa-guard-react @ovineko/spa-guard react
```

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

- [@ovineko/spa-guard](../spa-guard/README.md) — core package
- [@ovineko/spa-guard-react-router](../react-router/README.md) — React Router integration
- [@ovineko/spa-guard-vite](../vite/README.md) — Vite plugin

## License

MIT
