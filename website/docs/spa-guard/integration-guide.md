---
title: Integration Guide (15 minutes)
sidebar_position: 1.8
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# Integration Guide: Add SPA Guard to an Existing App

This guide walks through adding SPA Guard to an existing React + Vite application. Steps 1–5 are the core setup (~10 minutes). Steps 6–7 are optional server-side features.

## Prerequisites

- React 19
- Vite 7 or 8
- An existing SPA with code-split routes (lazy imports)

---

## Step 1: Install packages

<Tabs>
  <TabItem value="pnpm" label="pnpm" default>
    ```bash
    pnpm add @ovineko/spa-guard @ovineko/spa-guard-react
    pnpm add -D @ovineko/spa-guard-vite
    ```
  </TabItem>
  <TabItem value="npm" label="npm">
    ```bash
    npm install @ovineko/spa-guard @ovineko/spa-guard-react
    npm install --save-dev @ovineko/spa-guard-vite
    ```
  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash
    yarn add @ovineko/spa-guard @ovineko/spa-guard-react
    yarn add -D @ovineko/spa-guard-vite
    ```
  </TabItem>
  <TabItem value="bun" label="bun">
    ```bash
    bun add @ovineko/spa-guard @ovineko/spa-guard-react
    bun add -d @ovineko/spa-guard-vite
    ```
  </TabItem>
  <TabItem value="deno" label="deno">
    ```bash
    deno add npm:@ovineko/spa-guard npm:@ovineko/spa-guard-react npm:@ovineko/spa-guard-vite
    ```
  </TabItem>
</Tabs>

---

## Step 2: Add the Vite plugin

Add `spaGuardVitePlugin` to your `vite.config.ts`. It injects the runtime config and fallback HTML template into your built `index.html`.

```ts title="vite.config.ts"
import { spaGuardVitePlugin } from "@ovineko/spa-guard-vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    spaGuardVitePlugin({
      beacon: {
        url: "/api/beacon",
      },
    }),
  ],
});
```

The plugin has no required options — `spaGuardVitePlugin()` with no arguments uses safe defaults. See the [Vite plugin docs](./vite) for the full options reference.

---

## Step 3: Replace `React.lazy` with `lazyWithRetry`

Find every `React.lazy` call in your app and replace it with `lazyWithRetry`. This is a drop-in replacement — the API is identical.

```tsx
// Before
import { lazy } from "react";
const HomePage = lazy(() => import("./pages/HomePage"));

// After
import { lazyWithRetry } from "@ovineko/spa-guard-react";
const HomePage = lazyWithRetry(() => import("./pages/HomePage"));
```

`lazyWithRetry` retries the `import()` call several times with short delays before escalating to a full-page reload. Your `Suspense` boundaries work exactly as before.

---

## Step 4: Add an ErrorBoundary

Wrap your app (or individual route trees) with `ErrorBoundary` from `@ovineko/spa-guard-react`. When a chunk fails to load after all retries, the error boundary catches it and hands off to the retry orchestrator.

```tsx title="src/main.tsx"
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "@ovineko/spa-guard-react/error-boundary";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
```

`ErrorBoundary` renders `DefaultErrorFallback` when an error is caught. You can provide a custom fallback via the `fallback` prop — see the [React package docs](./react) for details.

---

## Step 5: Call `recommendedSetup`

Call `recommendedSetup()` **after** `render()` returns. Internally it calls `dismissSpinner()` immediately — the SPA Guard loading overlay should be dismissed after React has taken over the DOM, not before. Calling it too early also starts the healthy boot grace timer before lazy chunks have had a chance to load.

```tsx title="src/main.tsx"
import { recommendedSetup } from "@ovineko/spa-guard/runtime";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "@ovineko/spa-guard-react/error-boundary";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Call after render — dismisses the SPA Guard loading spinner
// and starts the healthy boot grace timer once the app is running
const cleanup = recommendedSetup();
```

`recommendedSetup` is idempotent — calling it multiple times is safe. The returned `cleanup` function tears down version checking and the healthy boot timer; call it if you need to clean up (e.g. during testing).

At this point, SPA Guard is fully operational. Build your app and verify the setup in the next section before proceeding to the optional server-side steps.

---

## Verify the core setup

Build and serve your app:

```bash
pnpm build && pnpm preview
```

Open browser DevTools and check:

1. **Network tab** — inspect the HTML response body. You should see `window.__SPA_GUARD_OPTIONS__` injected before the closing `</head>` tag.
2. **Console** — no errors on page load.
3. **Simulate a chunk error** — in the Network tab, block one of the `*.js` chunk requests (right-click → Block request URL). Navigate to that route. SPA Guard should detect the failure and schedule a retry reload. You'll see `?spaGuardRetryAttempt=1` appear in the URL during the retry cycle.

---

## Step 6 (Optional): Server-side HTML cache

If you're running a Fastify server, add `@ovineko/spa-guard-node` and `@ovineko/spa-guard-fastify` to serve your SPA's `index.html` with ETag/304 support, content-encoding negotiation, and i18n patching.

See [Why Server-Side HTML Cache?](./server-html-cache) for the motivation.

### Install

<Tabs>
  <TabItem value="pnpm" label="pnpm" default>
    ```bash
    pnpm add @ovineko/spa-guard-node @ovineko/spa-guard-fastify fastify fastify-plugin parse5
    ```
  </TabItem>
  <TabItem value="npm" label="npm">
    ```bash
    npm install @ovineko/spa-guard-node @ovineko/spa-guard-fastify fastify fastify-plugin parse5
    ```
  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash
    yarn add @ovineko/spa-guard-node @ovineko/spa-guard-fastify fastify fastify-plugin parse5
    ```
  </TabItem>
  <TabItem value="bun" label="bun">
    ```bash
    bun add @ovineko/spa-guard-node @ovineko/spa-guard-fastify fastify fastify-plugin parse5
    ```
  </TabItem>
  <TabItem value="deno" label="deno">
    ```bash
    deno add npm:@ovineko/spa-guard-node npm:@ovineko/spa-guard-fastify npm:fastify npm:fastify-plugin npm:parse5
    ```
  </TabItem>
