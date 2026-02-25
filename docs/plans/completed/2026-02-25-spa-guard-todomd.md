---
# Improve Static Asset 404 Detection + Debug Button

## Overview
Two improvements described in spa-guard/TODO.md:
1. Replace time-based `isLikely404()` heuristic with Resource Timing API (progressive enhancement)
2. Add "Static Asset 404" button to the debug panel

Then delete TODO.md.

## Context
- Files involved:
  - `spa-guard/spa-guard/src/common/isStaticAssetError.ts` (core change)
  - `spa-guard/spa-guard/src/common/listen/internal.ts` (call site update)
  - `spa-guard/spa-guard/src/common/isStaticAssetError.test.ts` (tests)
  - `spa-guard/spa-guard/src/runtime/debug/errorDispatchers.ts` (new dispatcher)
  - `spa-guard/spa-guard/src/runtime/debug/index.ts` (add to SCENARIOS)
  - `spa-guard/spa-guard/src/runtime/debug/errorDispatchers.test.ts` (tests)
  - `spa-guard/TODO.md` (delete after all tasks)
- Related patterns: existing dispatchers use fire-and-forget pattern (return void); tests use vitest + happy-dom

## Development Approach
- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Upgrade isLikely404 with Resource Timing API

**Files:**
- Modify: `spa-guard/spa-guard/src/common/isStaticAssetError.ts`
- Modify: `spa-guard/spa-guard/src/common/listen/internal.ts`
- Modify: `spa-guard/spa-guard/src/common/isStaticAssetError.test.ts`

- [x] Add private `checkResourceStatus(url: string): boolean` that queries `performance.getEntriesByName(url, "resource")` and applies 3-tier logic: (1) `responseStatus >= 400`, (2) `transferSize === 0 && decodedBodySize === 0`, (3) return true if no entry found (Safari/missing entry case)
- [x] Update `isLikely404` signature to `(url?: string, timeSinceNavMs?: number)`: when url provided call `checkResourceStatus`, else fall back to time check
- [x] Update `internal.ts` line 68: change `isLikely404()` to `isLikely404(assetUrl)` (assetUrl is already assigned on line 69, hoist it before the condition)
- [x] Update existing `isLikely404` tests: change `isLikely404(0)` → `isLikely404(undefined, 0)` etc. to match new signature
- [x] Add new tests for `checkResourceStatus` via `isLikely404(url)`: mock `performance.getEntriesByName`, cover responseStatus path, transferSize path, no-entry path, cached resource edge case
- [x] Run test suite — must pass before task 2

### Task 2: Add "Static Asset 404" button to debug panel

**Files:**
- Modify: `spa-guard/spa-guard/src/runtime/debug/errorDispatchers.ts`
- Modify: `spa-guard/spa-guard/src/runtime/debug/index.ts`
- Modify: `spa-guard/spa-guard/src/runtime/debug/errorDispatchers.test.ts`

- [x] Add `dispatchStaticAsset404(): void` to `errorDispatchers.ts`: creates a `<script>` element with a nonexistent hashed URL (`/assets/index-` + random hash + `.js`), appends it to `document.head` to trigger a real browser error event; no delay needed since `isLikely404(url)` now uses Resource Timing API
- [x] Add to SCENARIOS array in `index.ts`: `{ dispatch: dispatchStaticAsset404, key: "static-asset-404", label: "Static Asset 404" }`
- [x] Add tests for `dispatchStaticAsset404` in `errorDispatchers.test.ts`: verify returns void, verify a script element with hashed URL is appended to document.head
- [x] Run test suite — must pass before task 3

### Task 3: Delete TODO.md

**Files:**
- Delete: `spa-guard/TODO.md`

- [x] Delete `spa-guard/TODO.md`
- [x] Run full test suite: `pnpm test` (or equivalent)
- [x] Run linter
- [x] Move this plan to `docs/plans/completed/`
---
