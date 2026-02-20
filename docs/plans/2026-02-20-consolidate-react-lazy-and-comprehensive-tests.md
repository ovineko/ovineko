# Consolidate react-lazy and Add Comprehensive Test Coverage

## Overview

Stabilize the `@ovineko/spa-guard` package by:

1. **Consolidating react-lazy module** into the main react module (breaking change - single export point)
2. **Adding comprehensive test coverage** for all modules, exported APIs, internal logic, and state management

**Problem it solves:**

- Current separation of react-lazy feels artificial - both modules are React-specific
- Lack of test coverage (~77 tests only for `isChunkError` and `retryImport`) makes future optimization risky
- Need to lock down current behavior before performance improvements

**Key benefits:**

- Simpler API: single import path for all React functionality
- Comprehensive test suite ensures safe refactoring
- Documented behavior via tests for all edge cases

## Context (from discovery)

**Current structure:**

- `./react` exports: `useSpaGuardState` hook
- `./react-lazy` exports: `lazyWithRetry` function + `LazyRetryOptions` type
- Existing tests: 21 for isChunkError, 39 for retryImport/lazy retry, 17 for lazyWithRetry = ~77 total

**Modules needing test coverage:**

- ❌ `react-error-boundary/ErrorBoundary` (core component)
- ❌ `react-router/ErrorBoundaryReactRouter` (React Router integration)
- ❌ `runtime/state.ts` (state management and subscriptions)
- ❌ `react/useSpaGuardState` (hook - only tested indirectly)
- ❌ `common/handleErrorWithSpaGuard` (error routing logic)
- ❌ `common/reload.ts` (page reload orchestration)
- ❌ `common/listen/internal.ts` (global error listeners)
- ❌ `common/retryState.ts` (URL state encoding/decoding)
- ❌ `common/sendBeacon.ts` (beacon sending)
- ❌ `common/shouldIgnore.ts` (error filtering)
- ❌ `common/lastReloadTime.ts` (retry state persistence)
- ❌ `schema/parse.ts` (beacon parsing)
- ❌ `fastify/index.ts` (server-side plugin)

**Dependencies:**

- Testing framework: Vitest 4.0.18 with happy-dom
- React Testing Library for component tests
- Mock patterns already established in existing tests

## Development Approach

- **Testing approach**: Regular (code first, then tests - since code already works)
- Complete each task fully before moving to the next
- Make small, focused changes
- **CRITICAL: every task MUST include new/updated tests** for code changes in that task
  - tests are not optional - they are a required part of the checklist
  - write unit tests for new functions/methods
  - write unit tests for modified functions/methods
  - add new test cases for new code paths
  - update existing test cases if behavior changes
  - tests cover both success and error scenarios
- **CRITICAL: all tests must pass before starting next task** - no exceptions
- **CRITICAL: update this plan file when scope changes during implementation**
- Run tests after each change
- Maintain backward compatibility (except for the react-lazy → react consolidation which is intentionally breaking)

## Testing Strategy

- **Unit tests**: required for every module
  - Test exported functions/components in isolation
  - Test internal logic with controlled inputs
  - Mock external dependencies (window, DOM, events)
  - Use fake timers for async/retry logic
  - Aim for 80%+ coverage per module
- **Integration tests**: for cross-module interactions
  - Event system: emit event → verify state update → verify subscriber notification
  - Error flow: trigger error → verify retry → verify reload
  - React integration: component error → ErrorBoundary → fallback UI
- **Edge case coverage**:
  - Race conditions (multiple errors, rapid retries)
  - Boundary values (max attempts, timeout edge cases)
  - Invalid inputs (malformed options, missing config)
  - Browser API failures (localStorage unavailable, beacon fails)

## Progress Tracking

- Mark completed items with `[x]` immediately when done
- Add newly discovered tasks with ➕ prefix
- Document issues/blockers with ⚠️ prefix
- Update plan if implementation deviates from original scope
- Keep plan in sync with actual work done

## What Goes Where

- **Implementation Steps** (`[ ]` checkboxes): tasks achievable within this codebase - code changes, tests, documentation updates
- **Post-Completion** (no checkboxes): items requiring external action - manual testing, changes in consuming projects, deployment configs

