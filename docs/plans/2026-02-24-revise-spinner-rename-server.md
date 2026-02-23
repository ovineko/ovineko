---

# Revise: spinner extraction, rename fallbackHtml.generated, rename ./server to ./node

## Overview

Three refactoring tasks from revise.txt:

1. Extract spinner SVG from inline TypeScript into a separate .html source file, generated via the same pipeline as fallback HTML
2. Rename fallbackHtml.generated.ts to html.generated.ts
3. Rename the ./server subpackage to ./node

## Context

- Files involved: see each task below
- Related patterns: HTML source files (fallback-error.html, fallback-loading.html) are minified by scripts/generate-fallback.ts into src/common/fallbackHtml.generated.ts
- Package: packages/spa-guard

## Development Approach

- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Extract spinner SVG into spinner.html and generate it

**Files:**

- Create: `src/spinner.html` (spinner SVG + style extracted from spinner.ts)
- Modify: `scripts/generate-fallback.ts` - add spinner.html to generation pipeline
- Modify: `src/common/fallbackHtml.generated.ts` -> will now also contain `defaultSpinnerHtml`
- Modify: `src/common/spinner.ts` - import `defaultSpinnerHtml` from generated file instead of inline SVG
- Modify: `src/common/fallbackHtml.generated.test.ts` - add tests for generated spinner HTML

- [x] Create src/spinner.html containing the SVG spinner markup and keyframes style currently in spinner.ts
- [x] Update scripts/generate-fallback.ts to read spinner.html, minify it, and export as `defaultSpinnerHtml`
- [x] Update src/common/spinner.ts: import `defaultSpinnerHtml` from generated file, replace `defaultSpinnerSvg` constant with re-export from generated
- [x] Update tests in fallbackHtml.generated.test.ts to cover spinner HTML
- [x] Run pnpm generate:fallback to regenerate
- [x] Run project test suite - must pass before task 2

### Task 2: Rename fallbackHtml.generated.ts to html.generated.ts

**Files:**

- Rename: `src/common/fallbackHtml.generated.ts` -> `src/common/html.generated.ts`
- Rename: `src/common/fallbackHtml.generated.test.ts` -> `src/common/html.generated.test.ts`
- Modify: `scripts/generate-fallback.ts` - update OUTPUT_PATH
- Modify: `src/common/options.ts` - update import path
- Modify: `src/common/DefaultErrorFallback.tsx` - update import path
- Modify: `src/common/DefaultErrorFallback.test.tsx` - update import path
- Modify: `src/common/options.test.ts` - update import path
- Modify: `src/common/spinner.ts` - update import path (from task 1)

- [x] Rename file and test file
- [x] Update OUTPUT_PATH in scripts/generate-fallback.ts
- [x] Update all imports (options.ts, DefaultErrorFallback.tsx, DefaultErrorFallback.test.tsx, options.test.ts, spinner.ts, html.generated.test.ts)
- [x] Run project test suite - must pass before task 3

### Task 3: Rename subpackage ./server to ./node

**Files:**

- Rename: `src/server/` directory -> `src/node/`
- Modify: `package.json` - update exports map entry from `./server` to `./node`
- Modify: `tsup.config.ts` - update entry point path
- Modify: `README.md` - update all references (import paths, table entry)

- [x] Rename src/server/ directory to src/node/
- [x] Update package.json exports: change `./server` key to `./node`, update dist paths from `dist/server/` to `dist/node/`
- [x] Update tsup.config.ts entry from `src/server/index.ts` to `src/node/index.ts`
- [x] Update README.md: all import examples and the entry points table (4 occurrences)
- [x] Run project test suite - must pass

### Task 4: Cleanup and verify

- [ ] Delete revise.txt
- [ ] Run full test suite
- [ ] Run linter
- [ ] Verify build succeeds (pnpm build in packages/spa-guard)

### Task 5: Update documentation

- [ ] Update CLAUDE.md if internal patterns changed
- [ ] Move this plan to `docs/plans/completed/`
