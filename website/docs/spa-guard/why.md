---
title: Why SPA Guard?
sidebar_position: 0
---

# Why SPA Guard?

The problem SPA Guard solves is real, subtle, and nearly universal for any application that ships to production. This page documents the error cases, why standard tools don't cover all of them, and how SPA Guard fills the gaps.

## What is a chunk load error?

Modern single-page applications use **code splitting**: the JavaScript bundle is divided into smaller files (chunks) that load on demand. When a user navigates to a route, the browser fetches that route's chunk — something like `Home.3f8a2c.js`. The hash in the filename is derived from the chunk's content, so it changes every time the file changes.

When you deploy a new version of your app, the old chunk filenames disappear and new ones appear. Any user who had the app open before the deployment still has the old HTML in their browser — with script tags pointing to the old chunk URLs. The moment they navigate to a new route, the browser tries to load a chunk that no longer exists. The server returns a 404.

The browser throws:

```text
TypeError: Failed to fetch dynamically imported module
```

React's error boundary catches it. The user sees a white screen or an error message. They have no idea why.

## The five error cases

Not all chunk-related errors look the same. There are five distinct cases, and each requires a different mechanism to catch.

### Case 1: Chunk load error after deployment (the main case)

```text
[User has old tab open]
→ Deploy v2 (old chunks removed from CDN)
→ User navigates to lazy route
→ import('./PageX.abc123.js') → 404
→ TypeError: Failed to fetch dynamically imported module
→ React Router ErrorBoundary may catch (if it's a lazy route)
→ OR surfaces as unhandledrejection
```

**Solution**: page reload (gets fresh `index.html` → new chunk references).

### Case 2: Error inside a lazily-loaded module

```text
[Chunk loaded successfully]
→ Error thrown during module initialization
→ React ErrorBoundary catches it
→ OR surfaces as unhandledrejection
```

**Solution**: React ErrorBoundary + fallback UI.

### Case 3: Main chunk failure before Sentry initializes

```text
[index.html received]
→ Browser requests main.abc123.js
→ Load fails (network, CDN, ad-blocker)
→ Sentry NOT initialized (it initializes inside the main chunk)
→ window.addEventListener('error') NOT registered
→ Error is completely lost — no one knows it happened
```

This is the critical case. Every other approach assumes the application's JavaScript has already started running. If the main chunk fails, **nothing registered inside that chunk will ever run** — including your error tracker, your event listeners, your Sentry initialization.

**Solution**: an inline script embedded directly in `<head>` before all other scripts. This script runs before any chunk is requested, so it's always active regardless of what fails later.

### Case 4: CSS preload failure

```text
[Vite loads a CSS chunk]
→ Resource blocked (network / CDN / ad-blocker)
→ Two variants:
   a) DevTools block → browser silently ignores (error event does NOT fire)
   b) Real 404/network error → 'error' capture phase
      OR Vite throws: "Unable to preload CSS" → unhandledrejection
```

**Solution**: `window.addEventListener('error', handler, true)` with `capture: true` for HTML element errors; `unhandledrejection` for the Vite-specific preload error.

### Case 5: CSP violation

```text
[Browser blocks script by Content-Security-Policy]
→ Chunk doesn't load
→ 'securitypolicyviolation' event fires
→ Standard error/unhandledrejection do NOT fire
```

**Solution**: `window.addEventListener('securitypolicyviolation', handler)`.

## Browser event map

Catching all five cases requires four different event listeners. Each covers a different failure mode:

| Event                                                   | What it catches                                                         | Notes                                                                        |
| ------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `window.addEventListener('error', h, true)`             | Sync JS errors + resource load failures (`<script>`, `<link>`, `<img>`) | `capture: true` is required; bubble phase misses resource errors             |
| `window.addEventListener('unhandledrejection', h)`      | Unhandled rejected promises, including dynamic `import()`               | Does not catch sync errors or resource failures                              |
| `window.addEventListener('securitypolicyviolation', h)` | CSP violations                                                          | The only way to detect CSP-blocked chunks                                    |
| `window.addEventListener('vite:preloadError', h)`       | Vite's internal preload errors                                          | Only dispatched if the main chunk already loaded and Vite runtime is running |

Both `error` and `unhandledrejection` are needed simultaneously — neither covers the other's cases.

**Note on DevTools request blocking**: when you block a request in DevTools, the `error` event does not fire. This is specific to DevTools — in real production (404, network failure) it fires normally. To test SPA Guard's behavior, use offline mode or actually remove a file from the server.

## Why standard tools don't cover all cases

### React Router ErrorBoundary

React Router v6+ attaches an `errorElement` to routes. If a lazy route's chunk fails to load, the ErrorBoundary catches it. But if the chunk is a utility module imported inside a component (not directly as a route), the error:

