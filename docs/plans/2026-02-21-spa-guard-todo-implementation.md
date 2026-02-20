---

# spa-guard TODO.md Implementation Plan

## Overview

Implementation of all 4 features described in `packages/spa-guard/TODO.md`:

1. Vite Plugin Tests — complete the test suite
2. Enhanced Event Emitter — InternalConfig, initialization control, SPA takeover
3. Version Checker Module — proactive new-deployment detection
4. React event hooks (useSPAGuardEvents, useSPAGuardChunkError)
5. ESLint Plugin — as a submodule `@ovineko/spa-guard/eslint` within the same npm package

## Context

- Files involved: `src/common/checkVersion.ts` (new), `src/common/options.ts`, `src/common/constants.ts`, `src/common/events/types.ts`, `src/common/events/internal.ts`, `src/common/listen/internal.ts`, `src/vite-plugin/index.ts`, `src/react/index.tsx`, `src/common/index.ts`, `src/eslint/index.ts` (new), `src/eslint/rules/no-direct-error-boundary.ts` (new), `src/eslint/rules/no-direct-lazy.ts` (new), `package.json`, `tsup.config.ts`
- Related patterns: vitest tests with vi.resetModules() pattern (see runtime/state.test.ts), happy-dom environment, Symbol.for shared state pattern, submodule exports pattern (see ./react, ./vite-plugin entries)
- Dependencies: existing vitest/react testing setup already configured; eslint added as optional peer dep

## Development Approach

- **Testing approach**: TDD (test first for new modules, then implementation)
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Vite Plugin Tests

Covers the last missing test file from the Comprehensive Test Suite (TODO item 4).

**Files:**

- Create: `packages/spa-guard/src/vite-plugin/index.test.ts`

- [x] write tests for `spaGuardVitePlugin`: HTML injection, script content contains `__SPA_GUARD_OPTIONS__`, options serialisation
- [x] write test for inline script embedding (mocked `fsPromise.readFile`)
- [x] run `pnpm --filter @ovineko/spa-guard test` — must pass before task 2

### Task 2: Enhanced Event Emitter — InternalConfig & Control

Covers the missing parts of TODO item 2 (status: Partially implemented).

**Files:**

- Modify: `packages/spa-guard/src/common/constants.ts`
- Modify: `packages/spa-guard/src/common/events/types.ts`
- Modify: `packages/spa-guard/src/common/events/internal.ts`
- Modify: `packages/spa-guard/src/common/listen/internal.ts`
- Modify: `packages/spa-guard/src/common/events/internal.test.ts`

- [x] add `initializedKey = Symbol.for(...)` and `internalConfigWindowKey = Symbol.for(...)` to `constants.ts`
- [x] add `InternalConfig` interface and rich event types (`chunk-error`, `retry-attempt`, `retry-exhausted`, `fallback-ui-shown`) to `events/types.ts`
- [x] add `internalConfig` shared state init to `events/internal.ts`
- [x] export `isInitialized`, `markInitialized`, `disableDefaultRetry`, `enableDefaultRetry`, `isDefaultRetryEnabled` from `events/internal.ts`
- [x] update `listenInternal` in `listen/internal.ts` to guard with `isInitialized()` / `markInitialized()`
- [x] add tests for new functions in `events/internal.test.ts` (disableDefaultRetry, isDefaultRetryEnabled, isInitialized, double-init prevention)
- [x] run `pnpm --filter @ovineko/spa-guard test` — must pass before task 3

### Task 3: Version Checker Module

Covers TODO item 1 (status: Not implemented).

**Files:**

- Create: `packages/spa-guard/src/common/checkVersion.ts`
- Create: `packages/spa-guard/src/common/checkVersion.test.ts`
- Modify: `packages/spa-guard/src/common/options.ts`
- Modify: `packages/spa-guard/src/vite-plugin/index.ts`
- Modify: `packages/spa-guard/src/common/index.ts`

