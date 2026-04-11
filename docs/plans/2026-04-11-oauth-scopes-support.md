# OAuth Scopes Support for @ovineko/kubb and @ovineko/kubb-client

## Overview

Add OAuth scopes support to Kubb-based code generation with automatic integration for:

- **Type-safe scopes** - phantom types prevent arbitrary strings
- **Automatic SWR checks** - hooks don't fetch without required scopes
- **React utilities** - conditional rendering based on user permissions
- **Simple API** - user calls `client._setup.setScopes()`, no JWT magic

This enables migration from openapi-generator while preserving scope-based access control patterns.

## Context

**Files/components involved:**

- `packages/kubb-client/` - runtime for scopes validation and React integration
- `packages/kubb-plugin-scopes/` - new package for code generation from OpenAPI
- `packages/kubb/` - integration of scopes plugin into defineConfig

**User requirements (from discussion):**

- NO JWT extraction magic - user provides scopes manually via `setScopes()`
- SWR hooks auto-check scopes before fetching
- Simple logic: empty client scopes = allow all; non-empty request scopes without access = block
- Runtime-only React utilities (no generated wrapper components)

**Related patterns:**

- Existing middleware architecture in kubb-client
- Kubb plugin system with `operation` hooks
- Subpath exports pattern (`/react`, `/scopes`)

## Development Approach

- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- Make small, focused changes
- **CRITICAL: every task MUST include new/updated tests** for code changes in that task
- **CRITICAL: all tests must pass before starting next task** - no exceptions
- **CRITICAL: update this plan file when scope changes during implementation**
- Run tests after each change (`pnpm test` in package directory)
- Maintain backward compatibility (all changes are additive)

## Testing Strategy

- **Unit tests**: required for every task
  - Validation logic: 95%+ coverage
  - React components: 85%+ coverage with @testing-library/react
  - Kubb plugin: 90%+ coverage with mock OpenAPI specs
- **Integration tests**:
  - End-to-end generation test with sample OpenAPI spec
  - Verify generated code compiles and types are correct
- **No E2E tests**: this is a library, not a UI application

## Progress Tracking

- Mark completed items with `[x]` immediately when done
- Add newly discovered tasks with ➕ prefix
- Document issues/blockers with ⚠️ prefix
- Update plan if implementation deviates from original scope

## What Goes Where

- **Implementation Steps** (`[ ]` checkboxes): code changes, tests, documentation updates in this monorepo
- **Post-Completion** (no checkboxes): manual verification, consuming project updates

---

## Implementation Steps

### Task 1: Create scopes types and validation utilities in kubb-client

**Files:** `packages/kubb-client/src/scopes/`

- [x] create `src/scopes/types.ts` with `ApiScope` phantom type and `scope()` helper
- [x] create `src/scopes/validation.ts` with `normalizeScopes()` function
- [x] implement `isAvailableScopes()` with OR-of-ANDs logic (`[[A,B], [C]]` = "(A AND B) OR C")
- [x] implement `getMissingScopes()` to identify missing permissions
- [x] write tests for `normalizeScopes()` (empty array, single array, nested array)
- [x] write tests for `isAvailableScopes()` (no scopes required, simple AND, OR-of-ANDs)
- [x] write tests for `getMissingScopes()` (empty requirements, partial match, full match)
- [x] run `pnpm test` in `packages/kubb-client/` - must pass before Task 2

### Task 2: Extend Client with scopes state management

**Files:** `packages/kubb-client/src/core/types.ts`, `src/core/client.ts`

- [x] extend `ClientSetup` interface with `getScopes(): ApiScope[]` and `setScopes(scopes: ApiScope[]): void`
- [x] extend `RequestConfig` interface with optional `scopes?: ApiScope[][]` field
- [x] modify `createClient()` to add internal `currentScopes: ApiScope[] = []` state
- [x] implement `getScopes()` to return copy of current scopes
- [x] implement `setScopes()` to update scopes state
- [x] write tests for `getScopes()` (returns copy, not reference)
- [x] write tests for `setScopes()` (updates state, accepts empty array)
- [x] write tests for scopes isolation between client instances
- [x] run `pnpm test` in `packages/kubb-client/` - must pass before Task 3

### Task 3: Add React scopes integration (Provider, Hook, Component)

**Files:** `packages/kubb-client/src/scopes/react.tsx`

- [x] create `ScopesContext` with `createContext<ApiScope[] | null>(null)`
- [x] implement `ScopesProvider` component accepting `scopes: ApiScope[]` and `children`
- [x] implement `useScopes()` hook returning `{ userScopes, hasAccess, getMissingScopes }`
- [x] implement `RequireScopes` component with conditional rendering based on `hasAccess()`
- [x] write tests for `ScopesProvider` (provides scopes to children)
- [x] write tests for `useScopes()` (throws outside Provider, returns correct methods)
- [x] write tests for `hasAccess()` with various scope combinations
- [x] write tests for `RequireScopes` (shows children when has access, shows fallback when denied)
- [x] run `pnpm test` in `packages/kubb-client/` - must pass before Task 4

