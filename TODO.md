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

- [spa-guard/node/package.json](../../../spa-guard/node/package.json)
- [spa-guard/node/src/builder.ts:79-84](../../../spa-guard/node/src/builder.ts#L79-L84)
- [spa-guard/node/src/index.ts:1-8](../../../spa-guard/node/src/index.ts#L1-L8)

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