- [x] add `checkVersion` config block to `Options` interface and `defaultOptions` in `options.ts`
- [x] update `getOptions` merge logic to handle nested `checkVersion` object
- [x] implement `checkVersion.ts`: `startVersionCheck`, `stopVersionCheck`, `fetchRemoteVersion` (html + json modes), `onVersionChange` (dispatches `spa-guard:version-change` CustomEvent)
- [x] update `vite-plugin/index.ts`: add `configResolved` hook to auto-read `package.json` version; inject `version` into serialized options
- [x] export `startVersionCheck`, `stopVersionCheck` from `src/common/index.ts`
- [x] write `checkVersion.test.ts` covering: no version config → warn; version change HTML mode → dispatches event; version change JSON mode → dispatches event; no change → no event; fetch error → logs and continues; stop clears interval; duplicate startVersionCheck → warn; SSR (no window) → noop
- [x] run `pnpm --filter @ovineko/spa-guard test` — must pass before task 4

### Task 4: React Event Hooks

Covers the React integration part of TODO item 2.

**Files:**

- Create: `packages/spa-guard/src/react/useSPAGuardEvents.ts`
- Create: `packages/spa-guard/src/react/useSPAGuardChunkError.ts`
- Modify: `packages/spa-guard/src/react/index.tsx`

- [x] implement `useSPAGuardEvents(callback)` hook using subscribe/useEffect pattern
- [x] implement `useSPAGuardChunkError()` hook using useSPAGuardEvents + useState
- [x] export both hooks from `src/react/index.tsx`
- [x] add tests for `useSPAGuardEvents` and `useSPAGuardChunkError` (using @testing-library/react renderHook)
- [x] run `pnpm --filter @ovineko/spa-guard test` — must pass before task 5

### Task 5: ESLint Plugin Submodule

Covers TODO item 3 (status: Not implemented). Implemented as `@ovineko/spa-guard/eslint` submodule within the same package.

**Files:**

- Modify: `packages/spa-guard/package.json`
- Modify: `packages/spa-guard/tsup.config.ts`
- Create: `packages/spa-guard/src/eslint/index.ts`
- Create: `packages/spa-guard/src/eslint/rules/no-direct-error-boundary.ts`
- Create: `packages/spa-guard/src/eslint/rules/no-direct-lazy.ts`
- Create: `packages/spa-guard/src/eslint/rules/no-direct-error-boundary.test.ts`
- Create: `packages/spa-guard/src/eslint/rules/no-direct-lazy.test.ts`

- [x] add `eslint: "^8 || ^9"` to `peerDependencies` and `eslint: { optional: true }` to `peerDependenciesMeta` in `package.json`
- [x] add `@types/eslint` to `devDependencies` in `package.json`
- [x] add `"./eslint": { "types": "./dist/eslint/index.d.ts", "default": "./dist/eslint/index.js" }` to `exports` in `package.json`
- [x] add `"src/eslint/index.ts"` to entry points in `tsup.config.ts`
- [x] implement `no-direct-error-boundary` rule with auto-fix (changes import source to `@ovineko/spa-guard/react-error-boundary`)
- [x] implement `no-direct-lazy` rule with auto-fix including split-import case
- [x] implement plugin `src/eslint/index.ts` with `rules` and `configs.recommended`
- [x] write tests using `RuleTester` for both rules (valid/invalid cases, auto-fix output)
- [x] run `pnpm --filter @ovineko/spa-guard test` — must pass before task 6

### Task 6: Verify acceptance criteria

- [ ] manual check: `startVersionCheck` is importable from `@ovineko/spa-guard`
- [ ] manual check: `disableDefaultRetry`, `isDefaultRetryEnabled` are importable from `@ovineko/spa-guard`
- [ ] manual check: `useSPAGuardEvents`, `useSPAGuardChunkError` are importable from `@ovineko/spa-guard/react`
- [ ] manual check: `@ovineko/spa-guard/eslint` is importable and exports a plugin with `rules` and `configs.recommended`
- [ ] run full test suite: `pnpm --filter @ovineko/spa-guard test`
- [ ] run linter: `pnpm --filter @ovineko/spa-guard lint`
- [ ] verify test coverage: `pnpm --filter @ovineko/spa-guard test:coverage`

### Task 7: Update documentation

- [ ] update `packages/spa-guard/README.md` if user-facing API changed (checkVersion, event hooks, disableDefaultRetry, eslint submodule)
- [ ] move this plan to `docs/plans/completed/`