### Task 4: Setup scopes subpath exports in kubb-client

**Files:** `packages/kubb-client/src/scopes.ts`, `src/scopes-react.ts`, `package.json`, `tsup.config.ts`

- [x] create `src/scopes.ts` entry point exporting types and validation functions
- [x] create `src/scopes-react.ts` entry point exporting React components and hooks
- [x] update `package.json` exports to add `"./scopes"` and `"./scopes/react"` subpaths
- [x] update `tsup.config.ts` entry array to include `"src/scopes.ts"` and `"src/scopes-react.ts"`
- [x] run `pnpm build:lib` in `packages/kubb-client/` to verify build succeeds
- [x] manually verify generated `dist/scopes.d.ts` and `dist/scopes-react.d.ts` exist
- [x] write integration test importing from subpaths (`import { scope } from "@ovineko/kubb-client/scopes"`)
- [x] run `pnpm test` in `packages/kubb-client/` - must pass before Task 5

### Task 5: Create kubb-plugin-scopes package structure

**New package:** `packages/kubb-plugin-scopes/`

- [x] create package directory and copy template files from similar package (e.g., kubb-client)
- [x] create `package.json` with dependencies: `@kubb/core`, `@kubb/oas`, `@kubb/react-fabric` (updated from `@kubb/plugin-react` which doesn't exist at 4.37.2)
- [x] create `tsup.config.ts` for ESM build with entry `["src/index.ts"]`
- [x] create `vitest.config.ts` extending from `@ovineko/datamitsu-config`
- [x] create `tsconfig.json` extending from `@ovineko/datamitsu-config`
- [x] add workspace reference in root `pnpm-workspace.yaml` if not using glob pattern (already covered by `packages/*` glob)
- [x] run `pnpm install` at root to link workspace dependency
- [x] verify package structure with `pnpm list --depth=0` in new package directory

### Task 6: Implement scope extraction logic from OpenAPI security schemes

**Files:** `packages/kubb-plugin-scopes/src/utils/extractScopes.ts`

- [x] create `extractScopes(operation: Operation): string[]` function
- [x] implement OAuth2 detection: check `scheme?.type === 'oauth2'`
- [x] implement OpenID Connect detection: check `scheme?.type === 'openIdConnect'`
- [x] extract scopes from `operation.security` array (iterate requirements)
- [x] deduplicate scopes using `new Set()` before returning
- [x] handle edge case: no security schemes (return empty array)
- [x] handle edge case: security schemes without scopes (return empty array)
- [x] write tests for extractScopes with OAuth2 security scheme
- [x] write tests for extractScopes with OpenID Connect security scheme
- [x] write tests for extractScopes with mixed security schemes (OAuth2 + API key)
- [x] write tests for extractScopes with no security (empty array)
- [x] write tests for extractScopes with duplicate scopes (deduplication)
- [x] run `pnpm test` in `packages/kubb-plugin-scopes/` - must pass before Task 7

### Task 7: Implement React generator for scopes functions

**Files:** `packages/kubb-plugin-scopes/src/generators/scopes.tsx`

- [x] create `scopesGenerator` using `createReactGenerator<PluginScopesOptions>`
- [x] implement `operation()` hook to generate `getXxxScopes()` function per endpoint
- [x] use `extractScopes(operation)` to get scopes list
- [x] generate File with imports: `ApiScope` and `scope` from importPath
- [x] generate Function: `export function get${capitalize(operationId)}Scopes(): ApiScope[]`
- [x] generate return statement: `return [${scopes.map(s => scope("${s}")).join(", ")}];`
- [x] handle grouping by tags if `options.group?.type === "tag"` (delegated to plugin resolvePath in Task 8, as per Kubb pattern)
- [x] write integration test with mock Operation object (single scope)
- [x] write integration test with mock Operation object (multiple scopes)
- [x] write integration test with mock Operation object (no scopes)
- [x] verify generated code compiles (use TypeScript compiler API in test)
- [x] run `pnpm test` in `packages/kubb-plugin-scopes/` - must pass before Task 8

### Task 8: Implement plugin factory and register hooks

**Files:** `packages/kubb-plugin-scopes/src/index.ts`, `src/types.ts`

- [x] create `PluginScopesOptions` interface with `output.path`, `importPath`, `group?`
- [x] implement `pluginScopes()` factory using `definePlugin<PluginScopes>` (Kubb uses `definePlugin`, not `createPlugin`)
- [x] add `install()` hook with `OperationGenerator` that runs `scopesGenerator` (Kubb uses `install` lifecycle, not separate `buildStart`/`operation` hooks)
- [x] add `resolvePath()` and `resolveName()` hooks for file path resolution with group support
- [x] export plugin factory and name constant from index
- [x] write test creating plugin instance with minimal options
- [x] write test verifying plugin name is `"plugin-scopes"`
- [x] write tests for custom options, pre-dependencies, lifecycle hooks, and resolveName
- [x] run `pnpm test` in `packages/kubb-plugin-scopes/` - must pass before Task 9

### Task 9: Integrate scopes plugin into @ovineko/kubb defineConfig

**Files:** `packages/kubb/src/types.ts`, `src/index.ts`, `package.json`

- [ ] add `"@ovineko/kubb-plugin-scopes": "workspace:*"` to kubb package.json dependencies
- [ ] run `pnpm install` at root to link dependency
- [ ] import `pluginScopes` in `src/index.ts`: `import { pluginScopes } from "@ovineko/kubb-plugin-scopes"`
- [ ] extend `ConfigOptions` interface in `src/types.ts` with `scopes?: PluginOptionsEnabled<PluginScopesOptions>`
- [ ] add `PluginScopesOptions` type alias: `Required<Parameters<typeof pluginScopes>>[0]`
- [ ] add scopes plugin to plugins array in `defineConfig()` with conditional enable check
- [ ] pass `clientImportPath` (from `useOvinekoClient` flag) to plugin options
- [ ] set default output path: `{ path: "./scopes" }` and group: `{ type: "tag" }`
- [ ] write integration test generating code from mock OpenAPI spec with scopes enabled
- [ ] verify generated scopes files exist in output directory
- [ ] run `pnpm test` in `packages/kubb/` - must pass before Task 10

### Task 10: End-to-end integration test with real OpenAPI spec

**Files:** `packages/kubb-plugin-scopes/test/integration/`

- [ ] create minimal OpenAPI spec YAML with OAuth2 security scheme and scopes
- [ ] create test kubb.config.ts using `defineConfig` with `scopes: { enabled: true }`
- [ ] run Kubb generation programmatically in test (use Kubb API)
- [ ] verify generated scopes file exists at expected path
- [ ] read generated file and verify it contains `getXxxScopes()` function
- [ ] verify generated code imports from `@ovineko/kubb-client`
- [ ] compile generated code with TypeScript to verify no type errors
- [ ] write assertion checking function returns correct scopes array
- [ ] run `pnpm test` in `packages/kubb-plugin-scopes/` - must pass before Task 11

### Task 11: Verify acceptance criteria

- [ ] verify `client._setup.setScopes()` / `getScopes()` work as expected
- [ ] verify `scope()` helper creates type-safe ApiScope values
- [ ] verify `isAvailableScopes()` correctly handles OR-of-ANDs logic
- [ ] verify React `RequireScopes` component shows/hides children based on scopes
- [ ] verify React `useScopes()` hook returns correct access check functions
- [ ] verify Kubb plugin generates `getXxxScopes()` functions from OpenAPI spec
- [ ] verify generated functions return type-safe ApiScope arrays
- [ ] run full test suite in all 3 packages (kubb-client, kubb-plugin-scopes, kubb)
- [ ] run linter: `pnpm datamitsu lint` at root - all issues must be fixed
- [ ] verify test coverage meets 80%+ in kubb-client, 85%+ in kubb-plugin-scopes

### Task 12: Update documentation

- [ ] update `packages/kubb-client/README.md` with scopes usage section and example
- [ ] update `packages/kubb/README.md` with scopes plugin configuration example
- [ ] add JSDoc comments to all public APIs in scopes modules
- [ ] create example in `packages/kubb-client/` showing setup: `client._setup.setScopes()`
- [ ] create example showing React usage: `<RequireScopes>` and `useScopes()`
- [ ] verify all code examples in README compile and run correctly

---

## Technical Details

### Data Structures

**ApiScope phantom type:**

```typescript
export type ApiScope = string & { readonly __brand: unique symbol };
```

**OR-of-ANDs format:**

```typescript
// [[A, B], [C]] means "(A AND B) OR C"
type RequiredScopes = ApiScope[][];
```

**Client scopes state:**

```typescript
let currentScopes: ApiScope[] = []; // Internal state in createClient()
```

### Processing Flow

1. **User provides scopes:** `client._setup.setScopes([scope("users:read")])`
2. **Kubb generates scopes:** `function getUserScopes(): ApiScope[] { return [scope("users:read")]; }`
3. **React checks access:** `const { hasAccess } = useScopes(); hasAccess(getUserScopes())`
4. **SWR auto-checks:** `useSWR(hasAccess(...) ? key : null, fetcher)` (user's responsibility)

### Simple Access Logic

```typescript
// client.scopes = []  && request.scopes = []  → allow (no restrictions)
// client.scopes = []  && request.scopes != [] → deny (requirements exist but user has nothing)
// client.scopes != [] && request.scopes = []  → allow (no requirements)
// client.scopes != [] && request.scopes != [] → check with isAvailableScopes()
```

---

## Post-Completion

**Manual verification:**

- Test with real OpenAPI spec from user's project
- Verify SWR hooks correctly pause when scopes missing
- Verify React conditional rendering works in real app

**Consuming project updates:**

- User's project: enable `scopes: { enabled: true }` in kubb.config.ts
- User's project: add `client._setup.setScopes()` call after auth
- User's project: replace manual scope checks with generated `getXxxScopes()` functions
