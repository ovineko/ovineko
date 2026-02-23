# Add configurable handleUnhandledRejections option

## Overview

Add a new `handleUnhandledRejections` configuration option to spa-guard that controls behavior for regular unhandled promise rejections (those that are not chunk errors or ForceRetry errors). Default: retry:true, sendBeacon:true for maximum resilience. This is a behavioral change - current behavior is beacon-only for regular rejections.

## Context

- Files involved:
  - `packages/spa-guard/src/common/options.ts` - Options interface and defaults
  - `packages/spa-guard/src/common/listen/internal.ts` - unhandledrejection handler
  - `packages/spa-guard/src/common/listen/internal.test.ts` - tests
  - `packages/spa-guard/README.md` - documentation
- Related patterns: The existing `unhandledrejection` handler at internal.ts:64-91 follows a priority chain (chunk > forceRetry > beacon). The `options` object is read once at init (line 21) and captured in closures.
- Dependencies: none

## Development Approach

- **Testing approach**: TDD-leaning - update existing tests alongside implementation since many existing assertions change
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Add handleUnhandledRejections to Options interface and defaults

**Files:**

- Modify: `packages/spa-guard/src/common/options.ts`

- [x] Add `handleUnhandledRejections` field to the `Options` interface (after `errors` field) with `retry?: boolean` and `sendBeacon?: boolean` sub-fields, with JSDoc documenting defaults as true/true
- [x] Add `handleUnhandledRejections: { retry: true, sendBeacon: true }` to the `defaultOptions` object
- [x] Add deep merge for `handleUnhandledRejections` in the `getOptions()` return object (same pattern as `checkVersion`, `errors`, etc.)
- [x] Run project test suite - must pass before task 2

### Task 2: Modify unhandledrejection handler to use new config

**Files:**

- Modify: `packages/spa-guard/src/common/listen/internal.ts`
- Modify: `packages/spa-guard/src/common/listen/internal.test.ts`

- [x] In the unhandledrejection handler (line 64), after the chunk error and forceRetry checks, read `handleUnhandledRejections` from the already-captured `options` variable (line 21 closure)
- [x] When `retry` is true AND `sendBeacon` is true: send beacon first, then call attemptReload (beacon must be sent before reload refreshes the page)
- [x] When `retry` is true AND `sendBeacon` is false: only call attemptReload
- [x] When `retry` is false AND `sendBeacon` is true: only send beacon (current behavior)
- [x] When `retry` is false AND `sendBeacon` is false: do nothing (only the earlier logger.capturedError call remains)
- [x] Call `event.preventDefault()` only when retry is enabled
- [x] Write/update tests for all 4 behavior matrix combinations
- [x] Update existing unhandledrejection tests that assert sendBeacon-only behavior (they now need to account for the retry:true default)
- [x] Add tests verifying chunk errors and ForceRetry errors bypass the config entirely
- [x] Add tests for partial config (e.g., only `retry` specified, `sendBeacon` uses default)
- [x] Run project test suite - must pass before task 3

### Task 3: Update documentation

**Files:**

- Modify: `packages/spa-guard/README.md`

- [x] Add feature line to Features list: configurable unhandled rejection handling
- [x] Add a "Configuring Unhandled Rejection Handling" section documenting the behavior matrix and config examples
- [x] Add `handleUnhandledRejections` to the configuration reference section
- [x] Run project test suite - must pass before task 4

### Task 4: Verify acceptance criteria

- [x] Run full test suite (pnpm test)
- [x] Run linter (pnpm lint)
- [x] Run type check (pnpm typecheck)
- [x] Verify test coverage meets 80%+
- [x] Manual review: default behavior now triggers attemptReload for regular unhandled rejections

### Task 5: Update documentation

- [ ] Update README.md if user-facing changes
- [ ] Update CLAUDE.md if internal patterns changed
- [ ] Move this plan to `docs/plans/completed/`
