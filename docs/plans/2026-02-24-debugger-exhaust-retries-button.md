# Add "Exhaust Retries" button to debugger panel

## Overview

Add a button to the spa-guard debug panel that simulates the state when all retry attempts are exhausted and the fallback HTML is displayed. The button will emit the correct events ("retry-exhausted" + "fallback-ui-shown") so the state machine updates properly, and will render the actual fallback HTML into the DOM.

## Context

- Files involved:
  - `spa-guard/spa-guard/src/common/reload.ts` (export showFallbackUI)
  - `spa-guard/spa-guard/src/runtime/debug/errorDispatchers.ts` (new dispatcher)
  - `spa-guard/spa-guard/src/runtime/debug/errorDispatchers.test.ts` (tests)
  - `spa-guard/spa-guard/src/runtime/debug/index.ts` (add button to SCENARIOS)
  - `spa-guard/spa-guard/src/runtime/debug/index.test.ts` (tests)
- Related patterns: existing error dispatchers and SCENARIOS array
- Dependencies: none new

## Development Approach

- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Export showFallbackUI and add dispatchRetryExhausted

**Files:**

- Modify: `spa-guard/spa-guard/src/common/reload.ts`
- Modify: `spa-guard/spa-guard/src/runtime/debug/errorDispatchers.ts`
- Modify: `spa-guard/spa-guard/src/runtime/debug/errorDispatchers.test.ts`

- [x] Add `export` keyword to `showFallbackUI` in `reload.ts` (change `const showFallbackUI` to `export const showFallbackUI`)
- [x] Add `dispatchRetryExhausted` function to `errorDispatchers.ts` that: reads `reloadDelays` from `getOptions()`, emits "retry-exhausted" event with `finalAttempt = reloadDelays.length`, then calls `showFallbackUI()`
- [x] Add tests for `dispatchRetryExhausted` in `errorDispatchers.test.ts`: verify it calls `emitEvent` with correct "retry-exhausted" payload, verify it calls `showFallbackUI`
- [x] Run project test suite - must pass before task 2

### Task 2: Add button to debugger panel

**Files:**

- Modify: `spa-guard/spa-guard/src/runtime/debug/index.ts`
- Modify: `spa-guard/spa-guard/src/runtime/debug/index.test.ts`

- [x] Import `dispatchRetryExhausted` in `debug/index.ts`
- [x] Add entry to SCENARIOS array: `{ dispatch: dispatchRetryExhausted, key: "exhaust-retries", label: "Exhaust Retries" }`
- [x] Add test: verify button `debug-btn-exhaust-retries` is rendered (update "renders all N error buttons" test from 7 to 8)
- [x] Add test: verify clicking the button calls `dispatchRetryExhausted`
- [x] Run project test suite - must pass before task 3

### Task 3: Verify acceptance criteria

- [x] Manual test: create debugger, click "Exhaust Retries" button, verify fallback HTML appears and state shows isFallbackShown=true
- [x] Run full test suite (vitest in spa-guard/spa-guard)
- [x] Run linter
- [x] Verify test coverage meets 80%+

### Task 4: Update documentation

- [ ] Update README.md if user-facing changes
- [ ] Update CLAUDE.md if internal patterns changed
- [ ] Move this plan to `docs/plans/completed/`
