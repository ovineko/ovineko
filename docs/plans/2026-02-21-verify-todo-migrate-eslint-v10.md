# Verify TODO.md and Migrate ESLint Plugin to v10 Flat Config

## Overview

1. Confirm all 4 items in TODO.md are fully implemented, then delete TODO.md.
2. Migrate the ESLint plugin to ESLint 10 flat-config-only, using `satisfies ESLint.Plugin` typing, importing `name` from package.json, and naming the plugin `${name}/eslint` (e.g. `@ovineko/spa-guard/eslint`) since it is a submodule of the package, not the entire package.

## Context

- Files involved:
  - `packages/spa-guard/TODO.md` - audit target, delete after verification
  - `packages/spa-guard/package.json` - dependency updates
  - `packages/spa-guard/src/eslint/index.ts` - plugin entry, refactor to use `satisfies ESLint.Plugin`, `name` from package.json, and `/eslint` suffix in plugin name
  - `packages/spa-guard/src/eslint/rules/no-direct-error-boundary.ts` - replace hardcoded package name with import from package.json
  - `packages/spa-guard/src/eslint/rules/no-direct-lazy.ts` - replace hardcoded package name with import from package.json
  - `packages/spa-guard/src/eslint/rules/no-direct-error-boundary.test.ts` - update test expectations for new plugin name prefix
  - `packages/spa-guard/src/eslint/rules/no-direct-lazy.test.ts` - update test expectations for new plugin name prefix
- Related patterns: `name` already imported from `../../package.json` in `constants.ts`, `fastify/index.ts`, `vite-plugin/index.ts`
- Dependencies: eslint ^10, remove @types/eslint (v10 ships own types)

## Development Approach

- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Audit TODO.md and delete it

**Files:**

- Delete: `packages/spa-guard/TODO.md`

All 4 TODO items are already fully implemented:

1. **Version Checker Module** - implemented in `src/common/checkVersion.ts` with HTML/JSON modes, tests in `checkVersion.test.ts`
2. **Enhanced Event Emitter Architecture** - full event types in `src/common/events/types.ts`, Symbol.for-based singleton, double-init prevention, React hooks
3. **ESLint Plugin** - flat config plugin with `no-direct-error-boundary` and `no-direct-lazy` rules with autofix
4. **Comprehensive Test Suite** - 26 test files, 670+ passing tests

- [x] Confirm each TODO item against source code
- [x] Delete `packages/spa-guard/TODO.md`
- [x] Run tests to verify nothing breaks: `pnpm test`

### Task 2: Migrate ESLint plugin to v10 with proper typing and naming

**Files:**

- Modify: `packages/spa-guard/package.json`
- Modify: `packages/spa-guard/src/eslint/index.ts`
- Modify: `packages/spa-guard/src/eslint/rules/no-direct-error-boundary.ts`
- Modify: `packages/spa-guard/src/eslint/rules/no-direct-lazy.ts`
- Modify: `packages/spa-guard/src/eslint/rules/no-direct-error-boundary.test.ts`
- Modify: `packages/spa-guard/src/eslint/rules/no-direct-lazy.test.ts`

Changes:

1. `package.json`:
   - Update peerDependencies: `"eslint": "^8 || ^9"` -> `"eslint": "^9 || ^10"`
   - Remove `@types/eslint` from devDependencies (v10 ships own types)

2. `src/eslint/index.ts`:
   - Import `type { ESLint }` from `"eslint"`
   - Import `{ name }` from `"../../package.json"`
   - Define `` const pluginName = `${name}/eslint` `` (yields `@ovineko/spa-guard/eslint`)
   - Type the plugin object with `satisfies ESLint.Plugin`
   - Use `pluginName` as the key in `plugins` object and prefix in `rules` config (e.g. `@ovineko/spa-guard/eslint/no-direct-error-boundary`)

3. `src/eslint/rules/no-direct-error-boundary.ts`:
   - Import `{ name }` from `"../../../package.json"`
   - Replace `const SPA_GUARD_SOURCE = "@ovineko/spa-guard/react-error-boundary"` with `` const SPA_GUARD_SOURCE = `${name}/react-error-boundary` ``

4. `src/eslint/rules/no-direct-lazy.ts`:
   - Import `{ name }` from `"../../../package.json"`
   - Replace `const SPA_GUARD_SOURCE = "@ovineko/spa-guard/react"` with `` const SPA_GUARD_SOURCE = `${name}/react` ``

5. Update test files to match new plugin name prefix `@ovineko/spa-guard/eslint` in any rule name expectations

- [x] Update package.json dependencies
- [x] Refactor eslint/index.ts with `satisfies ESLint.Plugin`, `name` from package.json, and `/eslint` suffix
- [x] Refactor no-direct-error-boundary.ts to use `name` from package.json
- [x] Refactor no-direct-lazy.ts to use `name` from package.json
- [x] Update test expectations for new plugin name prefix
- [x] Run `pnpm install` to update lockfile
- [x] Run tests: `pnpm test`
- [x] Run typecheck: `pnpm typecheck`

### Task 3: Verify acceptance criteria

- [x] TODO.md is deleted
- [x] ESLint plugin uses `satisfies ESLint.Plugin` typing
- [x] Plugin name is `@ovineko/spa-guard/eslint` (not just `@ovineko/spa-guard`)
- [x] No hardcoded `@ovineko/spa-guard` strings in eslint source files (uses `name` from package.json)
- [x] peerDependencies include eslint ^10, no ^8
- [x] @types/eslint removed from devDependencies
- [x] Run full test suite: `pnpm test`
- [x] Run linter: `pnpm lint`
- [x] Run typecheck: `pnpm typecheck`

### Task 4: Update documentation

- [ ] Move this plan to `docs/plans/completed/`
