# SWR Scoped Hooks Generation

## Overview

Add automatic SWR scoped hook generation to `@ovineko/kubb-plugin-scopes`. This eliminates the need to manually pass `isPaused: () => !hasAccess(...)` in every SWR hook call, providing the same automatic scope-based authorization that the user currently has in their openapi-generator project.

**Problem it solves**: Users must manually check scopes in every SWR hook call, which is tedious and error-prone.

**Key benefits**:

- Automatic scope checking without boilerplate
- Type-safe wrapper hooks generated from OpenAPI security schemes
- Opt-in feature (backward compatible)

**Integration**: Adds a second generator to the existing kubb-plugin-scopes package, runs conditionally when `generateSwrWrappers: true`

## Context (from discovery)

**Files/components involved**:

- `packages/kubb-plugin-scopes/src/plugin.ts` - Add second generator invocation
- `packages/kubb-plugin-scopes/src/types.ts` - New config options
- New files: `determineHookType.ts`, `swrScopeCodegen.ts`, `swrScopes.tsx`

**Related patterns found**:

- Existing `scopesGenerator` in `src/generators/scopes.tsx` follows Kubb's `createReactGenerator` pattern
- `OperationGenerator.build()` pattern for multi-generator support
- Barrel imports used for generated code (`from "../hooks"`, `from "../scopes"`)

**Dependencies identified**:

- Requires `@kubb/plugin-swr` to be enabled (original hooks must exist)
- Requires existing OAuth scopes implementation (kubb-client scopes API)
- Uses `extractScopes()` utility from existing codebase

## Development Approach

- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- Make small, focused changes
- **CRITICAL: every task MUST include new/updated tests** for code changes in that task
  - tests are not optional - they are a required part of the checklist
  - write unit tests for new functions/methods
  - write unit tests for modified functions/methods
  - add new test cases for new code paths
  - update existing test cases if behavior changes
  - tests cover both success and error scenarios
- **CRITICAL: all tests must pass before starting next task** - no exceptions
- **CRITICAL: update this plan file when scope changes during implementation**
- Run tests after each change
- Maintain backward compatibility (all new features opt-in)

## Testing Strategy

- **Unit tests**: required for every task
  - `determineHookType.test.ts` - HTTP method classification (GET→query, POST/PUT/PATCH/DELETE→mutation)
  - `swrScopeCodegen.test.ts` - Code generation logic (query vs mutation bodies, null for no scopes)
  - `swrScopes.test.ts` - Generator structure validation
- **Integration tests**: verify generated files structure and imports
  - File existence checks (hooks-scoped directory, scoped hook files)
  - Generated code structure (imports, params, shouldFetch logic)
  - Barrel file generation
- **E2E tests**: not applicable (this is a code generation tool)

## Progress Tracking

- Mark completed items with `[x]` immediately when done
- Add newly discovered tasks with ➕ prefix
- Document issues/blockers with ⚠️ prefix
- Update plan if implementation deviates from original scope
- Keep plan in sync with actual work done

## What Goes Where

- **Implementation Steps** (`[ ]` checkboxes): tasks achievable within this codebase - code changes, tests, documentation updates
- **Post-Completion** (no checkboxes): items requiring external action - manual testing, changes in consuming projects, deployment configs, third-party verifications

## Implementation Steps

### Task 1: Add hook type detection utility

- [x] create `packages/kubb-plugin-scopes/src/utils/determineHookType.ts` with `determineHookType(operation)` function
- [x] implement logic: GET operations return "query", POST/PUT/PATCH/DELETE return "mutation"
- [x] export `HookType` type ("query" | "mutation")
- [x] write tests for GET method (returns "query")
- [x] write tests for POST, PUT, PATCH, DELETE methods (return "mutation")
- [x] write tests for case insensitivity (lowercase "get" → "query")
- [x] run tests - must pass before task 2

### Task 2: Add SWR scope code generation utility

- [x] create `packages/kubb-plugin-scopes/src/generators/swrScopeCodegen.ts` with `generateSwrScopeCode()` function
- [x] implement query hook body generation (accepts params, spreads options, calls originalHook with params)
- [x] implement mutation hook body generation (no params, spreads options, calls originalHook with options only)
- [x] use existing `extractScopes()` to check for scopes, return null if none
- [x] generate `SwrScopeCodegenResult` with functionBody, imports, hookType, names
- [x] write tests for query hook generation with OAuth2 security (GET /pets with scopes)
- [x] write tests for mutation hook generation (POST /pets with scopes)
- [x] write tests for operations without scopes (returns null)
- [x] write tests for different HTTP methods (PUT, DELETE)
- [x] run tests - must pass before task 3

### Task 3: Update types for new configuration options

