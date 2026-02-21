---

# Move Debug Panel to Vanilla JS (runtime/debug)

## Overview

Move the debug test panel from React (react/debug) to vanilla JavaScript (runtime/debug) so it can be reused across any SPA framework. Implement as a createDebugger() factory that directly returns a cleanup function (not an object). Fix error simulation so errors actually propagate to spa-guard's window event listeners instead of being silently swallowed by try/catch. Add single-instance deduplication. Delete revise.txt.

## Context

- Files involved: src/runtime/debug/ (new), src/react/debug/ (delete), package.json, tsup.config.ts
- Related patterns: Symbol-keyed DI on window (constants.ts pattern), subscribe() for events, subscribeToState() for state
- Dependencies: None (pure vanilla JS, no framework deps)

## Key design decisions

Error dispatching mechanism: Currently errorSimulators.ts returns promises/throws that the panel's handleTrigger() catches in try/catch - errors never reach spa-guard. The fix: error dispatchers use "fire and forget" - void Promise.reject(error) for async errors (triggers window.unhandledrejection) and setTimeout(() => { throw error }, 0) for sync errors (triggers window.error). These are NOT returned to the caller so they cannot be accidentally caught.

DI / closure pattern: createDebugger() creates error dispatcher functions in its closure and passes them to the panel renderer. The panel does not know how errors are dispatched - it just calls the injected functions. This follows the project's DI pattern from CLAUDE.md.

Deduplication: Module-level tracking (or Symbol-keyed window property following project convention). Second call to createDebugger() while one exists logs a warning and returns the same cleanup function.

Return type: createDebugger() returns a plain function, not an object. Calling that function destroys the panel and cleans up subscriptions.

React usage: `useEffect(() => createDebugger(), [])` - since createDebugger() returns a cleanup function directly, the arrow shorthand implicitly returns it as the useEffect cleanup. No wrapper needed.

## Development Approach

- **Testing approach**: Code first, then tests
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Create runtime/debug entry point and build config

**Files:**

- Modify: `packages/spa-guard/package.json`
- Modify: `packages/spa-guard/tsup.config.ts`
- Create: `packages/spa-guard/src/runtime/debug/index.ts` (stub)

- [x] Add "./runtime/debug" export to package.json (types + default)
- [x] Add src/runtime/debug/index.ts entry to tsup.config.ts
- [x] Create stub index.ts exporting createDebugger placeholder
- [x] Run build to verify entry point compiles
- [x] Run existing tests to verify no regressions

### Task 2: Implement error dispatchers

**Files:**

- Create: `packages/spa-guard/src/runtime/debug/errorDispatchers.ts`

Error dispatchers produce truly unhandled errors that reach spa-guard's window listeners:

- dispatchChunkLoadError(): void Promise.reject(chunkError) -> window.unhandledrejection
- dispatchNetworkTimeout(delayMs): setTimeout + void Promise.reject(networkError) -> window.unhandledrejection
- dispatchRuntimeError(): setTimeout(() => { throw runtimeError }) -> window.error
- dispatchFinallyError(): Promise.resolve().finally(() => { throw chunkError }) with no catch -> window.unhandledrejection

Key difference from old errorSimulators: functions return void, not Promise. Errors are dispatched, not returned. Caller cannot catch them.

- [x] Implement all 4 dispatch functions
- [x] Write tests verifying errors reach window event listeners (use addEventListener in test to capture)
- [x] Run test suite

### Task 3: Implement createDebugger() with vanilla JS panel

**Files:**

- Modify: `packages/spa-guard/src/runtime/debug/index.ts`

createDebugger(options?) -> function

The function signature:

```typescript
export function createDebugger(options?: {
  position?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  defaultOpen?: boolean;
}): () => void;
```

createDebugger returns a function. Calling that function destroys the panel. There is no wrapper object - the return value IS the destroy function.

- [x] Implement panel DOM structure with inline styles (same Catppuccin #1e1e2e theme)
- [x] Implement toggle open/close header
- [x] Wire 4 buttons to error dispatchers (no try/catch)
- [x] Implement button visual states (default -> loading -> triggered)
- [x] Implement state display section via subscribeToState
- [x] Implement event history section via subscribe + clear button
- [x] Implement destroy: calling the returned function removes DOM element and unsubscribes all listeners
- [x] Implement deduplication (one instance at a time, warn on duplicate call, return same function)
- [x] Write tests for createDebugger (panel creation, destroy, dedup, button clicks, state/events)
- [x] Run test suite

### Task 4: Remove React debug code and old export

**Files:**

- Delete: `packages/spa-guard/src/react/debug/` (all files: DebugTestPanel.tsx, errorSimulators.ts, index.ts, tests)
- Modify: `packages/spa-guard/package.json` (remove "./react/debug" export)
- Modify: `packages/spa-guard/tsup.config.ts` (remove react/debug entry)

- [x] Delete all files in src/react/debug/
- [x] Remove "./react/debug" export from package.json
- [x] Remove react/debug entry from tsup.config.ts
- [x] Run build and tests to verify no breakage

### Task 5: Delete revise.txt

**Files:**

- Delete: `revise.txt`

- [ ] Delete revise.txt from repo root

### Task 6: Verify acceptance criteria

- [ ] Run full test suite (pnpm test in packages/spa-guard)
- [ ] Run linter (pnpm lint in packages/spa-guard)
- [ ] Run typecheck (pnpm typecheck in packages/spa-guard)
- [ ] Verify test coverage meets 80%+
- [ ] Manual verification: createDebugger() creates panel, buttons dispatch errors that spa-guard catches, state and events display correctly

### Task 7: Update documentation

- [ ] Update packages/spa-guard/README.md - replace react/debug section with runtime/debug usage, including React example: `useEffect(() => createDebugger(), [])`
- [ ] Update CLAUDE.md if internal patterns changed
- [ ] Move this plan to docs/plans/completed/
