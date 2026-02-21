# Improve version check lifecycle, auto-reload, error options, and simplify fallback UI

## Overview

Four improvements from revise.txt and revise2.txt:

1. Fix version check to handle focus/blur events, pause when tab hidden or window unfocused, deduplicate concurrent checks, and immediately check when returning after long absence
2. Add checkVersion.onUpdate option with default "reload" for auto-reload when version changes
3. Restructure ignoredErrors into errors: { ignore, forceRetry } to allow custom errors to trigger the retry process
4. Simplify fallback UI to minimal, pragmatic defaults - no animations, no colors, no custom fonts; create two separate HTML templates (error + loading), generate two TypeScript string constants reusable by React and other frameworks

## Context

- Files involved: `packages/spa-guard/src/common/checkVersion.ts`, `options.ts`, `shouldIgnore.ts`, `listen/internal.ts`, `reload.ts`, `logger.ts`, `events/internal.ts`, `src/fallback.html`, `scripts/generate-fallback.ts`, `src/common/fallbackHtml.generated.ts`, `src/common/DefaultErrorFallback.tsx`, `src/react-error-boundary/index.tsx`, `src/react-router/index.tsx`
- Related patterns: Symbol-keyed DI on window, auto-logging via emitEvent, Logger interface with named methods
- Alpha package - breaking changes to Options interface are acceptable

## Development Approach

- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Delete revise.txt and revise2.txt

**Files:**

- Delete: `revise.txt`
- Delete: `revise2.txt`

- [x] delete revise.txt from repo root
- [x] delete revise2.txt from repo root
- [x] verify both files are removed

### Task 2: Simplify fallback UI - create two minimal HTML templates

**Files:**

- Replace: `packages/spa-guard/src/fallback.html` with `packages/spa-guard/src/fallback-error.html`
- Create: `packages/spa-guard/src/fallback-loading.html`
- Modify: `packages/spa-guard/scripts/generate-fallback.ts`
- Modify: `packages/spa-guard/src/common/fallbackHtml.generated.ts`

- [x] create `fallback-error.html` - minimal error fallback similar to the old pre-unification style: centered on page, no colors on heading (just default), plain default `<button>` elements (no background-color, no border styling, no border-radius), no custom fonts (no font-family at all), no animations, no spinner; keep data-spa-guard attributes for action/content binding; just: heading "Something went wrong", message paragraph, "Try again" button (hidden by default), "Reload page" button with onclick, Error ID span
- [x] create `fallback-loading.html` - minimal loading fallback: centered on page/block, just plain text "Loading..." (an `<h2>` or `<p>`), no spinner, no animation, no styles beyond centering; include data-spa-guard-section="retrying" and data-spa-guard-content="attempt" span for retry attempt display
- [x] delete old `fallback.html`
- [x] update `generate-fallback.ts` to read both HTML files and generate two exports: `defaultErrorFallbackHtml` and `defaultLoadingFallbackHtml`
- [x] update `fallbackHtml.generated.ts` to export both constants (auto-generated)
- [x] write tests for generator script producing both constants
- [x] run project test suite - must pass before task 3

### Task 3: Update React components to use new fallback constants

**Files:**

- Modify: `packages/spa-guard/src/common/DefaultErrorFallback.tsx`
- Modify: `packages/spa-guard/src/common/options.ts`
- Modify: `packages/spa-guard/src/common/reload.ts`

- [x] update `DefaultErrorFallback.tsx`: use `defaultErrorFallbackHtml` for error state and `defaultLoadingFallbackHtml` for retrying state; remove all color manipulations (no grey button reassignment in useLayoutEffect), remove spinner-related string replacements; simplify string replacements to just: swap display for retrying/error sections, populate attempt number, populate heading/message text, show/hide try-again button
- [x] update `options.ts`: replace `fallback.html` default with `defaultErrorFallbackHtml`; consider adding `fallback.loadingHtml` default with `defaultLoadingFallbackHtml`
- [x] update `reload.ts` (`showFallbackUI`): use `defaultErrorFallbackHtml` (same as before, just renamed import)
- [x] write/update tests for DefaultErrorFallback rendering both states with new minimal templates
- [x] run project test suite - must pass before task 4

### Task 4: Version check - focus/blur + deduplication + initial state handling

