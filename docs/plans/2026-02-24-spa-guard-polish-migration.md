# spa-guard: polish migration and improvements

## Overview

Polish the happydom->parse5 and typebox->plain TS migration, fix spinner rendering architecture, improve options usage, audit dead code, add runtime i18n API, and reorganize into separate packages per TODO.md.

## Context

- Files involved: packages/spa-guard/src/schema/parse.ts, src/node/index.ts, src/common/spinner.ts, src/common/options.ts, src/common/DefaultErrorFallback.tsx, src/common/reload.ts, src/fallback-loading.html, src/spinner.html, scripts/generate-fallback.ts, src/common/html.generated.ts, package.json, README.md, TODO.md, revise.txt
- Related patterns: data-attribute based HTML templating, getOptions() for runtime configuration, html.generated.ts auto-generated from HTML sources
- Dependencies: parse5@8.0.0 (new runtime dep, replaces happy-dom for node), typebox removed entirely

## Development Approach

- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Polish parse5/typebox migration

**Files:**

- Modify: `packages/spa-guard/src/schema/parse.ts`
- Modify: `packages/spa-guard/src/schema/parse.test.ts`
- Modify: `packages/spa-guard/src/node/index.ts`
- Modify: `packages/spa-guard/package.json`
- Modify: `packages/spa-guard/README.md`

- [x] Fix parseBeacon validation: must throw "Beacon validation failed" for wrong-typed fields (tests expect this), must NOT include undefined keys in result, must strip unknown fields
- [x] Clean up node/index.ts: move parse5 import to top of file, remove extra blank lines, add comment about English no-op
- [x] Remove typebox from peerDependencies/peerDependenciesMeta if any remnants exist (already done in diff, verify)
- [x] Verify happy-dom removed from peerDependencies (already done, confirm)
- [x] Update README.md: change ./node entry point docs from happy-dom to parse5, remove typebox references
- [x] Update parse.test.ts to match new implementation behavior (error messages, validation semantics)
- [x] Run test suite - must pass before task 2

### Task 2: Spinner SVG responsive styles

**Files:**

- Modify: `packages/spa-guard/src/spinner.html`
- Regenerate: `packages/spa-guard/src/common/html.generated.ts`

- [x] Add styles to SVG in spinner.html: width:100%, height:100%, aspect-ratio:1/1
- [x] Run generate:fallback script to regenerate html.generated.ts
- [x] Update spinner tests if assertions check SVG attributes
- [x] Run test suite - must pass before task 3

### Task 3: Remove spinner from loading template, inject from options

**Files:**

- Modify: `packages/spa-guard/src/fallback-loading.html`
- Regenerate: `packages/spa-guard/src/common/html.generated.ts`
- Modify: `packages/spa-guard/src/common/html.generated.test.ts`

- [x] In fallback-loading.html, keep the `<div data-spa-guard-spinner>` container but remove the SVG and `<style>` from inside it (leave it empty - spinner will be injected from options)
- [x] Run generate:fallback to regenerate html.generated.ts
- [x] Update html.generated.test.ts: loading template should no longer contain `@keyframes spa-guard-spin` or `<svg`
- [x] Verify that reload.ts showLoadingUI() already injects spinner from options.spinner.content into [data-spa-guard-spinner] (it does)
- [x] Verify DefaultErrorFallback.tsx buildHtml() already injects spinnerHtml into [data-spa-guard-spinner] (it does)
- [x] Run test suite - must pass before task 4

### Task 4: Read fallback/loading HTML from options in DefaultErrorFallback

**Files:**

- Modify: `packages/spa-guard/src/common/DefaultErrorFallback.tsx`
- Modify: `packages/spa-guard/src/common/DefaultErrorFallback.test.tsx`

- [x] In DefaultErrorFallback.tsx, replace direct import of defaultErrorFallbackHtml/defaultLoadingFallbackHtml with getOptions().html.fallback.content / getOptions().html.loading.content (fall back to generated defaults if undefined)
- [x] This allows users to override fallback/loading HTML via window options
- [x] Update tests to verify custom HTML from options is used when configured
- [x] Run test suite - must pass before task 5

### Task 5: Audit and confirm removal of unused functions

**Files:**