- [x] modify `packages/kubb-plugin-scopes/src/types.ts` interface `Options`
- [x] add `generateSwrWrappers?: boolean` (default false for backward compatibility)
- [x] add `scopesReactImportPath?: string` (default "@ovineko/kubb-client/scopes/react")
- [x] add `swrWrappersOutputPath?: string` (default "hooks-scoped")
- [x] update resolved options passed to plugin to include these fields
- [x] no tests needed (type-only changes)

### Task 4: Create SWR scopes generator (React component)

- [x] create `packages/kubb-plugin-scopes/src/generators/swrScopes.tsx` using `createReactGenerator<PluginScopes>`
- [x] implement Operation hook that calls `generateSwrScopeCode()` with operation and scopesReactImportPath
- [x] return null when `generateSwrScopeCode()` returns null (skip file generation for ops without scopes)
- [x] use `useOperationManager` to get `getName()` and `getFile()` utilities
- [x] generate File with 3 imports: `originalHook` from "../hooks", `scopeGetter` from "../scopes", `useScopes` from config path
- [x] generate Function with name `use{OperationName}Scoped`, params based on hookType, returnType from originalHook
- [x] for query hooks: params = `params?, options?` with types `Parameters<typeof originalHook>[0]` and omit shouldFetch from [1]
- [x] for mutation hooks: params = `options?` with type omit shouldFetch from `Parameters<typeof originalHook>[0]`
- [x] write tests for generator name ("plugin-scopes-swr"), type ("react"), version
- [x] write tests that Operation hook is defined
- [x] run tests - must pass before task 5

### Task 5: Integrate second generator into plugin

- [ ] modify `packages/kubb-plugin-scopes/src/plugin.ts` to extract `generateSwrWrappers`, `scopesReactImportPath`, `swrWrappersOutputPath` from options
- [ ] add import for `swrScopesGenerator` from "./generators/swrScopes.js"
- [ ] after first generator completes (after barrel files), add conditional block for `if (generateSwrWrappers)`
- [ ] inside conditional: create second `OperationGenerator` instance with mode for `swrWrappersOutputPath`
- [ ] call `.build(swrScopesGenerator)` and upsert files
- [ ] generate barrel files for hooks-scoped directory using `getBarrelFiles()` with swrWrappersOutputPath
- [ ] update plugin options object to include new config fields
- [ ] run project tests in kubb-plugin-scopes - must pass before task 6

### Task 6: Add integration tests for scoped hooks

- [ ] modify `packages/kubb-plugin-scopes/test-integration/kubb.config.ts` to enable SWR: `swr: { disabled: false }`
- [ ] set `generateSwrWrappers: true` in scopes plugin config
- [ ] ensure test OpenAPI spec has operations with OAuth2 security (listPets, createPet, etc.)
- [ ] write integration tests verifying hooks-scoped directory exists
- [ ] write tests verifying query hook files exist (useListPetsScoped.ts)
- [ ] write tests verifying mutation hook files exist (useCreatePetScoped.ts)
- [ ] write tests checking query hook structure: imports originalHook, scopeGetter, useScopes; has params and options
- [ ] write tests checking mutation hook structure: no params parameter, only options
- [ ] write tests verifying barrel files generated in hooks-scoped/index.ts
- [ ] run integration tests - must pass before task 7

### Task 7: Verify acceptance criteria

- [ ] verify scoped hooks auto-check scopes without manual isPaused in user code
- [ ] verify backward compatibility: `generateSwrWrappers: false` (default) produces no hooks-scoped directory
- [ ] verify type safety: TypeScript infers types correctly from originalHook via Parameters/ReturnType
- [ ] verify operations without scopes do not generate scoped hooks (no unnecessary files)
- [ ] run full test suite (unit + integration tests)
- [ ] run linter - all issues must be fixed
- [ ] verify test coverage meets project standard (80%+)

### Task 8: [Final] Update documentation

- [ ] update `packages/kubb-plugin-scopes/README.md` with SWR scoped hooks section
- [ ] add configuration example showing `generateSwrWrappers: true` option
- [ ] add usage example comparing manual isPaused approach vs scoped hooks
- [ ] document requirement: SWR plugin must be enabled (`swr: { disabled: false }`)
- [ ] add JSDoc comments to `determineHookType()` explaining query vs mutation detection
- [ ] add JSDoc comments to `generateSwrScopeCode()` explaining return value and null case
- [ ] add JSDoc comments to `swrScopesGenerator` explaining purpose and when files are generated

_Note: ralphex automatically moves completed plans to `docs/plans/completed/`_

## Technical Details

### Two-Generator Architecture

The plugin uses a two-generator pattern with sequential `.build()` calls:

1. **Generator 1 (existing)**: `scopesGenerator` creates scope getter functions
   - Output: `scopes/petScopes/listPets.ts` with `getListPetsScopes(): ApiScope[]`

