# Fix: useRetryId:false drops attempt param from URL causing infinite reloads

## Overview

When `useRetryId: false`, the code skips ALL URL parameter handling - both `spaGuardRetryId` and `spaGuardRetryAttempt`. But `useRetryId` should only control the `retryId` param. The `attempt` param must still be written to and read from the URL. Without the attempt counter in the URL, each page reload starts at attempt 0, causing infinite reloads stuck on attempt 1.

## Context

- Files involved:
  - `packages/spa-guard/src/common/retryState.ts` - add attempt-only URL read/write functions
  - `packages/spa-guard/src/common/reload.ts` - use attempt-only URL functions when `useRetryId: false`
  - `packages/spa-guard/src/common/retryState.test.ts` - tests for new functions
  - `packages/spa-guard/src/common/reload.test.ts` - tests for fixed behavior
- Related patterns: existing `getRetryStateFromUrl()` / `buildReloadUrl()` / `clearRetryStateFromUrl()`
- Dependencies: none

## Development Approach

- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Add attempt-only URL functions to retryState.ts

**Files:**

- Modify: `packages/spa-guard/src/common/retryState.ts`
- Modify: `packages/spa-guard/src/common/retryState.test.ts`

- [x] Add `getRetryAttemptFromUrl(): number | null` - reads only `spaGuardRetryAttempt` param from URL, returns parsed number or null
- [x] Add `clearRetryAttemptFromUrl(): void` - removes only `spaGuardRetryAttempt` from URL via `history.replaceState`
- [x] Write tests for both new functions
- [x] Run project test suite - must pass before task 2

### Task 2: Update reload.ts to keep attempt param when useRetryId is false

**Files:**

- Modify: `packages/spa-guard/src/common/reload.ts`
- Modify: `packages/spa-guard/src/common/reload.test.ts`

- [x] Extract a `buildReloadUrlAttemptOnly(retryAttempt: number): string` helper that sets only `spaGuardRetryAttempt` param (no `spaGuardRetryId`)
- [x] Line 40: when `useRetryId: false`, read attempt from `getRetryAttemptFromUrl()` instead of returning null; construct a partial retry state with a generated retryId and the persisted attempt
- [x] Lines 148-153: when `useRetryId: false`, use `location.href = buildReloadUrlAttemptOnly(nextAttempt)` instead of `location.reload()`, so the attempt param persists across reloads
- [x] In the exhaustion path (line 97+): when `useRetryId: false`, call `clearRetryAttemptFromUrl()` to clean up the URL
- [x] In `showFallbackUI`: handle `useRetryId: false` case - use `clearRetryAttemptFromUrl()` when no full retry state is present
- [x] Update existing `useRetryId=false` tests to verify the attempt param appears in URL
- [x] Add test: successive reloads with `useRetryId=false` increment attempt via URL param and eventually reach exhaustion
- [x] Add test: exhaustion with `useRetryId=false` clears the attempt param from URL
- [x] Run project test suite - must pass before task 3

### Task 3: Verify acceptance criteria

- [x] Manual test: `useRetryId: false` keeps `spaGuardRetryAttempt` in URL across reloads, increments correctly, reaches exhaustion
- [x] Manual test: `useRetryId: false` does NOT put `spaGuardRetryId` in URL
- [x] Manual test: `useRetryId: true` still works with both URL params as before (no regression)
- [x] Run full test suite (`pnpm test` or project-specific command)
- [x] Run linter (`pnpm lint` or project-specific command)

### Task 4: Update documentation

- [x] Update README.md if user-facing changes
- [x] Update CLAUDE.md if internal patterns changed
- [x] Move this plan to `docs/plans/completed/`