- Modify: `packages/spa-guard/src/node/index.ts`
- Modify: `packages/spa-guard/src/node/index.test.ts`
- Modify: `packages/spa-guard/README.md`

- [x] CONFIRM WITH USER: escapeAttr in node/index.ts - was used with happy-dom for manual attribute escaping, no longer needed with parse5 (which handles serialization). Remove it?
- [x] Search for any other functions that became unused after the migration
- [x] Remove confirmed unused functions and their tests
- [x] Update README exports documentation
- [x] Run test suite - must pass before task 6

### Task 6: Runtime i18n translation patching API

**Files:**

- Modify: `packages/spa-guard/src/common/i18n.ts`
- Modify: `packages/spa-guard/src/runtime/index.ts`
- Create: `packages/spa-guard/src/common/i18n.test.ts` (update existing)

- [x] Add setTranslations(translations: SpaGuardTranslations) function to i18n.ts that writes translations to a `<meta name="spa-guard-i18n">` tag (creating or updating it)
- [x] Export setTranslations from runtime/index.ts so users can call it at runtime
- [x] This lets SPA apps import a translations map, pick the current language, and call setTranslations(t) to patch the inline fallback/loading UI translations dynamically
- [x] Write tests for setTranslations: creates meta tag, updates existing meta tag, getI18n() returns the set values
- [x] Run test suite - must pass before task 7

### Task 7: Reorganize into separate packages

**Files:**

- Create: `spa-guard/spa-guard/` (core: common, runtime, inline, i18n, schema)
- Create: `spa-guard/react/` (react hooks, Spinner, DefaultErrorFallback)
- Create: `spa-guard/react-router/` (react-router ErrorBoundary)
- Create: `spa-guard/fastify/` (fastify plugin)
- Create: `spa-guard/node/` (server-side HTML patching, parse5)
- Create: `spa-guard/vite/` (vite plugin, generate-fallback, dist-inline)
- Create: `spa-guard/eslint/` (eslint rules)
- Modify: `pnpm-workspace.yaml`
- Delete: `packages/spa-guard/` (after migration)

- [x] Create spa-guard/ directory at repo root
- [x] Create core package @ovineko/spa-guard with: src/common/, src/runtime/, src/inline/, src/inline-trace/, src/i18n/, src/schema/ - NO peer dependencies
- [x] Create @ovineko/spa-guard-react with: src/react/, src/react-error-boundary/ - peer: react@^19
- [x] Create @ovineko/spa-guard-react-router with: src/react-router/ - peer: react@^19, react-router@^7
- [x] Create @ovineko/spa-guard-fastify with: src/fastify/ - peer: fastify@^5||^4, fastify-plugin@^5||^4
- [x] Create @ovineko/spa-guard-node with: src/node/ - peer: parse5@^8
- [x] Create @ovineko/spa-guard-vite with: src/vite-plugin/, scripts/, HTML templates, dist-inline/ - peer: vite@^8||^7
- [x] Create @ovineko/spa-guard-eslint with: src/eslint/ - peer: eslint@^9||^10
- [x] Each package: package.json, tsconfig.json, tsup.config.ts, vitest.config.ts, move relevant tests
- [x] Update pnpm-workspace.yaml to include spa-guard/\*
- [x] Update internal workspace:\* dependencies between new packages
- [x] Delete old packages/spa-guard after verification
- [x] Run pnpm install, turbo build, pnpm test - all must pass
- [x] Run turbo prune to verify no long lockfile key issues

### Task 8: Cleanup and verify acceptance criteria

**Files:**

- Delete: `revise.txt`
- Delete: `TODO.md`
- Delete: `TODO/` directory (already deleted in working tree)

- [ ] Delete revise.txt (tasks captured in this plan)
- [ ] Delete TODO.md (reorganization planned in task 7)
- [ ] Manual test: verify pnpm install produces clean lockfile
- [ ] Run full test suite: pnpm test
- [ ] Run linter: pnpm lint (or datamitsu lint)
- [ ] Run typecheck: pnpm typecheck
- [ ] Verify test coverage meets 80%+

### Task 9: Update documentation

- [ ] Update README.md if user-facing changes (new packages, new exports, removed functions)
- [ ] Update CLAUDE.md if internal patterns changed
- [ ] Move this plan to `docs/plans/completed/`
