# Update ESLint plugin docs to use configs.recommended

## Overview

Update the spa-guard README to document the standard `spaGuardEslint.configs.recommended` usage pattern instead of manual plugin+rules registration.
Add tests verifying the config export structure.

## Context

- Files involved:
  - `packages/spa-guard/README.md` (lines 1386-1403 - ESLint Setup section)
  - `packages/spa-guard/src/eslint/index.ts` (already correct - has `recommended` key in configs)
  - `packages/spa-guard/src/eslint/index.test.ts` (create - tests for config export shape)
- Related patterns: ESLint flat config `configs.recommended` pattern (used by typescript-eslint, eslint-plugin-react, etc.)
- Dependencies: none

## Development Approach

- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Add tests for ESLint plugin config exports

**Files:**

- Create: `packages/spa-guard/src/eslint/index.test.ts`

- [x] Create test file that imports the default export and named exports from `./index`
- [x] Test that `plugin.configs.recommended` exists and is a valid flat config object
- [x] Test that `plugin.configs.recommended.plugins` contains the plugin keyed by `${name}/eslint`
- [x] Test that `plugin.configs.recommended.rules` enables both rules as "error"
- [x] Test that named export `configs` equals `plugin.configs`
- [x] Test that named export `rules` contains both rule definitions
- [x] Run tests: `pnpm --filter @ovineko/spa-guard test`

### Task 2: Update README ESLint setup section

**Files:**

- Modify: `packages/spa-guard/README.md`

- [x] Replace the manual plugin+rules setup example (lines 1388-1403) with the `configs.recommended` pattern:

  ```javascript
  // eslint.config.js (flat config)
  import spaGuardEslint from "@ovineko/spa-guard/eslint";

  export default [spaGuardEslint.configs.recommended];
  ```

- [x] Keep the Rules subsection (no-direct-error-boundary, no-direct-lazy) as-is since it documents individual rules

### Task 3: Verify acceptance criteria

- [x] Run full test suite: `pnpm --filter @ovineko/spa-guard test`
- [x] Run linter: `pnpm --filter @ovineko/spa-guard lint`
- [x] Verify test coverage meets 80%+: `pnpm --filter @ovineko/spa-guard test:coverage`

### Task 4: Update documentation

- [x] Update README.md if user-facing changes (done in Task 2)
- [x] Update CLAUDE.md if internal patterns changed
- [x] Move this plan to `docs/plans/completed/`
