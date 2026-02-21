# Fix ESLint no-direct-lazy rule: rename lazy() usages alongside import

## Overview

The ESLint rule `no-direct-lazy` in packages/spa-guard correctly transforms the import statement (replacing `import { lazy } from "react"` with `import { lazyWithRetry } from "@ovineko/spa-guard/react"`), but does NOT rename the actual `lazy()` call sites in the code. This results in broken code where `lazy` is used but never imported. The fix adds scope-based reference renaming to the fixer.

## Context

- Files involved:
  - `packages/spa-guard/src/eslint/rules/no-direct-lazy.ts` (the buggy rule)
  - `packages/spa-guard/src/eslint/rules/no-direct-lazy.test.ts` (tests)
- Related patterns: The sibling rule `no-direct-error-boundary.ts` doesn't have this issue because it only changes the import source string, not the imported identifier name
- Dependencies: ESLint scope analysis API (`context.sourceCode.getScope()`)

## Development Approach

- **Testing approach**: TDD - add failing test cases first, then fix the rule
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Add failing test cases for lazy() usage renaming

**Files:**

- Modify: `packages/spa-guard/src/eslint/rules/no-direct-lazy.test.ts`

- [x] Add invalid test case: `import { lazy } from "react"; const Page = lazy(() => import("./Page"));` should output `import { lazyWithRetry } from "spa-guard/react"; const Page = lazyWithRetry(() => import("./Page"));`
- [x] Add invalid test case: multi-line with other imports: `import { useState, lazy } from "react"; const Page = lazy(() => import("./Page"));` should output both the split import and renamed usage
- [x] Add invalid test case: multiple lazy() usages in same file to verify all references are renamed
- [x] Add invalid test case: aliased import `import { lazy as myLazy } from "react"; const Page = myLazy(() => import("./Page"));` should keep `myLazy` usage unchanged (already works, but good to verify)
- [x] Run tests - confirm the new test cases FAIL (proving the bug exists)

### Task 2: Fix the fixer to rename lazy() references using scope analysis

**Files:**

- Modify: `packages/spa-guard/src/eslint/rules/no-direct-lazy.ts`

- [x] Inside the `*fix` generator, after yielding the import replacement, use `context.sourceCode.getScope(node)` to find the variable declared by the `lazy` specifier
- [x] Iterate over all references to that variable and yield `fixer.replaceText(ref.identifier, SPA_GUARD_IMPORT)` for each reference (skip the specifier node itself which is already handled by the import fix)
- [x] Only rename references when `localName === "lazy"` (aliased imports like `lazy as myLazy` keep their local name)
- [x] Run tests - all tests (old and new) must pass

### Task 3: Verify acceptance criteria

- [x] Manual test: ESLint autofix of `import { lazy } from "react"; const Page = lazy(() => import("./Page"));` produces `import { lazyWithRetry } from "@ovineko/spa-guard/react"; const Page = lazyWithRetry(() => import("./Page"));`
- [x] Run full test suite (use project-specific command)
- [x] Run linter (use project-specific command)

### Task 4: Update documentation

- [x] Update CLAUDE.md if internal patterns changed
- [x] Move this plan to `docs/plans/completed/`