1. Surfaces as `unhandledrejection`
2. React Router ErrorBoundary does not see it
3. A separate `window.addEventListener('unhandledrejection')` is required

### Sentry Loader Script

A small inline script in `<head>` that buffers `error` and `unhandledrejection` events until the Sentry SDK loads. It solves Case 3 for monitoring purposes.

Limitations: depends on Sentry's external CDN, provides monitoring only (no recovery/reload), no React-specific features, behavior cannot be customized.

### `vite:preloadError`

Vite's built-in event for preload failures. It's dispatched inside Vite's JS runtime — meaning it only works after the main chunk has loaded and executed. If the main chunk failed to load, this event never fires.

### Keeping old chunks on CDN

Never delete old chunk versions; keep them indefinitely.

Pros: fully eliminates Case 1. Cons: most CDNs and hosting platforms (Vercel, Cloudflare Pages) delete assets on deploy. Requires a custom deployment pipeline.

## Coverage comparison

| Solution                   | Case 1     | Case 2     | Case 3     | Case 4     | Case 5  | Recovery         |
| -------------------------- | ---------- | ---------- | ---------- | ---------- | ------- | ---------------- |
| React Router ErrorBoundary | yes        | yes        | no         | no         | no      | fallback UI      |
| Sentry Loader Script       | monitoring | monitoring | monitoring | monitoring | no      | no reload        |
| `vite:preloadError`        | yes        | no         | no         | yes        | no      | manual reload    |
| vite-plugin-pwa            | yes        | no         | no         | yes        | no      | from cache       |
| Polling `version.json`     | proactive  | no         | no         | no         | no      | proactive reload |
| Keep old chunks on CDN     | yes        | no         | no         | no         | no      | not needed       |
| **SPA Guard**              | **yes**    | **yes**    | **yes**    | **yes**    | **yes** | **yes**          |

## Why a simple `location.reload()` isn't enough

The naive approach is to catch chunk errors and reload:

```ts
window.addEventListener("unhandledrejection", (e) => {
  if (e.reason?.message?.includes("Failed to fetch dynamically imported module")) {
    location.reload();
  }
});
```

This works in most situations. Here's why "most" isn't good enough:

**The infrastructure context matters.** Standard practice is to serve `index.html` with `Cache-Control: no-cache` and JS/CSS chunks with `Cache-Control: max-age=31536000, immutable`. With this setup, a simple reload fetches a fresh `index.html` with new chunk references. This works in 99% of cases.

The remaining 1% is the problem: if the network is fully unavailable, or the browser serves a cached `no-cache` response from disk cache (which some browsers do under certain conditions), the reload fetches the same stale HTML with the same broken chunk URLs — and you've created an infinite reload loop.

Beyond the cache problem:

- **No loop protection**: without tracking how many times a reload has happened, the error handler fires again after the reload, triggering another reload, indefinitely
- **No user feedback**: the page flashes and reloads with no explanation
- **No visibility**: if users are looping through reload cycles and giving up, there's no signal in your monitoring
- **No fallback**: after a reasonable number of retries, users should see a static message, not loop forever

## What SPA Guard does

SPA Guard addresses all of this with a coordinated system:

**Inline script before all chunks** (injected by the Vite plugin): registers all four event listeners (`error` capture, `unhandledrejection`, `securitypolicyviolation`, `vite:preloadError`) before any application code runs. This is the only way to handle Case 3.

**Two-level retry strategy**:

1. `lazyWithRetry` (from `@ovineko/spa-guard-react`) retries the individual `import()` call several times with short delays before escalating.
2. If module-level retry fails, the retry orchestrator schedules a full-page reload with cache-busting query parameters (`?spaGuardRetryAttempt=1&spaGuardRetryId=...&spaGuardCacheBust=...`) — forcing the browser to bypass its HTML cache entirely.

**Explicit retry state machine** (idle → scheduled → fallback): prevents concurrent triggers, deduplicates reload scheduling, and transitions to a static fallback UI when retries are exhausted — so reload loops are impossible by design.

**Loading UI during retry**: while a reload is pending, a loading UI is injected into the DOM so users know something is happening.

**Beacon error reporting**: when SPA Guard handles an error, it sends a structured payload to your server via `navigator.sendBeacon`. This works even if the error occurred before Sentry initialized, and it works during page unload.

## Next steps

- [Overview](./overview) — the full package family and architecture
- [Integration Guide](./integration-guide) — add SPA Guard to your app in 15 minutes
- [Why Server-Side HTML Cache?](./server-html-cache) — the bootstrapping problem and how the node/fastify packages solve it