## Implementation Steps

### Task 1: Consolidate react-lazy into react module

- [x] Move `src/react-lazy/index.tsx` → `src/react/lazyWithRetry.tsx`
- [x] Move `src/react-lazy/types.ts` → `src/react/types.ts` (merge with existing if present)
- [x] Update `src/react/index.tsx` to export `lazyWithRetry` and `LazyRetryOptions`
- [x] Delete empty `src/react-lazy/` directory
- [x] Update `package.json` exports: remove `./react-lazy`, add exports to `./react`
- [x] Verify tsconfig.json doesn't need changes (should auto-detect structure)
- [x] Update test imports: `src/react-lazy/*.test.tsx` files to import from `../react`
- [x] Move test files: `src/react-lazy/*.test.tsx` → `src/react/*.test.tsx`
- [x] Run existing tests - must pass before next task

### Task 2: Add tests for runtime state management

- [x] Create `src/runtime/state.test.ts`
- [x] Write tests for `getState()` initial state (success case)
- [x] Write tests for `subscribeToState()` subscription lifecycle (subscribe, notify, unsubscribe)
- [x] Write tests for event-driven state updates (fallback-ui-shown, retry-attempt, retry-exhausted)
- [x] Write tests for URL initialization (getRetryStateFromUrl integration)
- [x] Write tests for multiple subscribers receiving same update
- [x] Write tests for edge cases (unsubscribe during callback, invalid event data)
- [x] Run project tests - must pass before next task

### Task 3: Add tests for useSpaGuardState hook

- [x] Create `src/react/useSpaGuardState.test.tsx`
- [x] Write tests for initial hook state (matches runtime state)
- [x] Write tests for state updates when runtime state changes (event emission → state update → component re-render)
- [x] Write tests for subscription cleanup on unmount
- [x] Write tests for multiple components using same hook (shared state)
- [x] Write tests for edge cases (unmount before first update, rapid state changes)
- [x] Run project tests - must pass before next task

### Task 4: Add tests for ErrorBoundary component

- [x] Create `src/react-error-boundary/ErrorBoundary.test.tsx`
- [x] Write tests for basic error catching (child throws → fallback rendered)
- [x] Write tests for chunk error detection (isChunkError prop in FallbackProps)
- [x] Write tests for auto-retry on chunk errors (autoRetryChunkErrors option)
- [x] Write tests for resetError functionality (error cleared → children re-render)
- [x] Write tests for resetKeys triggering reset
- [x] Write tests for custom fallback components (fallback, fallbackRender props)
- [x] Write tests for onError callback invocation
- [x] Write tests for sendBeaconOnError integration
- [x] Write tests for FallbackProps passed to fallbackRender (all fields present and correct)
- [x] Write tests for edge cases (no fallback provided, error in fallback, error during reset)
- [x] Run project tests - must pass before next task

### Task 5: Add tests for ErrorBoundaryReactRouter component

- [x] Create `src/react-router/ErrorBoundaryReactRouter.test.tsx`
- [x] Write tests for useRouteError integration (route error → fallback rendered)
- [x] Write tests for chunk error detection in route errors
- [x] Write tests for auto-retry on route chunk errors
- [x] Write tests for custom fallback with route error context
- [x] Write tests for resetError navigation behavior
- [x] Write tests for edge cases (no route error, non-Error objects)
- [x] Run project tests - must pass before next task

### Task 6: Add tests for handleErrorWithSpaGuard

- [x] Create `src/common/handleErrorWithSpaGuard.test.ts`
- [x] Write tests for chunk error → attemptReload path
- [x] Write tests for non-chunk error → sendBeacon path
- [x] Write tests for ignored errors → no action taken
- [x] Write tests for error serialization before passing to reload/beacon
- [x] Write tests for event emission on error handling
- [x] Write tests for edge cases (null error, Error without message, non-Error objects)
- [x] Run project tests - must pass before next task

### Task 7: Add tests for reload orchestration

