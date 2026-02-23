# Add optional cause to ForceRetryError and fix options.errors.ignore not preventing reloads

## Overview

Two changes:

1. Add support for the standard ES2022 `cause` option to `ForceRetryError`, allowing users to wrap original errors: `throw new ForceRetryError("Failed to initialize auth", { cause: error })`.
2. Fix bug where `options.errors.ignore[]` patterns only suppress logging but do not prevent reloads or beacon sending - errors matching ignore patterns should be fully ignored (early return, no reload, no beacon).

## Context

- Files involved:
  - `packages/spa-guard/src/common/errors/ForceRetryError.ts` - add cause support
  - `packages/spa-guard/src/common/errors/ForceRetryError.test.ts` - tests for cause
  - `packages/spa-guard/src/common/listen/internal.ts` - fix ignore early return
  - `packages/spa-guard/src/common/listen/internal.test.ts` - fix/update ignore tests
  - `packages/spa-guard/README.md` - doc updates
- Related patterns: Standard ES2022 `ErrorOptions` with `{ cause }` - available via `lib: ["esnext"]` in tsconfig
- Dependencies: None

## Development Approach

- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Add cause support to ForceRetryError constructor

**Files:**

- Modify: `packages/spa-guard/src/common/errors/ForceRetryError.ts`

- [x] Add optional second parameter `options?: ErrorOptions` to the constructor
- [x] Pass `options` to `super()` as the second argument: `super(\`${FORCE_RETRY_MAGIC}${message ?? ""}\`, options)`
- [x] Add tests for cause support in `ForceRetryError.test.ts`:
  - cause is undefined when not provided (backward compat)
  - cause is set when `{ cause: originalError }` is passed
  - cause works together with a message
  - cause works when message is omitted: `new ForceRetryError(undefined, { cause: err })`
- [x] run project test suite - must pass before task 2

### Task 2: Fix options.errors.ignore to fully skip ignored errors

**Files:**

- Modify: `packages/spa-guard/src/common/listen/internal.ts`
- Modify: `packages/spa-guard/src/common/listen/internal.test.ts`

- [x] In `error` handler: add `if (shouldIgnore) return;` after the logging check (before isChunkError/shouldForceRetry/sendBeacon)
- [x] In `unhandledrejection` handler: add `if (shouldIgnore) return;` after the logging check (before isChunkError/shouldForceRetry/handleUnhandledRejections)
- [x] In `securitypolicyviolation` handler: add `if (shouldIgnore) return;` after the logging check (before sendBeacon)
- [x] In `vite:preloadError` handler: add `if (shouldIgnore) return;` after the logging check (before preventDefault/attemptReload)
- [x] Update tests: change "still calls sendBeacon when shouldIgnoreMessages returns true" tests to assert sendBeacon is NOT called
- [x] Update tests: change "still calls attemptReload when shouldIgnoreMessages returns true" test to assert attemptReload is NOT called
- [x] Add tests: ignored errors do not call attemptReload in error handler
- [x] Add tests: ignored errors do not call attemptReload in unhandledrejection handler
- [x] Add tests: ignored errors do not call preventDefault in any handler
- [x] run project test suite - must pass before task 3

### Task 3: Update README documentation

**Files:**

- Modify: `packages/spa-guard/README.md`

- [ ] Add `{ cause }` example to the ForceRetryError section
- [ ] Show wrapping a caught error: `throw new ForceRetryError("Failed to init auth", { cause: error })`
- [ ] Update the property example block to show `err.cause`
- [ ] Document that `errors.ignore` patterns fully skip all processing (no reload, no beacon)

### Task 4: Verify acceptance criteria

- [ ] manual test: `new ForceRetryError("msg", { cause: new Error("orig") }).cause` returns the original error
- [ ] run full test suite (pnpm test)
- [ ] run linter (pnpm lint)
- [ ] run type check (pnpm typecheck)

### Task 5: Update documentation

- [ ] update CLAUDE.md if internal patterns changed
- [ ] move this plan to `docs/plans/completed/`
