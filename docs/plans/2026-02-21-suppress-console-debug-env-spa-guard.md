---
# Suppress console output during tests with DEBUG env flag

## Overview
Add conditional console suppression in the vitest setup file so console.log/warn/error are silenced during normal test runs. When DEBUG=1 is set, output flows through normally. A new test:debug script enables debug mode.

## Context
- Files involved:
  - `packages/spa-guard/test/setup.ts` — vitest global setup (currently only imports jest-dom)
  - `packages/spa-guard/package.json` — scripts section
- Related patterns: `test/integration/error-flow.test.tsx` already manually spies on console methods per-test; the global setup suppression will be overridden there transparently since each test's `vi.spyOn` takes precedence
- vitest config has `globals: true` so `vi`, `beforeEach`, `afterEach` are available as globals in setup file

## Development Approach
- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Add console suppression to test setup

**Files:**
- Modify: `packages/spa-guard/test/setup.ts`

- [x] Import `afterEach`, `beforeEach`, `vi` explicitly from `vitest` (do not rely on globals in setup files for clarity)
- [x] Add a `beforeEach` block guarded by `!process.env.DEBUG` that spies on `console.log`, `console.warn`, `console.error` with empty implementations
- [x] Add a corresponding `afterEach` block (also guarded by `!process.env.DEBUG`) that calls `vi.restoreAllMocks()` to clean up spies between tests

### Task 2: Add test:debug script

**Files:**
- Modify: `packages/spa-guard/package.json`

- [ ] Add `"test:debug": "DEBUG=1 vitest run"` to the scripts section, placed after `test:coverage`

### Task 3: Verify acceptance criteria

- [ ] Run `pnpm test` in `packages/spa-guard` — all tests pass, no console output visible
- [ ] Run `pnpm test:debug` in `packages/spa-guard` — all tests pass, console output IS visible
- [ ] Run linter: `pnpm lint` in `packages/spa-guard`

### Task 4: Update documentation

- [ ] Move this plan to `docs/plans/completed/`
---