- [x] Create `src/common/reload.test.ts`
- [x] Write tests for basic reload cycle (attempt 0 → delay → reload)
- [x] Write tests for retry attempt incrementation in URL
- [x] Write tests for max attempts exceeded → fallback shown
- [x] Write tests for retry reset logic (enableRetryReset + minTimeBetweenResets)
- [x] Write tests for retry ID generation and persistence
- [x] Write tests for fallback HTML injection
- [x] Write tests for event emissions (retry-attempt, retry-exhausted, retry-reset, fallback-ui-shown)
- [x] Write tests for edge cases (no reloadDelays, invalid URL params, window.location.reload failure)
- [x] Run project tests - must pass before next task

### Task 8: Add tests for global error listeners

- [x] Create `src/common/listen/internal.test.ts`
- [x] Write tests for window.error listener (sync errors captured)
- [x] Write tests for unhandledrejection listener (promise rejections captured)
- [x] Write tests for securitypolicyviolation listener (CSP errors captured)
- [x] Write tests for vite:preloadError listener (Vite chunk errors captured)
- [x] Write tests for chunk error → handleErrorWithSpaGuard integration
- [x] Write tests for listener cleanup on unlisten()
- [x] Write tests for edge cases (listener called with missing data, multiple listeners, listener errors)
- [x] Run project tests - must pass before next task

### Task 9: Add tests for URL state management

- [x] Create `src/common/retryState.test.ts`
- [x] Write tests for getRetryStateFromUrl parsing (valid params)
- [x] Write tests for setRetryStateToUrl encoding (new URL params)
- [x] Write tests for retry ID preservation across reload
- [x] Write tests for retry attempt incrementation
- [x] Write tests for fallback state (attempt = -1)
- [x] Write tests for edge cases (malformed URL params, missing params, NaN values)
- [x] Run project tests - must pass before next task

### Task 10: Add tests for sendBeacon

- [x] Create `src/common/sendBeacon.test.ts`
- [x] Write tests for beacon endpoint construction (reportBeacon.endpoint option)
- [x] Write tests for beacon payload structure (error, userAgent, timestamp, etc.)
- [x] Write tests for navigator.sendBeacon invocation
- [x] Write tests for fetch fallback when sendBeacon unavailable
- [x] Write tests for error serialization integration
- [x] Write tests for edge cases (no endpoint configured, sendBeacon fails, network offline)
- [x] Run project tests - must pass before next task

### Task 11: Add tests for error filtering

- [x] Create `src/common/shouldIgnore.test.ts`
- [x] Write tests for ignoredErrors pattern matching (exact match)
- [x] Write tests for ignoredErrors substring matching
- [x] Write tests for case-insensitive matching
- [x] Write tests for empty ignoredErrors array (nothing ignored)
- [x] Write tests for edge cases (null error message, Error without message, non-Error objects)
- [x] Run project tests - must pass before next task

### Task 12: Add tests for lastReloadTime persistence

- [x] Create `src/common/lastReloadTime.test.ts`
- [x] Write tests for getLastReloadTime from sessionStorage
- [x] Write tests for setLastReloadTime to sessionStorage
- [x] Write tests for time-since-reload calculation
- [x] Write tests for edge cases (sessionStorage unavailable, invalid stored value, NaN timestamps)
- [x] Run project tests - must pass before next task

### Task 13: Add tests for beacon schema parsing

- [x] Create `src/schema/parse.test.ts`
- [x] Write tests for valid beacon parsing (all required fields)
- [x] Write tests for invalid beacon rejection (missing fields, wrong types)
- [x] Write tests for optional field handling
- [x] Write tests for BeaconSchema typebox validation integration
- [x] Write tests for edge cases (null body, empty object, extra fields)
- [x] Run project tests - must pass before next task

### Task 14: Add tests for Fastify plugin

- [x] Create `src/fastify/fastifySPAGuard.test.ts`
- [x] Write tests for plugin registration (route created at specified path)
- [x] Write tests for valid beacon POST → onBeacon callback invoked
- [x] Write tests for invalid beacon POST → onUnknownBeacon callback invoked
- [x] Write tests for beacon parsing integration (schema validation)
- [x] Write tests for response handling (200 OK, custom responses from callbacks)
- [x] Write tests for edge cases (missing callbacks, callback throws error, malformed JSON body)
- [x] Run project tests - must pass before next task

### Task 15: Integration tests for event system

