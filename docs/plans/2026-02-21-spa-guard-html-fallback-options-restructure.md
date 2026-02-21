# Reorganize spa-guard fallback options into html namespace

## Overview

Restructure the `fallback` options property into a new `html` namespace with nested `fallback` and `loading` sub-objects. The property holding HTML strings is renamed from `html`/`loadingHtml` to `content` for clarity.

Before: `fallback: { html, loadingHtml, selector }`
After: `html: { fallback: { selector, content }, loading: { content } }`

## Context

- Files involved:
  - `packages/spa-guard/src/common/options.ts` - type definition, defaults, merge logic
  - `packages/spa-guard/src/common/reload.ts` - reads fallback html and selector in showFallbackUI()
  - `packages/spa-guard/src/vite-plugin/index.ts` - minifies custom fallback html
  - `packages/spa-guard/src/common/reload.test.ts` - fallback injection tests
  - `packages/spa-guard/src/vite-plugin/index.test.ts` - vite plugin tests
  - `packages/spa-guard/README.md` - documentation
- Related patterns: existing nested options follow shallow-merge pattern in getOptions()
- Note: `loadingHtml` is currently defined in the type/defaults but never consumed at runtime (DefaultErrorFallback.tsx imports constants directly). This restructure preserves that status quo - wiring up loading.content to the React component is a separate concern.

## Development Approach

- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Update type definition and defaults in options.ts

**Files:**

- Modify: `packages/spa-guard/src/common/options.ts`

- [x] Replace the `fallback` interface property with a new `html` property:
  ```typescript
  html?: {
    fallback?: {
      /** Custom HTML to display when all reload attempts are exhausted */
      content?: string;
      /** CSS selector where the fallback HTML should be injected @default "body" */
      selector?: string;
    };
    loading?: {
      /** Custom HTML to display during the loading/retrying state */
      content?: string;
    };
  };
  ```
- [x] Update `defaultOptions` to use the new structure:
  ```typescript
  html: {
    fallback: {
      content: defaultErrorFallbackHtml,
      selector: "body",
    },
    loading: {
      content: defaultLoadingFallbackHtml,
    },
  },
  ```
- [x] Update `getOptions()` merge logic - replace the single `fallback` spread with deeper merge for `html.fallback` and `html.loading`
- [x] Update existing options tests if any exist in options.ts test file
- [x] Run tests: `pnpm --filter spa-guard test` - expect some failures in reload.test.ts and vite-plugin tests (will fix in next tasks)

### Task 2: Update runtime consumers (reload.ts and vite-plugin)

**Files:**

- Modify: `packages/spa-guard/src/common/reload.ts`
- Modify: `packages/spa-guard/src/vite-plugin/index.ts`

- [x] In `reload.ts` showFallbackUI(): change `options.fallback?.html` to `options.html?.fallback?.content` and `options.fallback?.selector` to `options.html?.fallback?.selector`
- [x] In `vite-plugin/index.ts` getInlineScript(): change `processedOptions.fallback?.html` to `processedOptions.html?.fallback?.content` and update the spread to use the new path
- [x] Run tests: `pnpm --filter spa-guard test` - expect test failures (tests still use old shape)

### Task 3: Update all tests

**Files:**

- Modify: `packages/spa-guard/src/common/reload.test.ts`
- Modify: `packages/spa-guard/src/vite-plugin/index.test.ts`

- [x] In reload.test.ts: replace all `fallback: { html: ..., selector: ... }` with `html: { fallback: { content: ..., selector: ... } }`
- [x] In index.test.ts: replace all `fallback: { html: ... }` with `html: { fallback: { content: ... } }`
- [x] Run tests: `pnpm --filter spa-guard test` - all must pass

### Task 4: Update README documentation

**Files:**

- Modify: `packages/spa-guard/README.md`

- [x] Update all code examples showing the old `fallback` option to use the new `html` structure
- [x] Update the Options Interface documentation section
- [x] Update the Default Values section

### Task 5: Verify acceptance criteria

- [ ] Run full test suite: `pnpm --filter spa-guard test`
- [ ] Run linter: `pnpm --filter spa-guard lint`
- [ ] Verify test coverage meets 80%+
- [ ] Verify no references to old `fallback.html`, `fallback.loadingHtml`, or `fallback.selector` remain in source (excluding git history)

### Task 6: Update documentation

- [ ] Update CLAUDE.md if internal patterns changed
- [ ] Move this plan to `docs/plans/completed/`
