# spa-guard: revise.txt Backlog Implementation

## Overview

Implement 7 improvements to the spa-guard package captured from revise.txt, then delete revise.txt. Covers: retry bug fix, version check relocation to runtime with visibility-aware polling, Vite plugin auto-versioning, recommendedSetup() convenience API, unified fallback HTML, and AGENTS.md documentation update.

## Context

- Files involved:
  - `packages/spa-guard/src/common/checkVersion.ts` (version polling)
  - `packages/spa-guard/src/common/reload.ts` (retry orchestration)
  - `packages/spa-guard/src/common/retryState.ts` (URL param management)
  - `packages/spa-guard/src/runtime/index.ts` (runtime public API)
  - `packages/spa-guard/src/runtime/debug/index.ts` (debug panel)
  - `packages/spa-guard/src/runtime/debug/errorDispatchers.ts` (debug error triggers)
  - `packages/spa-guard/src/vite-plugin/index.ts` (Vite plugin)
  - `packages/spa-guard/src/common/DefaultErrorFallback.tsx` (React fallback)
  - `packages/spa-guard/src/react-error-boundary/index.tsx` (React error boundary)
  - `packages/spa-guard/src/react-router/index.tsx` (React Router error boundary)
  - `packages/spa-guard/src/common/fallbackHtml.generated.ts` (HTML fallback template)
  - `packages/spa-guard/src/common/logger.ts` (Logger interface)
  - `AGENTS.md` (agent instructions)
  - `packages/spa-guard/README.md` (package docs)
- Related patterns: Symbol-keyed DI on window, event auto-logging, Logger interface with named methods
- Dependencies: no new external dependencies

## Development Approach

- **Testing approach**: TDD where practical, regular approach for refactoring tasks
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Fix retry count bug

The user reports retry attempts resetting mid-cycle (sequence like 1,1,2,1,2,1,2,3 instead of 1,2,3), URL clearing between attempts, possibly triggered when debug panel is open.

**Files:**

- Investigate: `packages/spa-guard/src/common/reload.ts`
- Investigate: `packages/spa-guard/src/common/retryState.ts`
- Investigate: `packages/spa-guard/src/runtime/debug/errorDispatchers.ts`
- Investigate: `packages/spa-guard/src/common/listen/internal.ts`

- [x] reproduce the bug scenario in tests: debug-panel-triggered ChunkLoadError during an active retry cycle
- [x] identify root cause: check if `clearRetryStateFromUrl()` is called at wrong times, or if debug dispatchers interfere with retry state, or if multiple error handlers fire for a single dispatch
- [x] fix the root cause (likely guard against URL param clearing during active retry, or dedup error handling)
- [x] add logger trace messages for retry state transitions if not already present
- [x] write regression tests covering the exact failure scenario
- [x] run project test suite - must pass before task 2

### Task 2: Move version check to runtime, consider renaming common to core

**Files:**

- Modify: `packages/spa-guard/src/runtime/index.ts`
- Modify: `packages/spa-guard/src/common/index.ts`
- Modify: `packages/spa-guard/src/common/checkVersion.ts`
- Possibly rename: `packages/spa-guard/src/common/` -> `packages/spa-guard/src/core/`

- [ ] evaluate renaming `common/` to `core/` - check all import paths, tsup entry points, package.json exports; decide go/no-go based on scope
- [ ] if renaming: update all imports, tsup configs, and package.json exports map
- [ ] move `startVersionCheck` and `stopVersionCheck` exports from `common/index.ts` to `runtime/index.ts`
- [ ] update package.json exports if needed (the `./runtime` entry)
- [ ] update README.md API reference to reflect new import path
- [ ] write/update tests confirming runtime exports include version check functions
- [ ] run project test suite - must pass before task 3

### Task 3: Add visibility-based version check pausing

Pause version polling when the browser tab is hidden (Page Visibility API). Resume on tab focus. If time since last check exceeds the poll interval, check immediately on resume; otherwise wait for the remaining interval.

**Files:**

- Modify: `packages/spa-guard/src/common/checkVersion.ts`
- Modify: `packages/spa-guard/src/common/logger.ts` (add log methods for pause/resume)

