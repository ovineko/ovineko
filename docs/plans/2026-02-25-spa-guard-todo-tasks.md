---
# spa-guard Refactoring: All TODO Tasks

## Overview
Implement all 6 tasks from TODO.md to address architectural and usability issues in the spa-guard monorepo, then delete TODO.md.

## Context
- Files involved: spa-guard/{spa-guard,vite,node,react,react-router,fastify} packages
- Related patterns: monorepo with pnpm workspaces, tsup builds, vitest tests
- Dependencies: none external

## Development Approach
- **Testing approach**: Regular (implement then test)
- Tasks executed in order of risk (low to high)
- Each task must pass full test suite before next begins
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Enhanced lazyWithRetry Logging

Low-risk, pure addition — done first to reduce risk.

**Files:**
- Modify: `spa-guard/spa-guard/src/common/events/types.ts`
- Modify: `spa-guard/spa-guard/src/common/retryImport.ts`
- Modify: `spa-guard/spa-guard/src/common/logger.ts`

- [x] Add `lazy-retry-start` event type with `totalAttempts` field
- [x] Add `error?: unknown` field to `lazy-retry-attempt` event
- [x] Add `totalTime?: number` field to `lazy-retry-success` event
- [x] Add `error: unknown` field to `lazy-retry-exhausted` event
- [x] Update `retryImport.ts`: emit `lazy-retry-start` before first attempt
- [x] Update `retryImport.ts`: include error in `lazy-retry-attempt` event
- [x] Update `retryImport.ts`: track `startTime` and include in `lazy-retry-success`
- [x] Update `retryImport.ts`: include final error in `lazy-retry-exhausted`
- [x] Update `logger.ts`: format new fields in all 4 event messages
- [x] Update `logger.ts`: output error object alongside message for attempt/exhausted events
- [x] Write/update tests in `retryImport.test.ts` and `logger.test.ts`
- [x] Run `pnpm --filter @ovineko/spa-guard test` — must pass

### Task 2: Move options.spinner to options.html.spinner

Low-risk structural change.

**Files:**
- Modify: `spa-guard/spa-guard/src/common/options.ts`
- Modify: `spa-guard/spa-guard/src/common/spinner.ts`
- Modify: `spa-guard/spa-guard/src/common/reload.ts`
- Modify: `spa-guard/vite/src/index.ts`
- Modify: `spa-guard/node/src/builder.ts`
- Modify: `spa-guard/react/src/react/Spinner.tsx`
- Modify: `spa-guard/react/src/DefaultErrorFallback.tsx`

- [x] Move `spinner` field from top-level `Options` interface into `Options.html`
- [x] Move `spinner` default value from top-level defaults into `html` defaults
- [x] Replace all `opts.spinner?.` references with `opts.html?.spinner?.` across all 7 files
- [x] Verify TypeScript compiles without errors (`pnpm --recursive typecheck` or `pnpm tsc`)
- [x] Update tests in `options.test.ts` and `spinner.test.ts` for new path
- [x] Run `pnpm --recursive test` — must pass

### Task 3: Eliminate Circular Dependency (vite → node)

High-risk refactor — inline scripts move from vite to node package.

**Files:**
- Move: `spa-guard/vite/src/inline/` → `spa-guard/node/src/inline/`
- Move: `spa-guard/vite/src/inline-trace/` → `spa-guard/node/src/inline-trace/`
- Move: `spa-guard/vite/tsup.inline.config.ts` → `spa-guard/node/tsup.inline.config.ts`
- Move: `spa-guard/vite/tsup.inline.trace.config.ts` → `spa-guard/node/tsup.inline.trace.config.ts`
- Modify: `spa-guard/node/package.json`
- Modify: `spa-guard/vite/package.json`
- Modify: `spa-guard/vite/src/index.ts`
- Modify: `spa-guard/node/src/index.ts`

- [ ] Move inline source directories and tsup configs from vite to node
- [ ] Add `build:inline` script to `node/package.json`; update `prepublishOnly` to use it; add `dist-inline` and `dist-inline-trace` to `files`
- [ ] Remove `build:inline` script and `copy:bundles` script from `vite/package.json`; add `@ovineko/spa-guard-node` to dependencies
- [ ] Update `vite/src/index.ts`: replace local `getInlineScript` with version that reads from `@ovineko/spa-guard-node` package via `import.meta.resolve`
- [ ] Remove builder re-exports from `node/src/index.ts` (lines that re-export from `./builder`)
- [ ] Build node first: `pnpm --filter @ovineko/spa-guard-node build:inline && pnpm --filter @ovineko/spa-guard-node build`
- [ ] Build vite: `pnpm --filter @ovineko/spa-guard-vite build`
- [ ] Verify `dist-inline/` and `dist-inline-trace/` exist in node package
- [ ] Run `pnpm --recursive test` — must pass

### Task 4: Fix External Mode in Dev Server