**Files:**

- Modify: `packages/spa-guard/src/common/checkVersion.ts`
- Modify: `packages/spa-guard/src/common/logger.ts` (add new log methods if needed)

- [x] add `checkInProgress` boolean flag; wrap `checkVersionOnce` so that if a check is already in-flight, new calls are skipped (return early)
- [x] in `startVersionCheck()`: before starting polling, check `document.visibilityState` and `document.hasFocus()`; if tab is hidden or window unfocused, only register event listeners without starting polling
- [x] add `window.focus` and `window.blur` event listeners alongside `visibilitychange`:
  - `blur`: pause polling (clearTimers), same as hidden
  - `focus`: resume with same logic as visibility-visible (check elapsed time, immediate check if >= interval, otherwise schedule remaining)
- [x] deduplicate overlapping events: since both visibilitychange and focus/blur can fire close together, the `checkInProgress` flag prevents concurrent fetches; additionally, if timers are already running (from a prior resume), don't restart them
- [x] in `stopVersionCheck()`: also remove focus/blur listeners
- [x] in `_resetForTesting()`: reset `checkInProgress` flag
- [x] write/update tests for: initial hidden state (no polling starts), focus/blur pause/resume, deduplication (concurrent checks skipped), immediate check on return after interval elapsed
- [x] run project test suite - must pass before task 5

### Task 5: Auto-reload on version change

**Files:**

- Modify: `packages/spa-guard/src/common/options.ts`
- Modify: `packages/spa-guard/src/common/checkVersion.ts`

- [x] add `checkVersion.onUpdate?: "reload" | "event"` to Options interface, default `"reload"` in `defaultOptions`
- [x] update `getOptions()` - already merges `checkVersion` sub-object, so no extra work needed
- [x] in `onVersionChange()`: after dispatching the CustomEvent, check `getOptions().checkVersion?.onUpdate`; if `"reload"` (default), call `location.reload()`; if `"event"`, do nothing extra (current behavior)
- [x] write tests for: default reload behavior on version change, explicit `"event"` mode dispatches event without reload, explicit `"reload"` mode reloads
- [x] run project test suite - must pass before task 6

### Task 6: Restructure error options - add forceRetry

**Files:**

- Modify: `packages/spa-guard/src/common/options.ts`
- Modify: `packages/spa-guard/src/common/shouldIgnore.ts`
- Modify: `packages/spa-guard/src/common/listen/internal.ts`

- [x] in `options.ts`: replace `ignoredErrors?: string[]` with `errors?: { ignore?: string[]; forceRetry?: string[] }`; update `defaultOptions` (set `errors: { ignore: [], forceRetry: [] }`); remove old `ignoredErrors`; update `getOptions()` to merge `errors` sub-object
- [x] in `shouldIgnore.ts`: update `shouldIgnoreMessages` to read from `options.errors?.ignore` instead of `options.ignoredErrors`
- [x] add new function `shouldForceRetry(messages: (string | undefined)[]): boolean` in `shouldIgnore.ts` that checks messages against `options.errors?.forceRetry` patterns (same logic as ignore - substring match)
- [x] in `listen/internal.ts`: in `error` and `unhandledrejection` handlers, after the `isChunkError` check, add a `shouldForceRetry` check - if matched, call `event.preventDefault()` and `attemptReload(error)` (same as chunk error path)
- [x] write/update tests for: `shouldForceRetry` function, `errors.ignore` works same as old `ignoredErrors`, forceRetry errors trigger `attemptReload` in listen handlers, non-matching errors still send beacons normally
- [x] run project test suite - must pass before task 7

### Task 7: Verify acceptance criteria

- [x] manual test: configure `errors.forceRetry` with a custom message, verify it triggers retry
- [x] run full test suite: `pnpm --filter @ovineko/spa-guard test`
- [x] run linter: `pnpm --filter @ovineko/spa-guard lint`
- [x] verify test coverage meets 80%+

### Task 8: Update documentation

- [x] update README.md: document new `checkVersion.onUpdate` option, new `errors` config structure (replacing `ignoredErrors`), focus/blur behavior, simplified fallback UI and how to use exported HTML constants
- [x] update CLAUDE.md if internal patterns changed
- [x] move this plan to `docs/plans/completed/`