- [ ] add `document.visibilitychange` listener inside `startVersionCheck()`
- [ ] on hidden: clear the polling interval, record timestamp of last check
- [ ] on visible: calculate elapsed time since last check; if >= interval, fetch immediately then restart interval; if < interval, set a one-shot timeout for the remaining time then restart interval
- [ ] add Logger methods: `versionCheckPaused()`, `versionCheckResumed()`, `versionCheckResumedImmediate()`
- [ ] clean up visibility listener in `stopVersionCheck()`
- [ ] write tests: mock `document.visibilityState` and `visibilitychange` events to verify pause/resume/immediate-check behavior
- [ ] run project test suite - must pass before task 4

### Task 4: Auto-generate version in Vite plugin

If `options.version` is not provided, generate a `crypto.randomUUID()` and use it as the version. This makes the plugin work with zero configuration.

**Files:**

- Modify: `packages/spa-guard/src/vite-plugin/index.ts`

- [ ] in `spaGuardVitePlugin()`, if `options.version` is not provided, generate via `crypto.randomUUID()`
- [ ] remove the existing logic that reads version from `package.json` (or make it a fallback chain: user-provided > auto-UUID)
- [ ] update README.md to document that version is auto-generated if not specified
- [ ] write tests for the Vite plugin covering: no version provided (UUID generated), explicit version provided (used as-is)
- [ ] run project test suite - must pass before task 5

### Task 5: Add recommendedSetup() to runtime

A convenience function that enables version checking with sensible defaults and any other recommended runtime configuration. It uses the same public API functions, just pre-configured.

**Files:**

- Create: `packages/spa-guard/src/runtime/recommendedSetup.ts`
- Modify: `packages/spa-guard/src/runtime/index.ts`

- [ ] implement `recommendedSetup(overrides?)` that calls `startVersionCheck()` with sensible defaults
- [ ] export from `runtime/index.ts`
- [ ] update README.md with usage example
- [ ] write tests for `recommendedSetup()` verifying it calls the right functions with defaults
- [ ] run project test suite - must pass before task 6

### Task 6: Unify fallback HTML across all implementations

Currently there are 3 different fallback UIs: the generated HTML string (used in `reload.ts` for non-React), the `DefaultErrorFallback` React component, and the react-router error boundary inline JSX. Unify to use the same HTML template everywhere (in React via `dangerouslySetInnerHTML`).

**Files:**

- Modify: `packages/spa-guard/src/common/DefaultErrorFallback.tsx`
- Modify: `packages/spa-guard/src/react-error-boundary/index.tsx`
- Modify: `packages/spa-guard/src/react-router/index.tsx`
- Reference: `packages/spa-guard/src/common/fallbackHtml.generated.ts`

- [ ] refactor `DefaultErrorFallback` to render the `defaultFallbackHtml` string via `dangerouslySetInnerHTML` instead of custom JSX
- [ ] ensure the HTML template supports all needed states (retrying with attempt count, error with reload button)
- [ ] update the react-router error boundary default fallback to use the same HTML
- [ ] update `fallback.html` source template if it needs additional states (retry indicator)
- [ ] regenerate `fallbackHtml.generated.ts` via `pnpm generate:fallback`
- [ ] write/update tests verifying all three fallback paths render the same HTML structure
- [ ] run project test suite - must pass before task 7

### Task 7: Update AGENTS.md with inline rebuild instructions

**Files:**

- Modify: `AGENTS.md`

- [ ] add section: after any change to core/common code that could affect inline scripts, agents must run `pnpm build:inline` and `pnpm build:inline-trace`
- [ ] add instruction: check the build output for inline script sizes and update README.md bundle size table accordingly
- [ ] run project test suite - must pass before task 8

### Task 8: Delete revise.txt and verify

**Files:**

- Delete: `revise.txt`

- [ ] delete `revise.txt` from repo root
- [ ] verify all tasks from revise.txt are captured in this plan

### Task 9: Verify acceptance criteria

- [ ] run full test suite: `pnpm test` from spa-guard package
- [ ] run linter: `pnpm lint` or `pnpm datamitsu check`
- [ ] run typecheck: `pnpm typecheck`
- [ ] verify test coverage meets 80%+
- [ ] rebuild inline scripts and confirm sizes are updated in README

### Task 10: Update documentation

- [ ] update README.md if user-facing changes (new runtime exports, recommendedSetup, auto-version)
- [ ] update CLAUDE.md if internal patterns changed
- [ ] move this plan to `docs/plans/completed/`