</Tabs>

### Configure the server

```ts title="src/server.ts"
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Fastify from "fastify";
import { fastifySPAGuard, spaGuardFastifyHandler } from "@ovineko/spa-guard-fastify";
import { createHtmlCache } from "@ovineko/spa-guard-node";

const app = Fastify({ logger: true });

// Register the beacon endpoint
app.addContentTypeParser("text/plain", { parseAs: "string" }, (_req, body, done) => {
  done(null, body);
});

app.register(fastifySPAGuard, {
  path: "/api/beacon",
  onBeacon: async (beacon, request) => {
    request.log.info({ beacon }, "SPA Guard beacon");
  },
});

// Serve the SPA for all non-asset routes
const htmlCache = await createHtmlCache({
  html: readFileSync(join(import.meta.dirname, "../dist/index.html"), "utf-8"),
});

app.get("/*", async (request, reply) => {
  return spaGuardFastifyHandler(request, reply, { cache: htmlCache });
});

await app.listen({ port: 3000, host: "0.0.0.0" });
```

See the [Node package docs](./node) and [Fastify package docs](./fastify) for the full API reference, including multi-language support and the `createHTMLCacheStore` API.

---

## Step 7 (Optional): ESLint rules

Add the ESLint plugin to prevent accidental use of `React.lazy` or `react-error-boundary` directly, and have them auto-fixed to the SPA Guard equivalents.

<Tabs>
  <TabItem value="pnpm" label="pnpm" default>
    ```bash
    pnpm add -D @ovineko/spa-guard-eslint eslint
    ```
  </TabItem>
  <TabItem value="npm" label="npm">
    ```bash
    npm install --save-dev @ovineko/spa-guard-eslint eslint
    ```
  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash
    yarn add -D @ovineko/spa-guard-eslint eslint
    ```
  </TabItem>
  <TabItem value="bun" label="bun">
    ```bash
    bun add -d @ovineko/spa-guard-eslint eslint
    ```
  </TabItem>
  <TabItem value="deno" label="deno">
    ```bash
    deno add npm:@ovineko/spa-guard-eslint npm:eslint
    ```
  </TabItem>
</Tabs>

```js title="eslint.config.js"
import spaGuard from "@ovineko/spa-guard-eslint";

export default [
  spaGuard.configs.recommended,
  // ... your other configs
];
```

The recommended config enables `no-direct-lazy` and `no-direct-error-boundary` at error level, both with autofixes. See the [ESLint package docs](./eslint) for rule details.

---

## Next steps

- [Why SPA Guard?](./why) — understand the problem in depth
- [Core package docs](./core) — retry orchestrator, event system, beacon schema
- [React package docs](./react) — `lazyWithRetry`, `ErrorBoundary`, `useRetryState`
- [Vite plugin docs](./vite) — full plugin options reference
