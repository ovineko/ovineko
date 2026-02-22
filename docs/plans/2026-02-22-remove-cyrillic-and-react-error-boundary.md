# Remove Cyrillic Text and Delete react-error-boundary Package

## Overview

Two tasks:

1. Remove/translate all Cyrillic (Russian) text from source, test, and docs files
2. Delete the `packages/react-error-boundary` package and clean up all references from README.md and AGENTS.md

## Context

- Files involved:
  - `packages/react-router/src/index.test.tsx` (line 116-118) - Cyrillic test value
  - `packages/react-router/src/validation.test.ts` (line 14) - Cyrillic test value
  - `packages/spa-guard/docs/plans/completed/2026-02-20-lazy-retry-integration.md` - entire file in Russian
  - `packages/react-error-boundary/` - package to delete entirely
  - `README.md` (root) - references to react-error-boundary package
  - `AGENTS.md` - multiple references to react-error-boundary
- Related patterns: none
- Dependencies: none

## Development Approach

- Testing approach: Regular (code first)
- No tests needed for this cleanup task
- Each task is a self-contained cleanup step

## Implementation Steps

### Task 1: Fix Cyrillic test values in react-router

**Files:**

- Modify: `packages/react-router/src/index.test.tsx`
- Modify: `packages/react-router/src/validation.test.ts`

- [x] In `index.test.tsx:116-118`, replace `%D0%BF%D1%80%D0%B8%D0%B2%D0%B5%D1%82` with `caf%C3%A9` and `"привет"` with `"café"`
- [x] In `validation.test.ts:14`, replace `%D0%BF%D1%80%D0%B8%D0%B2%D0%B5%D1%82` with `%E4%B8%96%E7%95%8C` and `"привет"` with `"世界"` (keeps test meaningful for multi-byte UTF-8)
- [x] Run `pnpm test` in `packages/react-router` to confirm tests still pass

### Task 2: Translate completed plan file to English

**Files:**

- Modify: `packages/spa-guard/docs/plans/completed/2026-02-20-lazy-retry-integration.md`

- [x] Translate all Russian sections to English (Overview description, Context section prose, Development Approach phases, Progress Tracking section, Technical Details comments, API usage comments)
- [x] Preserve all code blocks, markdown structure, and checked task items unchanged

### Task 3: Delete react-error-boundary package

**Files:**

- Delete: `packages/react-error-boundary/` (entire directory)

- [x] Delete the entire `packages/react-error-boundary/` directory using `rm -rf packages/react-error-boundary`

### Task 4: Update root README.md

**Files:**

- Modify: `README.md`

- [x] Remove the `@ovineko/react-error-boundary` row from the Packages table
- [x] Remove `react-error-boundary/` line from the Project Structure code block

### Task 5: Update AGENTS.md

**Files:**

- Modify: `AGENTS.md`

- [x] Remove `@ovineko/react-error-boundary` bullet from Project Overview list (line 26)
- [x] Remove `├── react-error-boundary/` from Repository Structure tree (line 38)
- [x] Remove `react-error-boundary` from the build example comment (line 145)
- [x] Remove the `@ovineko/react-error-boundary: workspace:*` example code block in Dependency Version Rules section (lines 194-200)
- [x] Remove "Error boundaries require @ovineko/react-error-boundary" note under @ovineko/react-router section (line 380)

### Task 6: Verify no Cyrillic text remains

- [ ] Run `grep -rn "[а-яА-ЯёЁ]" . --include="*.ts" --include="*.tsx" --include="*.md" --include="*.js" --include="*.json" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git` from project root
- [ ] Confirm only `.ralphex/` progress files (if any) remain — those are acceptable
- [ ] Run `pnpm test` from root to confirm all tests pass
