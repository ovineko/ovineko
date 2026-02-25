---
# Fix SPA Guard Infinite Reload Loop

## Overview
When retry attempts are exhausted and the fallback UI is shown, subsequent static asset failures (e.g. from 404s on JS/CSS) still trigger `handleStaticAssetFailure` → `attemptReload`. This causes an infinite reload loop. The fix introduces a `fallbackState` module that tracks whether the system is in fallback mode, and guards the reload and static asset recovery paths against acting when in fallback mode.

## Context
- Files involved:
  - Create: `spa-guard/spa-guard/src/common/fallbackState.ts`
  - Create: `spa-guard/spa-guard/src/common/fallbackState.test.ts`
  - Modify: `spa-guard/spa-guard/src/common/constants.ts`
  - Modify: `spa-guard/spa-guard/src/common/staticAssetRecovery.ts`
  - Modify: `spa-guard/spa-guard/src/common/reload.ts`
  - Modify: `spa-guard/spa-guard/src/common/index.ts`
  - Modify: `spa-guard/spa-guard/src/common/staticAssetRecovery.test.ts`
  - Modify: `spa-guard/spa-guard/src/common/reload.test.ts`
  - Modify: `spa-guard/spa-guard/src/common/listen/internal.test.ts`
- Related patterns: Symbol.for window key pattern (see `retryState.ts`, `lastReloadTime.ts`, `constants.ts`)
- Dependencies: none

## Development Approach
- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- Follow existing Symbol.for window-key pattern for shared state
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Add fallbackModeKey constant

**Files:**
- Modify: `spa-guard/spa-guard/src/common/constants.ts`

- [x] Add `export const fallbackModeKey = Symbol.for(\`\${name}:fallback-mode\`);` following existing Symbol.for pattern
- [x] No test needed for constants (covered by integration)

### Task 2: Create fallbackState module

**Files:**
- Create: `spa-guard/spa-guard/src/common/fallbackState.ts`

- [x] Implement `isInFallbackMode(): boolean` — reads from `(globalThis.window as any)[fallbackModeKey]`
- [x] Implement `setFallbackMode(): void` — sets flag to true on window
- [x] Implement `resetFallbackMode(): void` — sets flag to false on window (used in tests)
- [x] Follow same guard pattern as `getState()` in `staticAssetRecovery.ts` for SSR safety

### Task 3: Create unit tests for fallbackState

**Files:**
- Create: `spa-guard/spa-guard/src/common/fallbackState.test.ts`

- [x] Test `isInFallbackMode()` returns false by default
- [x] Test `setFallbackMode()` makes `isInFallbackMode()` return true
- [x] Test `resetFallbackMode()` makes `isInFallbackMode()` return false after set
- [x] Run `npm test` in spa-guard — must pass

### Task 4: Guard handleStaticAssetFailure with fallback mode check

**Files:**
- Modify: `spa-guard/spa-guard/src/common/staticAssetRecovery.ts`

- [ ] Import `isInFallbackMode` from `./fallbackState`
- [ ] Add early return at top of `handleStaticAssetFailure()` if `isInFallbackMode()` returns true
- [ ] Update `staticAssetRecovery.test.ts`: mock `./fallbackState`, add test asserting no reload when in fallback mode
- [ ] Run `npm test` in spa-guard — must pass

### Task 5: Guard and set fallback mode in reload.ts

**Files:**
- Modify: `spa-guard/spa-guard/src/common/reload.ts`

- [ ] Import `isInFallbackMode`, `setFallbackMode` from `./fallbackState`
- [ ] Add guard at entry of `attemptReload()`: if `isInFallbackMode()`, log and return early
- [ ] Call `setFallbackMode()` in the `currentAttempt === -1` branch (before `showFallbackUI()`)
- [ ] Call `setFallbackMode()` in the retry-exhausted branch (before `showFallbackUI()`)
- [ ] Call `setFallbackMode()` at start of `showFallbackUI()` (defensive: covers direct calls)
- [ ] Update `reload.test.ts`: mock `./fallbackState`, add tests for each new setFallbackMode call site and the entry guard
- [ ] Run `npm test` in spa-guard — must pass

### Task 6: Export isInFallbackMode and resetFallbackMode from index

**Files:**
- Modify: `spa-guard/spa-guard/src/common/index.ts`

- [ ] Add export: `export { isInFallbackMode, resetFallbackMode } from "./fallbackState";`
- [ ] Update `listen/internal.test.ts` if it needs resetting fallback state between tests
- [ ] Run `npm test` in spa-guard — must pass

### Task 7: Verify acceptance criteria

- [ ] Manual test: click "Retry Exhausted" button → fallback UI shown
- [ ] Manual test: click "Static Asset 404" button → no infinite reload loop, no "Scheduling reload" spam in console
- [ ] Run full test suite: `npm test` in `spa-guard/spa-guard/`
- [ ] Run linter (check package.json for lint script)

### Task 8: Cleanup

- [ ] Delete `TODO.md` from repo root
- [ ] Move this plan to `docs/plans/completed/`
---
