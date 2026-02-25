# @ovineko/spa-guard

[![npm](https://img.shields.io/npm/v/@ovineko/spa-guard)](https://www.npmjs.com/package/@ovineko/spa-guard)
[![license](https://img.shields.io/npm/l/@ovineko/spa-guard)](./LICENSE)

Core runtime for spa-guard — chunk load error handling, version checking, spinner, i18n, and event schema for SPAs.

## Install

```sh
npm install @ovineko/spa-guard
```

## Usage

Call `recommendedSetup` once when your app boots. It dismisses the loading spinner, starts version checking, and returns a cleanup function.

```ts
import { recommendedSetup } from "@ovineko/spa-guard/runtime";

const cleanup = recommendedSetup();
// optionally call cleanup() to stop background checks
```

Disable version checking:

```ts
const cleanup = recommendedSetup({ versionCheck: false });
```

## Retry behavior and event flow

spa-guard uses a single retry orchestrator (`retryOrchestrator.ts`) as the sole owner of retry lifecycle. All reload scheduling, deduplication, and fallback transitions run through `triggerRetry()`.

### Retry state machine

The orchestrator maintains an explicit phase:

- `idle` — no retry in progress
- `scheduled` — a reload has been scheduled (timer running); concurrent triggers are deduplicated
- `fallback` — retries exhausted, fallback UI is shown; further triggers are ignored

### Retry progression

When a recoverable error occurs (chunk load error, unhandled rejection, `vite:preloadError`, or static asset 404):

1. Event listener classifies the event and calls `triggerRetry({ source, error })`.
2. Orchestrator checks phase — if already `scheduled` or `fallback`, returns immediately without scheduling another reload.
3. On first trigger: reads `RETRY_ATTEMPT_PARAM` from URL to restore attempt count after a reload.
4. If attempts remain: increments attempt, sets a timer for `reloadDelays[currentAttempt]`, encodes `retryId` and attempt count into the reload URL, then navigates.
5. If attempts are exhausted: transitions to `fallback`, calls `setFallbackMode()`, sends a beacon, and renders fallback UI.

### URL params

The orchestrator serializes state into URL params for cross-reload continuity:

- `RETRY_ATTEMPT_PARAM` — current attempt count (strict non-negative integer; malformed values are ignored)
- `RETRY_ID_PARAM` — unique ID for this retry session
- `CACHE_BUST_PARAM` — timestamp for cache busting (set when `cacheBust: true` is passed, e.g. for static asset errors)

### Retry reset

If enough time has passed since the last reload (configurable via `minTimeBetweenResets`, default 5000 ms), the orchestrator resets the attempt counter and starts a fresh retry cycle instead of continuing to fallback. This prevents stale URL params from triggering fallback on a clean page load.

### Healthy boot

After a successful app boot following a retry reload, call `markRetryHealthyBoot()`. This clears retry URL params, cancels any pending timer, and resets orchestrator state.

### Static asset burst coalescing

Multiple 404'd asset errors within a short window (default 500 ms) are coalesced into a single `triggerRetry({ cacheBust: true, source: "static-asset-error" })`. The orchestrator's deduplication ensures only one reload is scheduled.

### Retry ownership rule

Only `retryOrchestrator.ts` may schedule reloads, advance retry state, or transition to fallback. Listeners, renderers, and other modules must not schedule their own retry timers or set fallback state directly.

## API

### `@ovineko/spa-guard` (common)

- `listen` — subscribe to spa-guard events
- `events` — event type constants
- `options` — runtime options helpers
- `disableDefaultRetry` / `enableDefaultRetry` / `isDefaultRetryEnabled` — control default retry behaviour
- `isInFallbackMode` — returns `true` when fallback UI is active (retries exhausted)
- `resetFallbackMode` — clears the fallback flag; use in tests or programmatic recovery flows
- `BeaconError` — error class for beacon failures
- `ForceRetryError` — error class to force a retry

**Retry orchestrator (single owner of retry lifecycle):**

- `triggerRetry(input?)` — trigger a retry from any source; returns `TriggerResult`:
  - `{ status: "accepted" }` — reload scheduled
  - `{ status: "deduped", reason: string }` — ignored because another retry is already scheduled or an internal error occurred
  - `{ status: "fallback" }` — already in fallback mode; no retry scheduled
  - `{ status: "retry-disabled" }` — retry is disabled via `disableDefaultRetry()`
- `markRetryHealthyBoot()` — call after a successful boot following a retry reload; clears URL params, cancels timers, resets orchestrator state and fallback flag
- `getRetrySnapshot()` — returns current orchestrator state: `{ phase, attempt, retryId, lastSource, lastTriggerTime }`
- `resetRetryOrchestratorForTests()` — resets all orchestrator state including fallback flag; use in test teardown

### `@ovineko/spa-guard/runtime`

- `recommendedSetup(options?)` — enable recommended runtime features; returns cleanup function
- `RecommendedSetupOptions` — `{ versionCheck?: boolean }`
- `startVersionCheck` / `stopVersionCheck` — manual version check control
- `getState` / `subscribeToState` — runtime state access
- `SpaGuardState` — state type
- `showSpinner` / `dismissSpinner` / `getSpinnerHtml` — spinner helpers
- `setTranslations` — override i18n strings
- `ForceRetryError`

### `@ovineko/spa-guard/schema`

Schemas for spa-guard configuration.

### `@ovineko/spa-guard/i18n`

Built-in translation strings.

### `@ovineko/spa-guard/runtime/debug`

Debug helpers for testing error scenarios. Use `createDebugger()` to mount an in-page panel with buttons for each scenario.

Available error scenarios:

- `dispatchChunkLoadError` — unhandled ChunkLoadError rejection
- `dispatchNetworkTimeout` — unhandled network timeout after a delay
- `dispatchSyncRuntimeError` — sync error thrown during React render
- `dispatchAsyncRuntimeError` — uncaught error via setTimeout
- `dispatchFinallyError` — unhandled rejection from Promise.finally
- `dispatchForceRetryError` — ForceRetryError to exercise the force-retry path
- `dispatchUnhandledRejection` — generic unhandled promise rejection
- `dispatchRetryExhausted` — renders fallback UI directly (bypasses orchestrator; orchestrator phase remains `idle`)
- `dispatchStaticAsset404` — appends a hashed `<script>` that 404s, exercising the Resource Timing API-based static asset detection path

## Related packages

- [@ovineko/spa-guard-react](../react/README.md) — `lazyWithRetry` and React error boundary
- [@ovineko/spa-guard-react-router](../react-router/README.md) — React Router error boundary
- [@ovineko/spa-guard-vite](../vite/README.md) — Vite plugin (injects runtime script)
- [@ovineko/spa-guard-node](../node/README.md) — Node.js cache and builder API
- [@ovineko/spa-guard-fastify](../fastify/README.md) — Fastify plugin
- [@ovineko/spa-guard-eslint](../eslint/README.md) — ESLint rules

## License

MIT
