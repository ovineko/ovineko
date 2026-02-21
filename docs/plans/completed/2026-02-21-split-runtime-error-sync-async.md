# Split Runtime Error into Sync and Async Debug Variants

## Overview

Split the debug panel's "Runtime Error" button into two: "Sync Runtime Error" (throws during React render, caught by Error Boundary) and "Async Runtime Error" (current setTimeout-based throw, caught by window.error only). Add a DebugSyncErrorTrigger React component that bridges the vanilla debug panel with React Error Boundary via CustomEvent. Delete revise.txt.

## Context

- Files involved: `packages/spa-guard/src/runtime/debug/errorDispatchers.ts`, `packages/spa-guard/src/runtime/debug/index.ts`, `packages/spa-guard/src/common/constants.ts`, `packages/spa-guard/src/react/`
- Related patterns: Symbol-keyed DI on window, fire-and-forget dispatching, CustomEvent for cross-framework signaling
- Dependencies: React (for DebugSyncErrorTrigger only, tree-shakeable)

## How sync Error Boundary catching works

React Error Boundaries only catch errors thrown during rendering. The vanilla debug panel cannot throw into React's render cycle directly. The approach:

1. `dispatchSyncRuntimeError()` fires a CustomEvent on window
2. `DebugSyncErrorTrigger` (a React component placed inside ErrorBoundary) listens for this event, sets state, and throws the error during its next render
3. ErrorBoundary catches the render-phase throw via getDerivedStateFromError

## Development Approach

- **Testing approach**: Code first, then tests
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Add sync dispatcher and rename async dispatcher

**Files:**

- Modify: `packages/spa-guard/src/common/constants.ts`
- Modify: `packages/spa-guard/src/runtime/debug/errorDispatchers.ts`

- [x] Add `debugSyncErrorEventType` constant to constants.ts (string, not Symbol, since CustomEvent needs string type)
- [x] Rename `dispatchRuntimeError()` to `dispatchAsyncRuntimeError()` (keep setTimeout behavior)
- [x] Add `dispatchSyncRuntimeError()` that fires `new CustomEvent(debugSyncErrorEventType, { detail: { error } })` on window
- [x] Update tests in errorDispatchers.test.ts: rename test for async, add test for sync (verify CustomEvent fires with correct detail)
- [x] Run test suite

### Task 2: Add DebugSyncErrorTrigger React component

**Files:**

- Create: `packages/spa-guard/src/react/DebugSyncErrorTrigger.tsx`
- Modify: `packages/spa-guard/src/react/index.tsx` (add export)

- [x] Implement DebugSyncErrorTrigger: useEffect subscribes to CustomEvent, useState stores pending error, throws error during render if set
- [x] Export from react/index.tsx
- [x] Write tests: verify component throws on event dispatch, verify ErrorBoundary catches the thrown error, verify cleanup removes listener
- [x] Run test suite

### Task 3: Update debug panel buttons

**Files:**

- Modify: `packages/spa-guard/src/runtime/debug/index.ts`

- [x] Update SCENARIOS array: replace single runtime-error entry with two entries: `{ key: "sync-runtime-error", label: "Sync Runtime Error", dispatch: dispatchSyncRuntimeError }` and `{ key: "async-runtime-error", label: "Async Runtime Error", dispatch: dispatchAsyncRuntimeError }`
- [x] Update import from errorDispatchers
- [x] Update tests in index.test.ts: verify 5 buttons rendered, test both new button clicks
- [x] Run test suite

### Task 4: Delete revise.txt

**Files:**

- Delete: `revise.txt`

- [x] Delete revise.txt from repo root

### Task 5: Verify acceptance criteria

- [x] Run full test suite (pnpm test in packages/spa-guard)
- [x] Run linter (pnpm lint in packages/spa-guard)
- [x] Run typecheck (pnpm typecheck in packages/spa-guard)
- [x] Verify test coverage meets 80%+

### Task 6: Update documentation

- [x] Update packages/spa-guard/README.md: document DebugSyncErrorTrigger usage (place inside ErrorBoundary), updated 5-button list in debug panel section
- [x] Update CLAUDE.md if internal patterns changed
- [x] Move this plan to `docs/plans/completed/`
