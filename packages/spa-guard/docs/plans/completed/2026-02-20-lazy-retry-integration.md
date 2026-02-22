# Lazy Retry Integration

## Overview

Adding `lazyWithRetry` functionality to the `spa-guard` package for automatic retry of dynamic module imports before a full page reload.

**Problem:** The current spa-guard implementation does a full page reload on any chunk error, which causes disruption for the user (state loss, UI reset).

**Solution:** Two-level retry strategy:

1. **Level 1 (new):** Retry of the individual module via repeated `import()` with delays
2. **Level 2 (existing):** If all attempts fail → call `attemptReload()` for a full page reload

**Key benefits:**

- Less disruption for the user (module can load without a page reload)
- Tight integration with the existing spa-guard retry logic
- Consistent API with existing options (delay array)
- Flexible configuration via global options + per-import override

## Context

**Inspiration:** [Uniswap lazyWithRetry.ts](https://github.com/Uniswap/interface/blob/55c403afe7f2f9e356d42c58180f455aa70f1a3c/apps/web/src/utils/lazyWithRetry.ts)

**Existing spa-guard architecture:**

- `/src/common/reload.ts` - `attemptReload()` logic with retry tracking via URL parameters
- `/src/common/options.ts` - global options via `window.__SPA_GUARD_OPTIONS__`
- `/src/common/retryState.ts` - retry state management (retryId, retryAttempt)
- `/src/common/isChunkError.ts` - chunk/module load error detection
- `/src/common/events/` - event system for tracking retry events
- `/src/react/index.tsx` - React hooks for subscribing to state

**Current options:**

```typescript
interface Options {
  reloadDelays?: number[]; // [1000, 2000, 5000] - for page reload
  useRetryId?: boolean; // true - cache busting
  enableRetryReset?: boolean; // true - smart retry reset
  minTimeBetweenResets?: number; // 5000ms - protection against loops
  fallback?: { html; selector };
  reportBeacon?: { endpoint };
  ignoredErrors?: string[];
}
```

## Development Approach

**Iterative development in 3 phases:**

### Phase 1: Core Implementation (without tests)

- Implement basic `lazyWithRetry` functionality
- Integrate with `attemptReload()`
- Add options to `window.__SPA_GUARD_OPTIONS__.lazyRetry`
- Manual verification in browser at each step

### Phase 2: Test Coverage (after verifying functionality)

- Write unit tests for all functions
- Cover success/error cases
- Integration tests with `attemptReload()`
- Achieve 80%+ coverage

### Phase 3: Polish & Optimization (final refinement)

- Edge case handling
- TypeScript types polish
- Performance optimizations (if needed)
- Documentation updates

**⚠️ CRITICALLY IMPORTANT:**

- Each task is completed fully before moving to the next one
- Phase 1 tasks are verified manually in the browser
- Do NOT move to Phase 2 until the functionality works correctly

## Testing Strategy

**Phase 1 (current):** Manual testing in browser

- Verification via DevTools Network tab (throttling, offline mode)
- Verification of retry delays via console.log
- Verification of fallback to attemptReload via URL parameters

**Phase 2:** Automated tests (to be implemented later)

- Unit tests for retry logic
- Integration tests with mock import()
- React component tests with error simulation

**Phase 3:** Edge cases

- CSP violations
- Network offline/online transitions
- Concurrent retry attempts
- React Suspense integration

## Progress Tracking

- Mark completed tasks with `[x]` immediately upon completion
- Add new tasks with ➕ if discovered during implementation
- Document blockers with ⚠️
- Update the plan if the scope changes

## Implementation Steps

### Phase 1: Core Implementation

#### Task 1: Add new options to Options interface

- [x] Open [src/common/options.ts](../src/common/options.ts)
- [x] Add `lazyRetry?: { retryDelays?: number[]; callReloadOnFailure?: boolean; }` to `Options` interface
- [x] Add JSDoc comments for new fields
- [x] Update `defaultOptions` with default values: `lazyRetry: { retryDelays: [1000, 2000], callReloadOnFailure: true }`
- [x] Update merge logic in `getOptions()` for correct merging of nested `lazyRetry` object (analogous to `fallback`)
- [x] Verify in browser via `console.log(getOptions().lazyRetry)`

#### Task 2: Create utility for retry with exponential backoff

- [x] Create file [src/common/retryImport.ts](../src/common/retryImport.ts)
- [x] Implement function `retryImport<T>(importFn: () => Promise<T>, delays: number[]): Promise<T>`
- [x] Logic: attempt import → if error and delays remain → setTimeout with delay → retry
- [x] Return a promise that resolves on success or rejects after exhausting all attempts
- [x] Add optional `onRetry?: (attempt: number, delay: number) => void` callback for logging
- [x] Verify in browser with mock import function

#### Task 3: Integrate retryImport with attemptReload on final failure

- [x] In [src/common/retryImport.ts](../src/common/retryImport.ts) add check for `callReloadOnFailure` from options
- [x] After final reject in `retryImport` check `isChunkError(error)` (import from [src/common/isChunkError.ts](../src/common/isChunkError.ts))
- [x] If it's a chunk error and `callReloadOnFailure === true` → call `attemptReload(error)` from [src/common/reload.ts](../src/common/reload.ts)
- [x] Ensure the error still propagates (throw) after calling attemptReload
- [x] Verify in browser: lazy import failure should trigger page reload

#### Task 4: Create React lazyWithRetry function

- [x] Create file [src/react-lazy/index.tsx](../src/react-lazy/index.tsx) (new directory)
- [x] Import `React.lazy` and types `ComponentType`, `LazyExoticComponent`
- [x] Create `lazyWithRetry<T extends ComponentType<any>>(importFn, options?)` function
- [x] Accept `options?: { retryDelays?: number[] }` for per-import override
- [x] Inside, get global options via `getOptions().lazyRetry`
- [x] Merge per-import options with global ones (per-import takes priority)
- [x] Return `React.lazy(() => retryImport(importFn, mergedDelays))`
- [x] Export TypeScript types for options

#### Task 5: Add export to package.json

- [x] Open [package.json](../package.json) at the root of the spa-guard package
- [x] Add new entry point to `exports`: `"./react-lazy": "./dist/react-lazy/index.js"`
- [x] Add corresponding TypeScript types export: `"./react-lazy": "./dist/react-lazy/index.d.ts"`
- [x] Verify that tsup configuration includes the new directory in build

#### Task 6: Update tsup configuration

- [x] Open [tsup.config.ts](../tsup.config.ts)
- [x] Add `src/react-lazy/index.tsx` to entry points array
- [x] Ensure `splitting: true` and `dts: true` are enabled
- [x] Run `pnpm build` and verify that `dist/react-lazy/` is created
- [x] Verify that `.d.ts` types are generated correctly

#### Task 7: Create usage example and verify in browser

- [x] Create a test React component in the project root for verification (temporary file)
- [x] Use `lazyWithRetry(() => import('./TestComponent'))` with global options
- [x] Use `lazyWithRetry(() => import('./TestComponent2'), { retryDelays: [500, 1500] })` with override
- [x] Open DevTools Network → set throttling to "Slow 3G"
- [x] Verify that retry attempts are visible in console (via onRetry callback)
- [x] Simulate failure of all attempts (offline mode) and verify that attemptReload is triggered (URL parameters `spaGuardRetryId`, `spaGuardRetryAttempt` should appear)
- [x] Delete the test file after verification

#### Task 8: Integrate with event system

- [x] Add new event types in [src/common/events/types.ts](../src/common/events/types.ts):
  - `lazy-retry-attempt` - module retry attempt
  - `lazy-retry-success` - successful load after retry
  - `lazy-retry-exhausted` - all attempts exhausted, attemptReload called
- [x] In [src/common/retryImport.ts](../src/common/retryImport.ts) use `emitEvent()` from [src/common/events/internal.ts](../src/common/events/internal.ts)
- [x] Emit events on each retry attempt, on success, and on failure
- [x] Verify in browser via event subscription

#### Task 9: Update TypeScript types and exports

- [x] Create [src/react-lazy/types.ts](../src/react-lazy/types.ts) with export of `LazyRetryOptions` interface
- [x] Export types from [src/react-lazy/index.tsx](../src/react-lazy/index.tsx)
- [x] Ensure types work correctly with React.ComponentType generics
- [x] Verify that IDE autocomplete works for the options parameter

---

### Phase 2: Test Coverage

**⚠️ DO NOT START until Phase 1 is complete and functionality is confirmed in browser**

#### Task 10: Configure test setup for react-lazy module

- [x] Create [src/react-lazy/retryImport.test.ts](../src/react-lazy/retryImport.test.ts)
- [x] Configure mock for `setTimeout` via `vi.useFakeTimers()`
- [x] Configure mock for `attemptReload` function
- [x] Create helper function for mock import with controllable fail/success

#### Task 11: Write unit tests for retryImport

- [x] Test: successful import on first attempt (without retry)
- [x] Test: successful import on second attempt (1 retry)
- [x] Test: all attempts fail → reject with last error
- [x] Test: retryDelays array is correctly applied (timing check via fake timers)
- [x] Test: onRetry callback is called with correct parameters (attempt number, delay)
- [x] Test: chunk error triggers attemptReload when callReloadOnFailure=true
- [x] Test: non-chunk error does NOT trigger attemptReload
- [x] Test: callReloadOnFailure=false does NOT call attemptReload even for chunk error
- [x] Run `pnpm test` - all tests should pass

#### Task 12: Write tests for lazyWithRetry

- [x] Create [src/react-lazy/lazyWithRetry.test.tsx](../src/react-lazy/lazyWithRetry.test.tsx)
- [x] Configure React Testing Library render
- [x] Test: successful lazy component load without retry
- [x] Test: successful load after retry attempt
- [x] Test: use global options when per-import options are not provided
- [x] Test: per-import options override global ones
- [x] Test: lazy component failure triggers error boundary + attemptReload
- [x] Run `pnpm test` - all tests should pass

#### Task 13: Write integration tests

- [x] Create [src/react-lazy/integration.test.tsx](../src/react-lazy/integration.test.tsx)
- [x] Test: sequence lazy retry → attemptReload → URL parameters updated
- [x] Test: events are emitted in correct order (lazy-retry-attempt → lazy-retry-exhausted)
- [x] Test: multiple parallel lazy imports with different retry delays
- [x] Test: React Suspense fallback is displayed during retry
- [x] Run `pnpm test` - all tests should pass

#### Task 14: Verify test coverage

- [x] Run `pnpm test:coverage`
- [x] Ensure coverage for `src/react-lazy/` >= 80%
- [x] Add missing tests for edge cases if coverage is low
- [x] Run final `pnpm test` - all tests should pass

---

### Phase 3: Polish & Optimization

**⚠️ DO NOT START until Phase 2 is complete and all tests pass**

#### Task 15: Handle edge cases

- [x] Add handling for import cancellation (component unmount during retry)
- [x] Add protection against memory leaks on unmount (clear timeouts)
- [x] Verify behavior with CSP violations
- [x] Verify behavior with network offline → online transitions
- [x] Update tests for edge cases
- [x] Run `pnpm test` - all tests should pass

#### Task 16: TypeScript types polish

- [x] Verify that all public API has JSDoc comments
- [x] Ensure generic types work correctly for all React component types
- [x] Add usage examples to JSDoc
- [x] Verify that there are no `any` types in the code
- [x] Run `pnpm typecheck` (if such a command exists) or verify in IDE

#### Task 17: Performance verification

- [x] Measure bundle size impact via `pnpm build` → check size of dist/react-lazy/
- [x] Ensure there are no unnecessary dependencies in bundle
- [x] Verify that tree-shaking works correctly (unused code is not included)
- [x] Optimize if bundle is too large (>2KB for this module)

#### Task 18: Documentation updates

- [x] Update [README.md](../README.md) with a section on `lazyWithRetry`
- [x] Add usage examples (basic, with options, with override)
- [x] Add section on integration with `attemptReload`
- [x] Update API reference with new options `window.__SPA_GUARD_OPTIONS__.lazyRetry`
- [x] Add migration guide if needed

#### Task 19: Final verification and linting

- [x] Run `pnpm lint` - fix all errors
- [x] Run full test suite: `pnpm test`
- [x] Run build: `pnpm build` - ensure there are no errors
- [x] Verify the final version in browser with production build
- [x] Verify that all files are formatted (prettier/eslint)

---

## Technical Details

### Retry logic architecture

```typescript
// Execution flow when using lazyWithRetry:

1. Component renders with <Suspense>
   ↓
2. React.lazy calls importFn via retryImport
   ↓
3. retryImport attempts import()
   ↓
4a. SUCCESS → resolve module → component renders

4b. FAILURE →
   ↓
   isChunkError?
   ↓
   YES: retry with delay from retryDelays[currentAttempt]
        - emit event: lazy-retry-attempt
        - setTimeout(delay)
        - try again (step 3)
        ↓
        All delays exhausted?
        ↓
        YES:
          - emit event: lazy-retry-exhausted
          - callReloadOnFailure? → attemptReload(error)
          - throw error → error boundary

   NO (not a chunk error): throw error immediately → error boundary
```

### Options structure

```typescript
interface Options {
  // ... existing options

  lazyRetry?: {
    /**
     * Array of delays in milliseconds for retry attempts of dynamic imports.
     * Each array element = one retry attempt with the specified delay.
     * Number of elements = number of retry attempts.
     *
     * @default [1000, 2000]
     * @example [500, 1500, 3000] // 3 attempts: 500ms, 1.5s, 3s
     */
    retryDelays?: number[];

    /**
     * Call attemptReload() after exhausting all retry attempts.
     * If true - page reload logic is triggered after all retryDelays fail.
     * If false - simply throw error to error boundary without reload.
     *
     * @default true
     */
    callReloadOnFailure?: boolean;
  };
}
```

### API Usage Examples

```typescript
// 1. Basic usage with global options
window.__SPA_GUARD_OPTIONS__ = {
  lazyRetry: {
    retryDelays: [1000, 2000],
    callReloadOnFailure: true,
  },
};

const LazyHome = lazyWithRetry(() => import('./pages/Home'));

// 2. Per-import override for a critical component
const LazyCheckout = lazyWithRetry(
  () => import('./pages/Checkout'),
  { retryDelays: [500, 1000, 2000, 4000] } // 4 attempts instead of 2
);

// 3. Disable reload for a non-critical component
const LazyOptionalWidget = lazyWithRetry(
  () => import('./widgets/Optional'),
  {
    retryDelays: [1000],
    callReloadOnFailure: false // only 1 retry, without page reload
  }
);

// 4. Usage in React component
function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <Suspense fallback={<Loading />}>
        <LazyHome />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### Event System Integration

```typescript
// New events:
type LazyRetryAttempt = {
  type: "lazy-retry-attempt";
  payload: {
    attempt: number; // attempt number (1-based)
    delay: number; // delay in ms
    totalAttempts: number; // total number of attempts
  };
};

type LazyRetrySuccess = {
  type: "lazy-retry-success";
  payload: {
    attemptNumber: number; // which attempt succeeded (1 = no retry)
  };
};

type LazyRetryExhausted = {
  type: "lazy-retry-exhausted";
  payload: {
    totalAttempts: number;
    willReload: boolean; // callReloadOnFailure value
  };
};

// Usage:
import { subscribe } from "@ovineko/spa-guard";

subscribe((event) => {
  if (event.type === "lazy-retry-attempt") {
    console.log(`Retry ${event.payload.attempt}/${event.payload.totalAttempts}`);
  }
});
```

### Files to Create/Modify

**Create:**

- `src/react-lazy/index.tsx` - main module with lazyWithRetry
- `src/react-lazy/types.ts` - TypeScript types
- `src/common/retryImport.ts` - utility for retry logic

**Modify:**

- `src/common/options.ts` - add lazyRetry options
- `src/common/events/types.ts` - add new event types
- `package.json` - add exports for react-lazy
- `tsup.config.ts` - add entry point
- `README.md` - documentation

**Tests (Phase 2):**

- `src/react-lazy/retryImport.test.ts`
- `src/react-lazy/lazyWithRetry.test.tsx`
- `src/react-lazy/integration.test.tsx`

---

## Post-Completion

**Manual testing** (after Phase 1):

- Verify in a real React application with slow 3G
- Verify offline → online transition
- Verify behavior with React DevTools Profiler
- Verify integration with React Router lazy routes

**Documentation** (after Phase 3):

- Update CHANGELOG.md
- Prepare release notes for the new version
- Consider creating an examples/ directory with a demo application

**Potential improvements** (after release):

- Add metrics/analytics for tracking retry success rate
- Consider integration with Service Worker for offline-first strategy
- Add support for custom retry strategies (not just delays, but also conditions)
