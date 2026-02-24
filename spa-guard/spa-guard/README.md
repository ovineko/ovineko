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

## API

### `@ovineko/spa-guard` (common)

- `listen` — subscribe to spa-guard events
- `events` — event type constants
- `options` — runtime options helpers
- `disableDefaultRetry` / `enableDefaultRetry` / `isDefaultRetryEnabled` — control default retry behaviour
- `BeaconError` — error class for beacon failures
- `ForceRetryError` — error class to force a retry

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

Debug helpers for testing error scenarios.

## Related packages

- [@ovineko/spa-guard-react](../react/README.md) — `lazyWithRetry` and React error boundary
- [@ovineko/spa-guard-react-router](../react-router/README.md) — React Router error boundary
- [@ovineko/spa-guard-vite](../vite/README.md) — Vite plugin (injects runtime script)
- [@ovineko/spa-guard-node](../node/README.md) — Node.js cache and builder API
- [@ovineko/spa-guard-fastify](../fastify/README.md) — Fastify plugin
- [@ovineko/spa-guard-eslint](../eslint/README.md) — ESLint rules

## License

MIT
