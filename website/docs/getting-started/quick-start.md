---
title: Quick Start
sidebar_position: 2
---

# Quick Start

## SPA Guard

Add resilient chunk loading and error recovery to your Vite + React SPA in three steps.

### 1. Add the Vite Plugin

```ts title="vite.config.ts"
import { spaGuardVitePlugin } from "@ovineko/spa-guard-vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    spaGuardVitePlugin({
      // Configuration options
    }),
  ],
});
```

### 2. Use `lazyWithRetry` Instead of `React.lazy`

```tsx
import { lazyWithRetry } from "@ovineko/spa-guard-react";

const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
```

### 3. Call `recommendedSetup` on Boot

```ts
import { recommendedSetup } from "@ovineko/spa-guard/runtime";

const cleanup = recommendedSetup();
```

That's it. Your app now automatically retries failed chunk loads with cache busting and shows a fallback UI if all retries fail.

See the [SPA Guard Overview](../spa-guard/overview) for the full documentation.

---

## Type-Safe React Router

Add runtime-validated URL parameters to React Router v7.

### 1. Define a Route with Schema

```tsx
import { createRouteWithParams } from "@ovineko/react-router";
import * as v from "valibot";

const userRoute = createRouteWithParams("/users/:id", {
  params: v.object({ id: v.pipe(v.string(), v.uuid()) }),
  searchParams: v.object({
    tab: v.optional(v.string()),
  }),
});
```

### 2. Use Type-Safe Hooks in Components

```tsx
function UserPage() {
  const { id } = userRoute.useParams();
  const [{ tab }] = userRoute.useSearchParams();

  return (
    <div>
      User {id}, tab: {tab}
    </div>
  );
}
```

Invalid params are caught at runtime and redirect to a configurable error page.

See the [@ovineko/react-router docs](../packages/react-router) for more details.

---

## Clean Package JSON

Zero-config tool to strip `devDependencies` from `package.json` before publishing.

```json title="package.json"
{
  "scripts": {
    "prepack": "clean-pkg-json clean",
    "postpack": "clean-pkg-json restore"
  }
}
```

See the [@ovineko/clean-pkg-json docs](../packages/clean-pkg-json) for more details.