2. **Generator 2 (new)**: `swrScopesGenerator` creates scoped hook wrappers
   - Output: `hooks-scoped/petHooks/useListPetsScoped.ts`
   - Only runs when `generateSwrWrappers: true`

Both generators iterate all operations independently. Each has its own barrel file generation.

### Generated Code Structure

**Query Hook (GET operation)**:

```typescript
import { useListPets as originalHook } from "../hooks";
import { getListPetsScopes } from "../scopes";
import { useScopes } from "@ovineko/kubb-client/scopes/react";

export function useListPetsScoped(
  params?: Parameters<typeof originalHook>[0],
  options?: Omit<Parameters<typeof originalHook>[1], "shouldFetch"> & { shouldFetch?: boolean },
): ReturnType<typeof originalHook> {
  const { hasAccess } = useScopes();
  const requiredScopes = getListPetsScopes();
  const hasRequiredAccess = hasAccess(requiredScopes);

  return originalHook(params, {
    ...options,
    shouldFetch: hasRequiredAccess && (options?.shouldFetch ?? true),
  });
}
```

**Mutation Hook (POST/PUT/PATCH/DELETE operation)**:

```typescript
export function useCreatePetScoped(
  options?: Omit<Parameters<typeof originalHook>[0], "shouldFetch"> & { shouldFetch?: boolean },
): ReturnType<typeof originalHook> {
  const { hasAccess } = useScopes();
  const requiredScopes = getCreatePetScopes();
  const hasRequiredAccess = hasAccess(requiredScopes);

  return originalHook({
    ...options,
    shouldFetch: hasRequiredAccess && (options?.shouldFetch ?? true),
  });
}
```

### Import Path Strategy

Use barrel imports for simplicity and maintainability:

- Original SWR hooks: `from "../hooks"` (relies on barrel file)
- Scope getter functions: `from "../scopes"` (relies on barrel file)
- useScopes hook: `from "@ovineko/kubb-client/scopes/react"` (configurable via `scopesReactImportPath`)

Avoid direct imports like `from "../../hooks/petHooks/useListPets"` - they're brittle and harder to maintain.

### Directory Structure After Generation

```
gen/
├── hooks/              # Original SWR hooks (@kubb/plugin-swr)
│   ├── petHooks/
│   │   ├── useListPets.ts
│   │   ├── useCreatePet.ts
│   │   └── useGetPetById.ts
│   └── index.ts        # Barrel file
├── scopes/             # Scope functions (generator 1)
│   ├── petScopes/
│   │   ├── listPets.ts          (exports getListPetsScopes)
│   │   ├── createPet.ts         (exports getCreatePetScopes)
│   │   └── getPetById.ts        (exports getGetPetByIdScopes)
│   └── index.ts        # Barrel file
└── hooks-scoped/       # NEW: Scoped wrappers (generator 2)
    ├── petHooks/
    │   ├── useListPetsScoped.ts
    │   ├── useCreatePetScoped.ts
    │   └── useGetPetByIdScoped.ts
    └── index.ts        # Barrel file
```

### Type Safety Strategy

Use TypeScript's built-in type inference to avoid type duplication:

- `Parameters<typeof originalHook>` - extracts parameter types from imported hook
- `ReturnType<typeof originalHook>` - extracts return type from imported hook
- `Omit<T, 'shouldFetch'> & { shouldFetch?: boolean }` - removes shouldFetch, re-adds as optional

This ensures:

1. No manual type definitions needed
2. Automatic updates when original hook types change
3. Full type safety in user code

### Edge Cases Handled

1. **No scopes**: `extractScopes()` returns empty array → `generateSwrScopeCode()` returns null → no file generated
2. **SWR plugin disabled**: Build fails with clear error when importing non-existent hooks (documented as requirement)
3. **Mixed security** (OAuth2 + API Key): Only OAuth2 scopes extracted (existing `extractScopes()` behavior)
4. **Custom grouping**: Both generators respect the `group` option from plugin config
5. **Empty OpenAPI spec**: No files generated by either generator (safe, no errors)

## Post-Completion

_Items requiring manual intervention or external systems - no checkboxes, informational only_

**Manual verification**:

- Test with real OpenAPI spec containing OAuth2 security schemes (GET, POST, PUT, DELETE operations)
- Verify generated hooks compile without TypeScript errors
- Verify scoped hooks correctly prevent fetching when user lacks required scopes
- Compare generated code with user's existing openapi-generator project for feature parity
- Test in actual React app: verify `useListPetsScoped()` works without manual isPaused

**External system updates**:

- None required (all changes are internal to kubb-plugin-scopes package)
- User projects will need to update kubb.config to enable feature: `scopes: { generateSwrWrappers: true }`
