# React Debug Test Panel - @ovineko/spa-guard/react/debug

## Overview

Create a `DebugTestPanel` React component exported as a separate entry point `@ovineko/spa-guard/react/debug`. The panel lets developers simulate error scenarios (ChunkLoadError, network timeout, runtime error) and observe how spa-guard handles them, including event history and state display.

## Context

- Files involved: `src/react/debug/`, `package.json`, `tsup.config.ts`
- Related patterns: existing `./react`, `./react-error-boundary` export structure; `useSPAGuardEvents`, `useSpaGuardState` hooks; inline styles (no CSS deps)
- Dependencies: React (peer dep, already configured)

## Development Approach

- **Testing approach**: Code first, then tests
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Add export entry point and build config

**Files:**

- Modify: `packages/spa-guard/package.json`
- Modify: `packages/spa-guard/tsup.config.ts`
- Create: `packages/spa-guard/src/react/debug/index.tsx` (stub export)

- [x] Add `"./react/debug"` export to package.json pointing to `dist/react/debug/index.js` and `dist/react/debug/index.d.ts`
- [x] Add `src/react/debug/index.tsx` entry to tsup.config.ts
- [x] Create stub `src/react/debug/index.tsx` that exports a placeholder `DebugTestPanel` component
- [x] Run build to verify the new entry point compiles and resolves correctly
- [x] Run existing test suite to verify no regressions

### Task 2: Implement error simulation utilities

**Files:**

- Create: `packages/spa-guard/src/react/debug/errorSimulators.ts`

- [x] Implement `simulateChunkLoadError()` - triggers a dynamic import to a nonexistent module
- [x] Implement `simulateNetworkTimeout()` - rejects with a network-like error after a short delay
- [x] Implement `simulateRuntimeError()` - throws synchronously in a way React error boundary catches
- [x] Implement `simulateFinallyError()` - promise that throws in `.finally()`
- [x] Write tests for each simulator function in `errorSimulators.test.ts`
- [x] Run test suite - must pass before task 3

### Task 3: Implement DebugTestPanel component

**Files:**

- Modify: `packages/spa-guard/src/react/debug/index.tsx`

- [x] Implement panel UI with inline styles: fixed-position overlay, header with toggle, error scenario buttons
- [x] Wire buttons to error simulator functions from task 2
- [x] Add button visual states (default, loading, triggered) using local component state
- [x] Add `position` prop (`top-left` | `top-right` | `bottom-left` | `bottom-right`, default `bottom-right`)
- [x] Add `defaultOpen` prop (boolean, default `true`)
- [x] Add `onErrorTriggered` callback prop
- [x] Write tests: renders in each position, toggle open/close, buttons call simulators, callback fires
- [x] Run test suite - must pass before task 4

### Task 4: Add event history and state display

**Files:**

- Modify: `packages/spa-guard/src/react/debug/index.tsx`

- [x] Use `useSPAGuardEvents` hook to collect events into a scrollable history list
- [x] Use `useSpaGuardState` hook to display current spa-guard state (attempt, isWaiting, isFallbackShown)
- [x] Add clear history button
- [x] Add timestamps to event entries via `Date.now()` and `toLocaleTimeString()`
- [x] Write tests: events appear in history, state section updates, clear button works
- [x] Run test suite - must pass before task 5

### Task 5: Delete TODO.md

**Files:**

- Delete: `packages/spa-guard/TODO.md`

- [ ] Remove `packages/spa-guard/TODO.md` from the repo

### Task 6: Verify acceptance criteria

- [ ] Manual test: import `DebugTestPanel` from `@ovineko/spa-guard/react/debug` in a consumer context and verify it renders
- [ ] Run full test suite (`pnpm test` in packages/spa-guard)
- [ ] Run linter (`pnpm lint` in packages/spa-guard)
- [ ] Run typecheck (`pnpm typecheck` in packages/spa-guard)
- [ ] Verify test coverage meets 80%+

### Task 7: Update documentation

- [ ] Update `packages/spa-guard/README.md` with react/debug usage section
- [ ] Update `CLAUDE.md` if any new internal patterns were introduced
- [ ] Move this plan to `docs/plans/completed/`