- [x] Create `src/common/events/internal.test.ts`
- [x] Write tests for emit → all subscribers notified
- [x] Write tests for multiple subscribers to same event
- [x] Write tests for unsubscribe stops notifications
- [x] Write tests for event data passed correctly to subscribers
- [x] Write tests for edge cases (no subscribers, subscriber throws error, unsubscribe during emit)
- [x] Run project tests - must pass before next task

### Task 16: Integration tests for end-to-end error flow

- [x] Create `test/integration/error-flow.test.tsx`
- [x] Write test: chunk error in lazy component → retry → success
- [x] Write test: chunk error in lazy component → retry exhausted → reload
- [x] Write test: chunk error in ErrorBoundary → auto-retry → success
- [x] Write test: non-chunk error → beacon sent
- [x] Write test: max retries → fallback UI shown
- [x] Write test: retry reset after minTimeBetweenResets
- [x] Run project tests - must pass before next task

### Task 17: Verify acceptance criteria

- [x] Verify react-lazy consolidated into react module (single export point)
- [x] Verify all existing tests still pass (~77 original tests)
- [x] Verify new tests cover all previously untested modules (14+ new test files)
- [x] Run full test suite (unit tests) - all must pass
- [x] Run linter - all issues must be fixed
- [x] Verify test coverage meets 80%+ standard (run coverage report)
- [x] Verify edge cases are handled (documented in tests)

### Task 18: [Final] Update documentation

- [x] Update README.md with breaking change notice (react-lazy → react)
- [x] Add migration guide for consumers (import path changes)
- [x] Update any internal docs referencing react-lazy module structure

_Note: ralphex automatically moves completed plans to `docs/plans/completed/`_

## Technical Details

### Module Consolidation Changes

**Before:**

```typescript
// package.json exports
"./react": "./dist/react/index.js"
"./react-lazy": "./dist/react-lazy/index.js"

// Consumer usage
import { useSpaGuardState } from '@ovineko/spa-guard/react'
import { lazyWithRetry } from '@ovineko/spa-guard/react-lazy'
```

**After:**

```typescript
// package.json exports
"./react": "./dist/react/index.js"
// ./react-lazy removed

// Consumer usage (breaking change)
import { useSpaGuardState, lazyWithRetry } from '@ovineko/spa-guard/react'
```

### File Moves

```
src/react-lazy/index.tsx → src/react/lazyWithRetry.tsx
src/react-lazy/types.ts → src/react/types.ts (merge)
src/react-lazy/*.test.tsx → src/react/*.test.tsx
```

### Test Coverage Targets

- **Minimum coverage**: 80% per module
- **Critical paths**: 100% coverage for error handling, retry logic, state management
- **Edge cases**: All identified edge cases must have dedicated tests

### Testing Patterns

**For components (ErrorBoundary, hooks):**

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

// Use React Testing Library + Vitest mocks
// Example: test ErrorBoundary with throwing child
```

**For async logic (reload, retry):**

```typescript
vi.useFakeTimers()
// ... trigger async action
vi.advanceTimersByTime(1000)
await waitFor(() => expect(...))
vi.useRealTimers()
```

**For browser APIs:**

```typescript
vi.spyOn(window.navigator, "sendBeacon").mockImplementation(() => true);
vi.spyOn(window.location, "reload").mockImplementation(() => {});
```

### Event System Integration Points

All modules interact through events:

```typescript
// Event emission
emit({ name: "retry-attempt", attempt: 1, delay: 1000, retryId: "abc" })

// State update
runtime/state.ts subscribes → updates state

// React component update
useSpaGuardState() subscribes to state → triggers re-render
```

## Post-Completion

_Items requiring manual intervention or external systems - no checkboxes, informational only_

**Breaking change migration:**
Consuming projects must update imports:

```typescript
// OLD (will break after upgrade)
import { lazyWithRetry } from "@ovineko/spa-guard/react-lazy";

// NEW (required after upgrade)
import { lazyWithRetry } from "@ovineko/spa-guard/react";
```

**Manual verification:**

- Test in a real browser with network throttling (chunk load failures)
- Verify reload cycles work correctly with real navigation
- Test beacon endpoint receives correct payloads in production-like setup

**Documentation updates:**

- CHANGELOG.md with breaking change notice
- GitHub release notes with migration guide
