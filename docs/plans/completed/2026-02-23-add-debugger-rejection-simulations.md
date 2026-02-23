# Add unhandled rejection simulations to debugger

## Overview

Add two new error simulations to the spa-guard debug panel that correspond to the handleUnhandledRejections feature: a ForceRetry error and a plain Unhandled Rejection. These cover the two remaining unhandledrejection handler paths that lack dedicated debugger buttons.

## Context

- Files involved:
  - `packages/spa-guard/src/runtime/debug/errorDispatchers.ts` - Add 2 new dispatcher functions
  - `packages/spa-guard/src/runtime/debug/errorDispatchers.test.ts` - Tests for new dispatchers
  - `packages/spa-guard/src/runtime/debug/index.ts` - Register new scenarios in SCENARIOS array
  - `packages/spa-guard/src/runtime/debug/index.test.ts` - Tests for new buttons
- Related patterns: Existing dispatchers use `void Promise.reject()` for unhandled rejections. Scenarios are defined in the SCENARIOS array with key/label/dispatch. ForceRetryError uses FORCE_RETRY_MAGIC prefix.
- Dependencies: `ForceRetryError` from `../../common/errors/ForceRetryError`

## Development Approach

- **Testing approach**: Regular (code first, then tests) following the existing pattern
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Add dispatcher functions

**Files:**

- Modify: `packages/spa-guard/src/runtime/debug/errorDispatchers.ts`
- Modify: `packages/spa-guard/src/runtime/debug/errorDispatchers.test.ts`

- [x] Add `dispatchForceRetryError()` function that creates a `ForceRetryError` and fires it via `void Promise.reject(error)`. Import ForceRetryError from `../../common/errors/ForceRetryError`
- [x] Add `dispatchUnhandledRejection()` function that creates a plain `Error("Simulated unhandled promise rejection from spa-guard debug panel")` and fires it via `void Promise.reject(error)`. This is NOT a chunk error and NOT a ForceRetry - it exercises the handleUnhandledRejections config path
- [x] Write tests for `dispatchForceRetryError`: returns void, triggers unhandled rejection, error is a ForceRetryError instance, message contains FORCE_RETRY_MAGIC, shouldForceRetry returns true for it
- [x] Write tests for `dispatchUnhandledRejection`: returns void, triggers unhandled rejection, error is a plain Error, isChunkError returns false, shouldForceRetry returns false (confirming it hits the regular rejection path)
- [x] Run project test suite - must pass before task 2

### Task 2: Register new scenarios in debugger panel

**Files:**

- Modify: `packages/spa-guard/src/runtime/debug/index.ts`
- Modify: `packages/spa-guard/src/runtime/debug/index.test.ts`

- [x] Import `dispatchForceRetryError` and `dispatchUnhandledRejection` from `./errorDispatchers`
- [x] Add two entries to SCENARIOS array: `{ dispatch: dispatchForceRetryError, key: "force-retry-error", label: "ForceRetry Error" }` and `{ dispatch: dispatchUnhandledRejection, key: "unhandled-rejection", label: "Unhandled Rejection" }`
- [x] Update test "renders all 5 error buttons" to check for 7 buttons including the new keys
- [x] Add tests that clicking "force-retry-error" calls `dispatchForceRetryError` and clicking "unhandled-rejection" calls `dispatchUnhandledRejection`
- [x] Update test "shows default labels initially" to include the two new labels
- [x] Update mock setup in index.test.ts to include the two new dispatchers
- [x] Run project test suite - must pass before task 3

### Task 3: Verify acceptance criteria

- [x] Run full test suite (pnpm test)
- [x] Run linter (pnpm lint)
- [x] Run type check (pnpm typecheck)
- [x] Verify test coverage meets 80%+

### Task 4: Update documentation

- [x] Update README.md if user-facing changes
- [x] Update CLAUDE.md if internal patterns changed
- [x] Move this plan to `docs/plans/completed/`
