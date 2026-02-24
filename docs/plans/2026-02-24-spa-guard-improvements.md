# Implement TODO.md Tasks: spa-guard Improvements

## Overview

Implement all three tasks from TODO.md: HTML Cache Store, ETag/304 support (client + server + Fastify handler), and fix version check pause on tab hide. Delete TODO.md after completion.

## Context

- Files involved:
  - spa-guard/node/src/index.ts (HtmlCache, HtmlCacheResponse, createHtmlCache, new createHTMLCacheStore)
  - spa-guard/node/src/index.test.ts (server-side tests)
  - spa-guard/spa-guard/src/common/options.ts (checkVersion options)
  - spa-guard/spa-guard/src/common/checkVersion.ts (module-level state -> window singleton)
  - spa-guard/spa-guard/src/common/checkVersion.test.ts (checkVersion tests)
  - spa-guard/spa-guard/src/common/constants.ts (window key constants)
  - spa-guard/fastify/src/index.ts (spaGuardFastifyHandler)
  - spa-guard/fastify/src/spaGuardFastifyHandler.test.ts (new test file)
  - spa-guard/fastify/package.json (peer dependencies)
- Related patterns: window singleton pattern from events/internal.ts
- Dependencies: none external; all workspace packages

## Development Approach

- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- Follow implementation order from TODO.md (Phase 1-4 + Task 3)
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Server-Side ETag/304 Support (TODO Task 2.2)

**Files:**

- Modify: `spa-guard/node/src/index.ts`
- Modify: `spa-guard/node/src/index.test.ts`

- [x] Add `statusCode: 200 | 304` to `HtmlCacheResponse` interface
- [x] Add `ifNoneMatch?: string` parameter to `HtmlCache.get()` options
- [x] Implement ETag comparison logic in `get()` method: return 304 with empty body when ifNoneMatch matches entry.etag
- [x] Update all existing `return` statements in `get()` to include `statusCode: 200`
- [x] Write tests: 304 on matching ETag, 200 on mismatch, language-specific ETags, backward compatibility (no ifNoneMatch)
- [x] Run tests: `cd spa-guard/node && pnpm test` - must pass

### Task 2: HTML Cache Store (TODO Task 1)

**Files:**

- Modify: `spa-guard/node/src/index.ts`
- Modify: `spa-guard/node/src/index.test.ts`

- [x] Add types: `HTMLCacheStoreInput<K>`, `HTMLCacheStoreMap<K>`
- [x] Implement `createHTMLCacheStore()` function with `getCache`, `isLoaded`, `load` methods
- [x] Sequential key processing in `load()` (each key calls createHtmlCache)
- [x] Error handling: throw on getCache before load(), throw on unknown key
- [x] Idempotent load() (skip if already loaded)
- [x] Write tests: static HTML input, async HTML input, lazy loading (throw before load), unknown key error, idempotent load
- [x] Run tests: `cd spa-guard/node && pnpm test` - must pass

### Task 3: Client-Side Cache Parameter (TODO Task 2.1)

**Files:**

- Modify: `spa-guard/spa-guard/src/common/options.ts`
- Modify: `spa-guard/spa-guard/src/common/checkVersion.ts`
- Modify: `spa-guard/spa-guard/src/common/checkVersion.test.ts`

- [x] Add `cache?: "no-cache" | "no-store"` to checkVersion options interface
- [x] Add `cache: "no-store"` to defaultOptions
- [x] Update `fetchJsonVersion()` to use `getOptions().checkVersion?.cache ?? "no-store"` in fetch call
- [x] Update `fetchHtmlVersion()` similarly
- [x] Write tests: default "no-store" behavior, explicit "no-cache" for both HTML and JSON modes
- [x] Run tests: `cd spa-guard/spa-guard && pnpm test` - must pass

### Task 4: Fastify Handler Wrapper (TODO Task 2.3)

**Files:**

- Modify: `spa-guard/fastify/src/index.ts`
- Create: `spa-guard/fastify/src/spaGuardFastifyHandler.test.ts`
- Modify: `spa-guard/fastify/package.json`

- [x] Add `SpaGuardHandlerOptions` interface and `spaGuardFastifyHandler()` function to fastify/src/index.ts
- [x] Support both `cache` (pre-built HtmlCache) and `getHtml` (lazy creation) options
- [x] Extract accept-encoding, accept-language, if-none-match headers from request
- [x] Forward statusCode from HtmlCacheResponse to Fastify reply
- [x] Add `@ovineko/spa-guard-node` to peerDependencies in package.json
- [x] Write tests: 200 with HTML body, 304 on matching ETag, getHtml option (sync/async), error on missing options
- [x] Run tests: `cd spa-guard/fastify && pnpm test` - must pass

### Task 5: Fix Version Check Pause on Tab Hide (TODO Task 3)

**Files:**

- Modify: `spa-guard/spa-guard/src/common/constants.ts`
- Modify: `spa-guard/spa-guard/src/common/checkVersion.ts`
- Modify: `spa-guard/spa-guard/src/common/checkVersion.test.ts`

- [ ] Add `versionCheckStateWindowKey` constant to constants.ts
- [ ] Define `VersionCheckState` interface in checkVersion.ts
- [ ] Initialize singleton state in `window[versionCheckStateWindowKey]` on module load
- [ ] Create `getState()` accessor function
- [ ] Refactor all functions (clearTimers, handleVisibilityHidden, handleResume, checkVersionOnce, startPolling, startVersionCheck, stopVersionCheck, \_resetForTesting) to use getState() instead of module-level variables
- [ ] Verify existing tests pass (update \_resetForTesting to clear window singleton)
- [ ] Run tests: `cd spa-guard/spa-guard && pnpm test` - must pass

### Task 6: Verify acceptance criteria

- [ ] Run full test suite: `pnpm test` (all packages)
- [ ] Run linter: `pnpm lint`
- [ ] Run typecheck: `cd spa-guard/spa-guard && pnpm typecheck && cd ../node && pnpm typecheck && cd ../fastify && pnpm typecheck`
- [ ] Run build: `pnpm build`
- [ ] Verify test coverage meets 80%+

### Task 7: Cleanup and documentation

- [ ] Delete TODO.md
- [ ] Update CLAUDE.md if internal patterns changed (window singleton pattern documentation)
- [ ] Move plan to `docs/plans/completed/`
