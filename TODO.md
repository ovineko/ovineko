# spa-guard Refactoring Plan

## Context

This refactoring addresses several architectural and usability issues in the spa-guard monorepo:

1. **Circular dependency between vite and node packages**: Currently, vite compiles inline scripts → node copies them via prepublishOnly → vite uses node builder. This creates maintenance complexity and unclear ownership.

2. **Inconsistent option structure**: `options.spinner` is at the top level but logically belongs with other HTML options like `fallback` and `loading`.

3. **Insufficient logging**: Users report difficulty understanding whether `lazyWithRetry` is working correctly. Current logs are minimal (3 events with basic info).

4. **Suboptimal dependency management**: All packages use `dependencies` for internal spa-guard packages, potentially causing version conflicts and bundle size issues.

5. **External mode broken in dev**: Vite plugin's external mode only creates files during production build (writeBundle hook), causing 404s in dev server.

These issues impact maintainability, developer experience, and production deployments.

---

## Implementation Plan

### Task Sequencing

**Phase 1 - Parallel (Low Risk)** - Week 1-2:

- Task #3: Enhanced lazyWithRetry logging (2-3 days)
- Task #2: Move spinner to html.spinner (3-4 days)

**Phase 2 - Sequential (High Risk)** - Week 3:

- Task #1: Eliminate circular dependency (5-7 days)

**Phase 3 - Sequential (Medium Risk)** - Week 4:

- Task #5: Fix external mode in dev (2-3 days)
- Task #4: Convert to peerDependencies (3-4 days)

---

## Task #1: Eliminate Circular Dependency

### Problem

Current flow creates circular dependency:

```
vite (compiles inline scripts) → node (copies via prepublishOnly) → vite (uses builder)
```

Both packages duplicate HTML tag generation logic.

### Solution

Move inline script compilation to node package. Vite will import compiled scripts from node:

```
node (compiles inline scripts, publishes them in dist-inline)
  ↓
vite (reads from @ovineko/spa-guard-node/dist-inline)
```

### Changes

#### 1. Move inline script sources from vite to node

**Move files**:

- `spa-guard/vite/src/inline/` → `spa-guard/node/src/inline/`
- `spa-guard/vite/src/inline-trace/` → `spa-guard/node/src/inline-trace/`
- `spa-guard/vite/tsup.inline.config.ts` → `spa-guard/node/tsup.inline.config.ts`
- `spa-guard/vite/tsup.inline.trace.config.ts` → `spa-guard/node/tsup.inline.trace.config.ts`

#### 2. Update node package.json

**File**: [spa-guard/node/package.json](../../../spa-guard/node/package.json)

```diff
{
  "scripts": {
+   "build:inline": "tsup --config tsup.inline.config.ts && tsup --config tsup.inline.trace.config.ts",
    "build": "tsup --config tsup.config.ts",
-   "copy:bundles": "rm -rf ./dist-inline ./dist-inline-trace && cp -r ../vite/dist-inline ./dist-inline && cp -r ../vite/dist-inline-trace ./dist-inline-trace",
-   "prepublishOnly": "pnpm build && pnpm copy:bundles"
+   "prepublishOnly": "pnpm build:inline && pnpm build"
  },
  "files": [
    "dist",
+   "dist-inline",
+   "dist-inline-trace"
  ]
}
```

#### 3. Update vite package.json to depend on node

**File**: [spa-guard/vite/package.json](../../../spa-guard/vite/package.json)

```diff
{
  "dependencies": {
    "@ovineko/spa-guard": "workspace:*",
+   "@ovineko/spa-guard-node": "workspace:*",
    "html-minifier-terser": "7.2.0"
  },
  "scripts": {
-   "build:inline": "tsup --config tsup.inline.config.ts && tsup --config tsup.inline.trace.config.ts",
-   "build": "pnpm build:inline && tsup --config tsup.config.ts",
+   "build": "tsup --config tsup.config.ts",
-   "prepublishOnly": "pnpm build"
+   "prepublishOnly": "pnpm build"
  }
}
```

Remove inline build scripts and configs from vite (moved to node).

#### 4. Update vite plugin to read from node package

**File**: [spa-guard/vite/src/index.ts](../../../spa-guard/vite/src/index.ts)

Replace inline script reading:

```typescript
// Remove local getInlineScript function
// OLD: reads from local dist-inline/

// NEW: import from node package
const getInlineScript = async (options: VitePluginOptions): Promise<string> => {
  const buildDir = options.trace ? "dist-inline-trace" : "dist-inline";

  // Read from @ovineko/spa-guard-node package
  const scriptUrl = import.meta.resolve(`@ovineko/spa-guard-node/${buildDir}/index.js`);
  const scriptPath = fileURLToPath(scriptUrl);
  const script = await readFile(scriptPath, "utf8").then((r) => r.trim());

  // Process options (same as before)
  const processedOptions = { ...options };
  if (processedOptions.html?.fallback?.content) {
    processedOptions.html = {
      ...processedOptions.html,
      fallback: {
        ...processedOptions.html.fallback,
        content: await minify(processedOptions.html.fallback.content, minifyOptions),
      },
    };
  }

  const escapedJson = JSON.stringify(processedOptions).replaceAll("<", "\\u003c");
  const version = JSON.stringify(options.version).replaceAll("<", "\\u003c");

  return `window.__SPA_GUARD_VERSION__=${version};window.${optionsWindowKey}=${escapedJson};${script}`;
};
```