Medium-risk addition to vite plugin.

**Files:**
- Modify: `spa-guard/vite/src/index.ts`

- [ ] Add `cachedExternalContent`, `cachedExternalHash`, `cachedExternalFileName` variables to plugin closure
- [ ] Add `configureServer` hook: register middleware that serves `/spa-guard.{hash}.js` from cache when mode is external
- [ ] Update `transformIndexHtml` handler: populate cache variables when building external content
- [ ] Ensure `writeBundle` hook still reads from cache (no regression)
- [ ] Write tests for dev server middleware behavior in `index.test.ts`
- [ ] Run `pnpm --filter @ovineko/spa-guard-vite test` — must pass

### Task 5: Convert Internal Deps to peerDependencies

Medium-risk: affects npm install UX, not runtime behavior.

**Files:**
- Modify: `spa-guard/node/package.json`
- Modify: `spa-guard/vite/package.json`
- Modify: `spa-guard/react/package.json`
- Modify: `spa-guard/react-router/package.json`
- Modify: `spa-guard/fastify/package.json`
- Modify: `spa-guard/node/README.md` (if exists)
- Modify: `spa-guard/vite/README.md` (if exists)
- Modify: `spa-guard/react/README.md` (if exists)
- Modify: `spa-guard/react-router/README.md` (if exists)
- Modify: `spa-guard/fastify/README.md` (if exists)

- [ ] Move `@ovineko/spa-guard` from `dependencies` to `peerDependencies` + `devDependencies` in node, vite, react, react-router, fastify packages
- [ ] Move `@ovineko/spa-guard-react` from `dependencies` to `peerDependencies` + `devDependencies` in react-router package
- [ ] Keep `@ovineko/spa-guard-node` in vite's `dependencies` (needed for reading inline scripts)
- [ ] Run `pnpm install` to regenerate lockfile
- [ ] Run `pnpm --recursive build` — must succeed
- [ ] Update installation instructions in README files for affected packages
- [ ] Run `pnpm --recursive test` — must pass

### Task 6: Handle 404 Static Asset Errors During Deployment

New feature for detecting and recovering from deployment version mismatches.

**Files:**
- Create: `spa-guard/spa-guard/src/common/isStaticAssetError.ts`
- Create: `spa-guard/spa-guard/src/common/isStaticAssetError.test.ts`
- Create: `spa-guard/spa-guard/src/common/staticAssetRecovery.ts`
- Create: `spa-guard/spa-guard/src/common/staticAssetRecovery.test.ts`
- Modify: `spa-guard/spa-guard/src/common/listen/internal.ts`
- Modify: `spa-guard/spa-guard/src/common/reload.ts`
- Modify: `spa-guard/spa-guard/src/common/options.ts`
- Modify: `spa-guard/spa-guard/src/common/events/types.ts`
- Modify: `spa-guard/spa-guard/src/common/logger.ts`
- Modify: `spa-guard/spa-guard/src/schema/index.ts`

- [ ] Create `isStaticAssetError.ts`: detect script/link errors with hashed filenames; implement `isLikely404` heuristic based on time since navigation
- [ ] Create `staticAssetRecovery.ts`: collect failed assets for 500ms, then trigger `attemptReload` with cache bust; export `resetStaticAssetRecovery` for tests
- [ ] Update `reload.ts`: add `cacheBust?: boolean` to reload options; append `spaGuardCacheBust` query param when true
- [ ] Update `options.ts`: add `staticAssets?: { autoRecover?: boolean; recoveryDelay?: number }` with defaults `{ autoRecover: true, recoveryDelay: 500 }`
- [ ] Update `events/types.ts`: add `SPAGuardEventStaticAssetLoadFailed` type and add to `SPAGuardEvent` union
- [ ] Update `listen/internal.ts`: call `isStaticAssetError` and `isLikely404` on error events; emit event and call recovery when detected
- [ ] Update `logger.ts`: handle `static-asset-load-failed` event at `error` level
- [ ] Update `schema/index.ts`: add `errorContext`, `errorType`, `httpStatus`, `url` fields to `BeaconSchema`
- [ ] Write tests for `isStaticAssetError.ts` (script/link/API/non-hashed cases)
- [ ] Write tests for `staticAssetRecovery.ts` (single/multiple failures, delay behavior)
- [ ] Run `pnpm --filter @ovineko/spa-guard test` — must pass
- [ ] Run `pnpm --recursive test` — must pass

### Task 7: Final Verification and Cleanup

- [ ] Run `pnpm --recursive lint`
- [ ] Run `pnpm --recursive typecheck`
- [ ] Run `pnpm --recursive test`
- [ ] Run `pnpm --recursive build`
- [ ] Manually verify dev server works: `cd examples/vite-react && pnpm dev`
- [ ] Delete `TODO.md` from project root
- [ ] Move this plan to `docs/plans/completed/`
---