Add imports:

```typescript
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
```

#### 5. Remove builder re-exports from node/src/index.ts

**File**: [spa-guard/node/src/index.ts:1-8](../../../spa-guard/node/src/index.ts#L1-L8)

Delete these lines (builder is already exported via `./builder` in package.json):

```typescript
export type {
  BuildExternalScriptOptions,
  BuildExternalScriptResult,
  BuildScriptOptions,
  BuildScriptResult,
  HtmlTagDescriptor,
} from "./builder";
export { buildExternalScript, buildSpaGuardScript } from "./builder";
```

### Testing

```bash
# Build node first (vite depends on it now)
pnpm --filter @ovineko/spa-guard-node build:inline
pnpm --filter @ovineko/spa-guard-node build
pnpm --filter @ovineko/spa-guard-vite build
pnpm --filter @ovineko/spa-guard-node test

# Verify vite can read node inline scripts
node -e "import('@ovineko/spa-guard-node/builder').then(m => m.buildSpaGuardScript({version:'test'}).then(console.log))"

# Verify inline scripts exist in node package
ls -la spa-guard/node/dist-inline/
ls -la spa-guard/node/dist-inline-trace/

# Full monorepo test
pnpm --recursive test
```

### Acceptance Criteria

- ✅ Inline script sources moved from vite to node (`src/inline/`, `src/inline-trace/`)
- ✅ tsup configs moved from vite to node
- ✅ node compiles inline scripts (`build:inline` script)
- ✅ node publishes `dist-inline` and `dist-inline-trace`
- ✅ vite package has `@ovineko/spa-guard-node` in dependencies
- ✅ vite reads from `node_modules/@ovineko/spa-guard-node/dist-inline`
- ✅ `copy:bundles` script removed from node
- ✅ Inline build scripts removed from vite
- ✅ Builder re-exports removed from node/src/index.ts
- ✅ All tests pass
- ✅ Test publication succeeds
- ✅ No circular dependency

---

## Task #2: Move options.spinner → options.html.spinner

### Problem

`options.spinner` is at top level but logically belongs with other HTML options. This is inconsistent with `options.html.fallback` and `options.html.loading`.

### Solution

Restructure as `options.html.spinner` for logical grouping.

### Changes

#### Files to update (7 total):

1. [spa-guard/spa-guard/src/common/options.ts](../../../spa-guard/spa-guard/src/common/options.ts) - Interface definition
2. [spa-guard/spa-guard/src/common/spinner.ts](../../../spa-guard/spa-guard/src/common/spinner.ts) - Runtime usage
3. [spa-guard/spa-guard/src/common/reload.ts](../../../spa-guard/spa-guard/src/common/reload.ts) - Reload logic
4. [spa-guard/vite/src/index.ts](../../../spa-guard/vite/src/index.ts) - Plugin options
5. [spa-guard/node/src/builder.ts](../../../spa-guard/node/src/builder.ts) - Builder options
6. [spa-guard/react/src/react/Spinner.tsx](../../../spa-guard/react/src/react/Spinner.tsx) - React component
7. [spa-guard/react/src/DefaultErrorFallback.tsx](../../../spa-guard/react/src/DefaultErrorFallback.tsx) - Fallback UI

#### Key changes:

**options.ts**:

```typescript
export interface Options {
  html?: {
    fallback?: { ... };
    loading?: { ... };
    spinner?: {  // MOVED HERE
      background?: string;
      content?: string;
      disabled?: boolean;
    };
  };
  // Remove top-level spinner
}

const defaultOptions: Options = {
  html: {
    fallback: { ... },
    loading: { ... },
    spinner: { background: "#fff", disabled: false }  // MOVED HERE
  }
};
```

**All other files**: Replace `opts.spinner?.` with `opts.html?.spinner?.`

### Migration Strategy

**Breaking change** - will be released in next major version. No backwards compatibility layer needed since this is alpha release.

### Testing

```bash
pnpm --filter @ovineko/spa-guard test
pnpm --filter @ovineko/spa-guard-react test
pnpm --filter @ovineko/spa-guard-vite test
pnpm --filter @ovineko/spa-guard-node test
```

### Acceptance Criteria

- ✅ Options interface updated with `html.spinner`
- ✅ All 7 files updated
- ✅ TypeScript compiles without errors
- ✅ All existing tests pass
- ✅ New tests added for `options.html.spinner`

---

## Task #3: Enhanced lazyWithRetry Logging

### Problem

Current logging is minimal:

- 3 events: `lazy-retry-attempt`, `lazy-retry-success`, `lazy-retry-exhausted`
- No initial event, no error details, no timing info
- Users can't tell if retry is working

### Solution

Add comprehensive logging with error details and timing.

### Changes

#### 1. Expand event types

**File**: [spa-guard/spa-guard/src/common/events/types.ts](../../../spa-guard/spa-guard/src/common/events/types.ts)

```typescript
// NEW EVENT: emitted when import starts
export interface SPAGuardEventLazyRetryStart {
  name: "lazy-retry-start";
  module?: string; // Extracted from error stack if available
  totalAttempts: number;
}

// UPDATED: add error info
export interface SPAGuardEventLazyRetryAttempt {
  attempt: number;
  delay: number;
  error?: unknown; // NEW: previous attempt's error
  name: "lazy-retry-attempt";
  totalAttempts: number;
}

// UPDATED: add timing
export interface SPAGuardEventLazyRetrySuccess {
  attempt: number;
  module?: string; // NEW
  name: "lazy-retry-success";
  totalTime?: number; // NEW: milliseconds spent retrying
}

// UPDATED: add final error
export interface SPAGuardEventLazyRetryExhausted {
  error: unknown; // NEW: final error after all attempts
  name: "lazy-retry-exhausted";
  totalAttempts: number;
  willReload: boolean;
}
```

#### 2. Update retryImport to emit enhanced events

**File**: [spa-guard/spa-guard/src/common/retryImport.ts](../../../spa-guard/spa-guard/src/common/retryImport.ts)

```typescript
export const retryImport = async <T>(...) => {
  const startTime = Date.now();

  // NEW: emit start event
  emitEvent({
    name: "lazy-retry-start",
    totalAttempts: delays.length + 1,
  });

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    try {
      const result = await importFn();
      if (attempt > 0) {
        emitEvent({
          attempt,
          name: "lazy-retry-success",
          totalTime: Date.now() - startTime,  // NEW
        });
      }
      return result;
    } catch (error) {
      // ...
      emitEvent({
        attempt: attempt + 1,
        delay: currentDelay,
        error: lastError,  // NEW: include error
        name: "lazy-retry-attempt",
        totalAttempts,
      });
    }
  }

  emitEvent({
    error: lastError,  // NEW: include final error
    name: "lazy-retry-exhausted",
    totalAttempts,
    willReload,
  });
};
```

#### 3. Update logger formatting

**File**: [spa-guard/spa-guard/src/common/logger.ts](../../../spa-guard/spa-guard/src/common/logger.ts)

```typescript
const formatEvent = (event: SPAGuardEvent): string => {
  switch (event.name) {
    case "lazy-retry-start": {
      return `${PREFIX} lazy-retry-start: starting import, will attempt ${event.totalAttempts} times`;
    }

    case "lazy-retry-attempt": {
      const errorMsg = event.error instanceof Error ? event.error.message : String(event.error);
      return `${PREFIX} lazy-retry-attempt: attempt ${event.attempt}/${event.totalAttempts}, delay ${event.delay}ms | error: ${errorMsg}`;
    }

    case "lazy-retry-success": {
      return `${PREFIX} lazy-retry-success: succeeded on attempt ${event.attempt} (took ${event.totalTime}ms)`;
    }

    case "lazy-retry-exhausted": {
      const errorMsg = event.error instanceof Error ? event.error.message : String(event.error);
      return `${PREFIX} lazy-retry-exhausted: ${event.totalAttempts} attempts failed, willReload=${event.willReload} | final error: ${errorMsg}`;
    }
  }
};

// Update logEvent to output errors
logEvent(event: SPAGuardEvent): void {
  const level = eventLogConfig[event.name];
  const message = formatEvent(event);

  // Log error object for better debugging
  if (event.name === "lazy-retry-attempt" && event.error) {
    console[level](message, event.error);
  } else if (event.name === "lazy-retry-exhausted") {
    console[level](message, event.error);
  } else {
    console[level](message);
  }
}
```

### Expected Output

```
[spa-guard] lazy-retry-start: starting import, will attempt 3 times
[spa-guard] lazy-retry-attempt: attempt 1/3, delay 1000ms | error: Failed to fetch dynamically imported module
[spa-guard] lazy-retry-attempt: attempt 2/3, delay 2000ms | error: Failed to fetch dynamically imported module
[spa-guard] lazy-retry-success: succeeded on attempt 2 (took 3100ms)
```

### Testing

```bash
pnpm --filter @ovineko/spa-guard test

# Manual test - should see enhanced logs
pnpm --filter @ovineko/spa-guard-react dev
```

### Acceptance Criteria

- ✅ Added `lazy-retry-start` event
- ✅ All events include error/timing info where applicable
- ✅ Logger formats new fields clearly
- ✅ All existing tests pass
- ✅ New tests cover enhanced events
- ✅ Console logs are more informative

---

## Task #4: Convert to peerDependencies

### Problem

All packages use `dependencies` for `@ovineko/spa-guard*`, potentially causing:

- Duplicate installations
- Version mismatches
- Increased bundle size

### Solution

Use `peerDependencies` for all `@ovineko/spa-guard*` packages (except vite in node - needed for reading inline scripts).

### Changes

Update 5 package.json files:

#### 1. spa-guard-node

```diff
{
  "dependencies": {
    "@fastify/accept-negotiator": "2.0.1",
-   "@ovineko/spa-guard": "workspace:*",
    "@ovineko/spa-guard-vite": "workspace:*",  // KEEP - implementation detail
    "html-minifier-terser": "7.2.0"
  },
  "devDependencies": {
+   "@ovineko/spa-guard": "workspace:*",
    // ...
  },
  "peerDependencies": {
+   "@ovineko/spa-guard": "workspace:*",
    "parse5": "^8"
  }
}
```

#### 2. spa-guard-vite

```diff
{
  "dependencies": {
-   "@ovineko/spa-guard": "workspace:*",
    "html-minifier-terser": "7.2.0"
  },
  "devDependencies": {
+   "@ovineko/spa-guard": "workspace:*",
    // ...
  },
  "peerDependencies": {
+   "@ovineko/spa-guard": "workspace:*",
    "vite": "^8 || ^7"
  }
}
```

#### 3. spa-guard-react

```diff
{
- "dependencies": {
-   "@ovineko/spa-guard": "workspace:*"
- },
  "devDependencies": {
+   "@ovineko/spa-guard": "workspace:*",
    // ...
  },
  "peerDependencies": {
+   "@ovineko/spa-guard": "workspace:*",
    "react": "^19"
  }
}
```

#### 4. spa-guard-react-router

```diff
{
- "dependencies": {
-   "@ovineko/spa-guard": "workspace:*",
-   "@ovineko/spa-guard-react": "workspace:*"
- },
  "devDependencies": {
+   "@ovineko/spa-guard": "workspace:*",
+   "@ovineko/spa-guard-react": "workspace:*",
    // ...
  },
  "peerDependencies": {
+   "@ovineko/spa-guard": "workspace:*",
+   "@ovineko/spa-guard-react": "workspace:*",
    "react": "^19",
    "react-router": "^7"
  }
}
```

#### 5. spa-guard-fastify

```diff
{
- "dependencies": {
-   "@ovineko/spa-guard": "workspace:*"
- },
  "devDependencies": {
+   "@ovineko/spa-guard": "workspace:*",
    "@ovineko/spa-guard-node": "workspace:*",  // already here
    // ...
  },
  "peerDependencies": {
+   "@ovineko/spa-guard": "workspace:*",
    "@ovineko/spa-guard-node": "workspace:*",
    "fastify": "^5 || ^4",
    "fastify-plugin": "^5 || ^4"
  }
}
```

### Impact on Users

**Before**:

```bash
npm install @ovineko/spa-guard-react
# Auto-installs: @ovineko/spa-guard
```

**After**:

```bash
npm install @ovineko/spa-guard @ovineko/spa-guard-react
# Both must be explicit
```

**Note**: npm 7+, pnpm, and yarn 2+ auto-install peer dependencies.

### Update README Installation

All package READMEs need updated install commands:

```markdown
## Installation

npm install @ovineko/spa-guard @ovineko/spa-guard-react

**Note**: `@ovineko/spa-guard` is a peer dependency and must be installed explicitly.
```

### Testing

```bash
# Monorepo tests
pnpm install
pnpm --recursive test
pnpm --recursive build

# Test publication (local registry)
npx verdaccio
pnpm publish --filter @ovineko/spa-guard --registry http://localhost:4873
pnpm publish --filter @ovineko/spa-guard-react --registry http://localhost:4873

# Test installation
mkdir test-install && cd test-install
npm install @ovineko/spa-guard @ovineko/spa-guard-react --registry http://localhost:4873

# Verify single version
npm ls @ovineko/spa-guard  # Should show only one version
```

### Acceptance Criteria

- ✅ All `@ovineko/spa-guard*` moved to peerDependencies (except vite in node)
- ✅ All packages compile
- ✅ All tests pass
- ✅ Local registry publication succeeds
- ✅ Clean install works with peer deps
- ✅ Only one version of spa-guard installed
- ✅ All README files updated

---

## Task #5: Fix External Mode in Dev

### Problem

External mode in Vite plugin creates script file only in `writeBundle` hook (production build). During development (`vite dev`), the hook doesn't run, causing 404s for the external script.

### Solution

Use `configureServer` hook to serve the external script during development.

### Changes

**File**: [spa-guard/vite/src/index.ts](../../../spa-guard/vite/src/index.ts)

Add `configureServer` hook for external mode:

```typescript
export const spaGuardVitePlugin = (options: VitePluginOptions = {}): Plugin => {
  const mode = options.mode ?? "inline";
  let cachedExternalContent: string | undefined;
  let cachedExternalHash: string | undefined;
  let cachedExternalFileName: string | undefined;

  return {
    name,

    // NEW: Serve external script in dev mode
    configureServer(server) {
      if (mode !== "external") return;

      server.middlewares.use((req, res, next) => {
        // Match /spa-guard.{hash}.js
        if (req.url && /^\/spa-guard\.[a-f0-9]+\.js$/.test(req.url)) {
          if (cachedExternalContent && req.url === `/${cachedExternalFileName}`) {
            res.setHeader("Content-Type", "application/javascript");
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            res.end(cachedExternalContent);
            return;
          }
        }
        next();
      });
    },

    transformIndexHtml: {
      handler: async (html) => {
        // ... existing logic ...

        if (mode === "external") {
          const content = await getInlineScript(finalOptions);
          const hash = createHash(content);
          const fileName = `spa-guard.${hash}.js`;

          cachedExternalContent = content;
          cachedExternalHash = hash;
          cachedExternalFileName = fileName;

          // Generate script tag
          tags.push({
            attrs: {
              src: `/${fileName}`,
              type: "module",
            },
            injectTo: "head",
            tag: "script",
          });
        }

        return { html, tags };
      },
    },

    async writeBundle() {
      // Production: write to disk (existing logic)
      if (mode === "external" && resolvedOutDir && cachedExternalContent && cachedExternalHash) {
        const fileName = `spa-guard.${cachedExternalHash}.js`;
        await fsPromise.writeFile(
          path.join(resolvedOutDir, fileName),
          cachedExternalContent,
          "utf8",
        );
      }
    },
  };
};
```

### Testing

```bash
# Dev mode test
cd examples/vite-react
# Update vite.config.ts to use mode: 'external'
pnpm dev
# Open browser, verify no 404 for spa-guard script

# Build mode test
pnpm build
pnpm preview
# Verify script file exists in dist/ and loads correctly

# Run tests
pnpm --filter @ovineko/spa-guard-vite test
```

### Acceptance Criteria

- ✅ External script served in dev mode
- ✅ No 404 errors in dev server
- ✅ Script has proper cache headers
- ✅ Production build still works
- ✅ Tests added for dev server middleware
- ✅ Existing inline mode unaffected

---

## Task #6: Handle 404 Static Asset Errors During Deployment

### Problem

During Kubernetes rolling deployments, when two app versions run simultaneously, there's a critical race condition:

1. Browser loads HTML from version 1 (e.g., with `main.Bs8thFbo.js`)
2. During loading, Kubernetes switches traffic to version 2
3. Browser requests `main.Bs8thFbo.js` but version 2 has `main.Cx9tyGh1.js` instead
4. CDN/server returns 404 for the old asset hash
5. Application shows infinite spinner with no recovery attempt

**Current behavior**:

- Error events are captured but not identified as deployment-related 404s
- No retry mechanism for failed static assets
- Beacon logs don't include HTTP status code (404)
- Page is stuck - no reload, no recovery

**Example error beacons from production**:

```json
// Script tag 404
{
  "eventName": "error",
  "serialized": {
    "eventType": "error",
    "target": {
      "tagName": "SCRIPT",
      "src": "https://my.example.com/assets/main.Bs8thFbo.js"
    },
    "type": "Event"
  }
}

// Link tag 404 (preload CSS)
{
  "eventName": "error",
  "serialized": {
    "eventType": "error",
    "target": {
      "tagName": "LINK",
      "href": "https://my.example.com/cache.LbE9QV8b.js"
    },
    "type": "Event"
  }
}
```

### Root Cause

The library doesn't distinguish between:

- Network failures (transient, should retry)
- 404 errors on static assets (version mismatch, should reload page)
- API 404s (different handling)

Additionally, error events on `<script>` and `<link>` tags don't expose HTTP status codes - we only know loading failed, not why.

### Solution

Implement comprehensive 404 static asset detection and recovery:

1. **Detect static asset 404s** by analyzing error event targets
2. **Capture HTTP status codes** where possible (via fetch interception for some cases)
3. **Add retry mechanism** for static assets before full page reload
4. **Enhance beacon logging** to clearly indicate 404 vs other errors
5. **Implement smart reload** when version mismatch is detected

### Changes

#### 1. Create static asset error detection

**New file**: `spa-guard/spa-guard/src/common/isStaticAssetError.ts`

```typescript
/**
 * Detects if an error event is from a static asset (script/link) failure
 */
export const isStaticAssetError = (event: Event | ErrorEvent): boolean => {
  if (!(event.target instanceof HTMLElement)) {
    return false;
  }

  const target = event.target;
  const tagName = target.tagName?.toLowerCase();

  // Check if it's a script or link tag
  if (tagName !== "script" && tagName !== "link") {
    return false;
  }

  // Get the resource URL
  const url =
    tagName === "script" ? (target as HTMLScriptElement).src : (target as HTMLLinkElement).href;

  if (!url) {
    return false;
  }

  // Check if URL looks like a versioned asset (has hash in filename)
  // Patterns: main.Bs8thFbo.js, chunk-ABCD1234.js, cache.LbE9QV8b.js
  const hashedAssetPattern = /[.-][a-zA-Z0-9]{8,}\.(js|css|mjs)$/i;

  return hashedAssetPattern.test(url);
};

/**
 * Checks if error is likely a 404 based on context
 * Since error events don't expose HTTP status, we use heuristics
 */
export const isLikely404 = (event: Event | ErrorEvent): boolean => {
  // If it's a static asset error during page load, likely 404
  if (!isStaticAssetError(event)) {
    return false;
  }

  // During initial page load (within first 30s), static asset errors
  // are usually 404s from version mismatches
  const timeSinceLoad = Date.now() - performance.timing.navigationStart;
  const isDuringInitialLoad = timeSinceLoad < 30000;

  return isDuringInitialLoad;
};
```

**Tests**: `spa-guard/spa-guard/src/common/isStaticAssetError.test.ts`

```typescript
describe("isStaticAssetError", () => {
  it("detects script tag with hashed filename", () => {
    const script = document.createElement("script");
    script.src = "https://example.com/assets/main.Bs8thFbo.js";
    const event = new Event("error");
    Object.defineProperty(event, "target", { value: script });

    expect(isStaticAssetError(event)).toBe(true);
  });

  it("detects link tag with hashed filename", () => {
    const link = document.createElement("link");
    link.href = "https://example.com/cache.LbE9QV8b.css";
    const event = new Event("error");
    Object.defineProperty(event, "target", { value: link });

    expect(isStaticAssetError(event)).toBe(true);
  });

  it("ignores API requests", () => {
    const script = document.createElement("script");
    script.src = "https://api.example.com/data";
    const event = new Event("error");
    Object.defineProperty(event, "target", { value: script });

    expect(isStaticAssetError(event)).toBe(false);
  });

  it("ignores non-hashed assets", () => {
    const script = document.createElement("script");
    script.src = "https://example.com/vendor.js";
    const event = new Event("error");
    Object.defineProperty(event, "target", { value: script });

    expect(isStaticAssetError(event)).toBe(false);
  });
});
```

#### 2. Enhance error event capture with 404 detection

**File**: [spa-guard/spa-guard/src/common/listen/internal.ts](../../../spa-guard/spa-guard/src/common/listen/internal.ts)

Update the `error` event listener (lines 32-62):

```typescript
import { isStaticAssetError, isLikely404 } from "../isStaticAssetError";

window.addEventListener(
  "error",
  (event) => {
    // ... existing ignore checks ...

    const isStaticAsset = isStaticAssetError(event);
    const isLikely404Error = isLikely404(event);

    // If it's a static asset 404, this is likely a deployment version mismatch
    if (isStaticAsset && isLikely404Error) {
      emitEvent({
        errorType: "static-asset-404",
        name: "static-asset-load-failed",
        url: getResourceUrl(event.target),
      });

      // Send beacon with enhanced context
      sendBeacon({
        errorMessage: `Static asset 404: ${getResourceUrl(event.target)}`,
        eventName: "static-asset-404",
        serialized: serializeError(event),
        errorContext: "deployment-version-mismatch",
      });

      // Attempt reload after short delay (allow multiple assets to fail first)
      attemptStaticAssetRecovery();
      return;
    }

    // ... rest of existing error handling ...
  },
  true,
);

const getResourceUrl = (target: EventTarget | null): string => {
  if (!(target instanceof HTMLElement)) return "";
  const tagName = target.tagName?.toLowerCase();
  if (tagName === "script") return (target as HTMLScriptElement).src;
  if (tagName === "link") return (target as HTMLLinkElement).href;
  return "";
};
```

#### 3. Implement static asset recovery mechanism

**New file**: `spa-guard/spa-guard/src/common/staticAssetRecovery.ts`

```typescript
import { attemptReload } from "./reload";

let failedAssets: Set<string> = new Set();
let recoveryTimeout: number | undefined;

/**
 * Attempts to recover from static asset loading failures
 *
 * Strategy:
 * 1. Collect failed assets for 500ms (multiple might fail at once)
 * 2. If any critical assets failed (scripts), reload page
 * 3. Add version bust parameter to force cache invalidation
 */
export const attemptStaticAssetRecovery = (url?: string) => {
  if (url) {
    failedAssets.add(url);
  }

  // Clear existing timeout
  if (recoveryTimeout) {
    clearTimeout(recoveryTimeout);
  }

  // Wait 500ms to collect all failures, then decide
  recoveryTimeout = window.setTimeout(() => {
    const failedCount = failedAssets.size;

    if (failedCount > 0) {
      console.warn(
        `[spa-guard] ${failedCount} static asset(s) failed to load (likely deployment version mismatch). Reloading page...`,
        Array.from(failedAssets),
      );

      // Clear the set
      failedAssets.clear();

      // Force reload with cache bust
      // This ensures we get the new HTML with correct asset references
      attemptReload({
        reason: "static-asset-404",
        cacheBust: true,
      });
    }
  }, 500);
};

/**
 * Reset recovery state (useful for testing)
 */
export const resetStaticAssetRecovery = () => {
  failedAssets.clear();
  if (recoveryTimeout) {
    clearTimeout(recoveryTimeout);
    recoveryTimeout = undefined;
  }
};
```

#### 4. Update reload mechanism to support cache busting

**File**: [spa-guard/spa-guard/src/common/reload.ts](../../../spa-guard/spa-guard/src/common/reload.ts)

Add cache busting support:

```typescript
interface ReloadOptions {
  reason?: string;
  cacheBust?: boolean;
}

export const attemptReload = (options?: ReloadOptions) => {
  // ... existing retry logic ...

  let reloadUrl = window.location.href;

  // Add cache bust if requested (for 404 recovery)
  if (options?.cacheBust) {
    const url = new URL(reloadUrl);
    url.searchParams.set("spaGuardCacheBust", Date.now().toString());
    reloadUrl = url.toString();
  }

  // ... existing reload logic ...
  window.location.href = reloadUrl;
};
```

#### 5. Enhance beacon schema for 404 errors

**File**: [spa-guard/spa-guard/src/schema/index.ts](../../../spa-guard/spa-guard/src/schema/index.ts)

```typescript
export interface BeaconSchema {
  appName?: string;
  errorContext?: string; // NEW: "deployment-version-mismatch", "network", etc.
  errorMessage?: string;
  errorType?: string; // NEW: "static-asset-404", "chunk-error", etc.
  eventMessage?: string;
  eventName?: string;
  httpStatus?: number; // NEW: HTTP status code when available
  retryAttempt?: number;
  retryId?: string;
  serialized?: string;
  url?: string; // NEW: failed resource URL
}
```

#### 6. Add new event type for static asset failures

**File**: [spa-guard/spa-guard/src/common/events/types.ts](../../../spa-guard/spa-guard/src/common/events/types.ts)

```typescript
export interface SPAGuardEventStaticAssetLoadFailed {
  errorType: "static-asset-404" | "static-asset-network" | "static-asset-unknown";
  name: "static-asset-load-failed";
  url: string;
}

export type SPAGuardEvent =
  | SPAGuardEventChunkError
  | SPAGuardEventRetryAttempt
  | SPAGuardEventRetryExhausted
  | SPAGuardEventLazyRetryAttempt
  | SPAGuardEventLazyRetryExhausted
  | SPAGuardEventLazyRetrySuccess
  | SPAGuardEventRetryReset
  | SPAGuardEventFallbackUiShown
  | SPAGuardEventStaticAssetLoadFailed; // NEW
```

#### 7. Update logger to handle static asset errors

**File**: [spa-guard/spa-guard/src/common/logger.ts](../../../spa-guard/spa-guard/src/common/logger.ts)

```typescript
const formatEvent = (event: SPAGuardEvent): string => {
  switch (event.name) {
    // ... existing cases ...

    case "static-asset-load-failed": {
      return `${PREFIX} static-asset-load-failed: ${event.errorType} - ${event.url} (likely deployment version mismatch)`;
    }
  }
};

// Configure log level
const eventLogConfig: Record<SPAGuardEvent["name"], "log" | "warn" | "error"> = {
  // ... existing config ...
  "static-asset-load-failed": "error",
};
```

#### 8. Add configuration options

**File**: [spa-guard/spa-guard/src/common/options.ts](../../../spa-guard/spa-guard/src/common/options.ts)

```typescript
export interface Options {
  // ... existing options ...

  staticAssets?: {
    /**
     * Enable automatic recovery from 404 static asset errors
     * @default true
     */
    autoRecover?: boolean;

    /**
     * Delay before reloading after static asset failures (ms)
     * @default 500
     */
    recoveryDelay?: number;

    /**
     * Patterns to identify static assets (in addition to default hash detection)
     */
    patterns?: string[];
  };
}

const defaultOptions: Options = {
  // ... existing defaults ...
  staticAssets: {
    autoRecover: true,
    recoveryDelay: 500,
  },
};
```

### Expected Behavior After Implementation

**Before** (current):

```
[Network] GET https://my.example.com/assets/main.Bs8thFbo.js - 404
[Console] (nothing)
[UI] Infinite spinner, page stuck
```

**After** (with fix):

```
[Network] GET https://my.example.com/assets/main.Bs8thFbo.js - 404
[Console] [spa-guard] static-asset-load-failed: static-asset-404 - https://my.example.com/assets/main.Bs8thFbo.js (likely deployment version mismatch)
[Console] [spa-guard] 1 static asset(s) failed to load (likely deployment version mismatch). Reloading page... ["https://my.example.com/assets/main.Bs8thFbo.js"]
[Beacon] { eventName: "static-asset-404", errorContext: "deployment-version-mismatch", url: "..." }
[Action] Page reloads with cache bust → gets new HTML → loads correct assets → success
```

### Testing

```bash
# Unit tests
pnpm --filter @ovineko/spa-guard test

# Integration test - simulate deployment 404
pnpm --filter @ovineko/spa-guard-react dev

# In browser console:
const script = document.createElement("script");
script.src = "https://example.com/assets/fake.Abc123Def.js";
script.onerror = () => console.log("Script failed");
document.head.appendChild(script);
# Should trigger recovery after 500ms

# Production simulation
# 1. Build version 1
pnpm build
# 2. Deploy to server
# 3. Start serving
# 4. Build version 2 (different hashes)
pnpm build
# 5. Replace server files while page is loading
# 6. Verify automatic recovery
```

### Edge Cases to Handle

1. **Multiple 404s at once**: Collect for 500ms before reload (implemented)
2. **404 during navigation vs initial load**: Only auto-reload on initial load
3. **Non-hashed assets**: Don't treat as deployment issue
4. **CDN delays**: 500ms collection window helps
5. **User navigates away**: Clear recovery timeout on beforeunload
6. **Retry exhaustion**: Fall back to fallback UI if reload also fails

### Acceptance Criteria

- ✅ Static asset 404s detected via `isStaticAssetError`
- ✅ Recovery mechanism triggers after 500ms collection window
- ✅ Page reloads with cache bust parameter
- ✅ Beacon includes `errorContext: "deployment-version-mismatch"`
- ✅ Beacon includes failed asset URL
- ✅ Console logs clearly indicate 404 vs other errors
- ✅ Configuration option to disable auto-recovery
- ✅ Tests cover script and link tag failures
- ✅ Tests cover multiple simultaneous failures
- ✅ Works in both dev and production
- ✅ No infinite reload loops (retry limits still apply)

### Migration Notes

This is a **non-breaking addition**. Existing behavior for chunk errors remains unchanged. New 404 recovery is opt-out via `staticAssets.autoRecover: false`.

### Future Enhancements (Out of Scope)

1. **Smarter CDN strategies**: Keep old assets available for N minutes after deploy
2. **Service Worker cache**: Pre-cache assets to survive version switches
3. **Version negotiation**: Send app version in requests, server redirects to correct assets
4. **Partial reload**: Only reload failed modules instead of full page (requires module federation)

---

## Verification

After completing all tasks:

```bash
# Full monorepo checks
pnpm install
pnpm --recursive lint
pnpm --recursive typecheck
pnpm --recursive test
pnpm --recursive build

# Test in example app
cd examples/vite-react
pnpm dev  # Verify dev works
pnpm build && pnpm preview  # Verify build works

# Check bundle sizes
pnpm --filter @ovineko/spa-guard-react build
ls -lh spa-guard/react/dist/
```

### Success Metrics

1. ✅ No circular dependencies in dependency graph
2. ✅ All tests pass (unit + integration)
3. ✅ TypeScript compiles with no errors
4. ✅ Linter passes
5. ✅ Example apps work in dev and production
6. ✅ External mode works in both dev and build
7. ✅ Enhanced logs visible in console
8. ✅ Only one copy of spa-guard installed
9. ✅ Documentation updated

---

## Rollback Plan

Each task can be rolled back independently via git:

```bash
# Rollback specific task
git revert <commit-hash>

# Rollback entire branch
git reset --hard origin/main
```

Tasks are ordered by risk to minimize impact of rollbacks.

---

## Critical Files

### Task #1 (Circular Dependency)

- [spa-guard/vite/src/inline/](../../../spa-guard/vite/src/inline/) - Move to node
- [spa-guard/vite/src/inline-trace/](../../../spa-guard/vite/src/inline-trace/) - Move to node
- [spa-guard/vite/tsup.inline.config.ts](../../../spa-guard/vite/tsup.inline.config.ts) - Move to node
- [spa-guard/vite/tsup.inline.trace.config.ts](../../../spa-guard/vite/tsup.inline.trace.config.ts) - Move to node
- [spa-guard/node/package.json](../../../spa-guard/node/package.json) - Add build:inline script
- [spa-guard/vite/package.json](../../../spa-guard/vite/package.json) - Add node dependency, remove inline scripts
- [spa-guard/vite/src/index.ts](../../../spa-guard/vite/src/index.ts) - Read from node package
- [spa-guard/node/src/index.ts:1-8](../../../spa-guard/node/src/index.ts#L1-L8) - Remove builder re-exports

### Task #2 (Spinner Options)

- [spa-guard/spa-guard/src/common/options.ts](../../../spa-guard/spa-guard/src/common/options.ts)
- [spa-guard/spa-guard/src/common/spinner.ts](../../../spa-guard/spa-guard/src/common/spinner.ts)
- [spa-guard/spa-guard/src/common/reload.ts](../../../spa-guard/spa-guard/src/common/reload.ts)
- [spa-guard/vite/src/index.ts](../../../spa-guard/vite/src/index.ts)
- [spa-guard/node/src/builder.ts](../../../spa-guard/node/src/builder.ts)
- [spa-guard/react/src/react/Spinner.tsx](../../../spa-guard/react/src/react/Spinner.tsx)
- [spa-guard/react/src/DefaultErrorFallback.tsx](../../../spa-guard/react/src/DefaultErrorFallback.tsx)

### Task #3 (Enhanced Logging)

- [spa-guard/spa-guard/src/common/events/types.ts](../../../spa-guard/spa-guard/src/common/events/types.ts)
- [spa-guard/spa-guard/src/common/retryImport.ts](../../../spa-guard/spa-guard/src/common/retryImport.ts)
- [spa-guard/spa-guard/src/common/logger.ts](../../../spa-guard/spa-guard/src/common/logger.ts)

### Task #4 (PeerDependencies)

- [spa-guard/node/package.json](../../../spa-guard/node/package.json)
- [spa-guard/vite/package.json](../../../spa-guard/vite/package.json)
- [spa-guard/react/package.json](../../../spa-guard/react/package.json)
- [spa-guard/react-router/package.json](../../../spa-guard/react-router/package.json)
- [spa-guard/fastify/package.json](../../../spa-guard/fastify/package.json)

### Task #5 (External Dev Mode)

- [spa-guard/vite/src/index.ts](../../../spa-guard/vite/src/index.ts)
