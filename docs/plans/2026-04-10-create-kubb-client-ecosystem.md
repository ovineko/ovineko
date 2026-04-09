# Create @ovineko/kubb-client Ecosystem

## Overview

Create a type-safe HTTP client for Kubb-generated code that replaces the current Java-based OpenAPI Generator setup. This package provides:

- **Pure fetch HTTP client** with zero dependencies (no axios/ufetch)
- **Middleware architecture** for extensible request/response transformation
- **Built-in middleware**: Automatic X-Request-Id, Authorization headers, Sentry error reporting
- **Global + override pattern**: Singleton for SPA apps, per-request override for Node.js/SSR
- **React integration**: Hooks and context provider for client management
- **Kubb compatibility**: Drop-in replacement via `@kubb/plugin-client` importPath configuration

**Problem it solves:**

- **Performance**: Eliminates JVM startup overhead from Java-based OpenAPI Generator
- **Dependencies**: Removes heavy Java dependency from build environment
- **Developer experience**: Native TypeScript tooling, better IDE support
- **Maintenance**: Replaces error-prone Mustache template patching with simple TypeScript configuration
- **Flexibility**: Middleware pipeline allows custom request/response handling

**Integration:**
Generated code from @ovineko/kubb wrapper will import and use @ovineko/kubb-client automatically via configured importPath.

## Context

**Files/components involved:**

- New package: `packages/kubb-client/` (CREATE)
- Update: `packages/kubb/src/index.ts` (add client configuration)
- Update: `packages/kubb/src/types.ts` (add client options to ConfigOptions)

**Related patterns found:**

- Current implementation: `/home/shibanet0/ghq/gitlab.inovat-tech.com/frontend/inovat-front/api/api-base`
  - Middleware chain with pre/post/onError hooks
  - Global singleton pattern with `_setup` methods
  - Request ID generation (UUID with fallback)
  - Token management and realm roles subscription
  - Sentry middleware as separate module

**Dependencies identified:**

- `jwt-decode`: JWT token parsing
- `@sentry/browser`, `@sentry/react`: Optional dependencies for error reporting
- `react`: Peer dependency for React integration (optional)

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
- Maintain backward compatibility with Kubb's Client interface

## Testing Strategy

- **Unit tests**: required for every task (see Development Approach above)
  - Core client: request/response flow, error handling, header merging
  - Middleware orchestrator: execution order, early response, error recovery
  - Each middleware in isolation: requestId, auth, sentry
  - Singleton: global client management, reset functionality
- **Coverage target**: 80%+ lines/branches/functions/statements
- **Test framework**: Vitest (matches monorepo standard)
- **Mocking**: Mock fetch API, Sentry SDK calls

## Progress Tracking

- Mark completed items with `[x]` immediately when done
- Add newly discovered tasks with ➕ prefix
- Document issues/blockers with ⚠️ prefix
- Update plan if implementation deviates from original scope
- Keep plan in sync with actual work done

## What Goes Where

- **Implementation Steps** (`[ ]` checkboxes): tasks achievable within this codebase - code changes, tests, documentation updates
- **Post-Completion** (no checkboxes): items requiring external action - manual testing in consuming projects, deployment configs, third-party verifications

## Implementation Steps

### Task 1: Set up package structure and configuration

- [x] create `packages/kubb-client/` directory
- [x] create `packages/kubb-client/package.json` with exports, dependencies, scripts
- [x] create `packages/kubb-client/tsup.config.ts` with dual entry points (index.ts, react.ts)
- [x] create `packages/kubb-client/tsconfig.json` extending from datamitsu-config
- [x] create `packages/kubb-client/vitest.config.ts` for test setup
- [x] create `packages/kubb-client/src/` directory structure (core/, middleware/, react/)
- [x] write tests for package build configuration (verify dist output structure)
- [x] run build - must succeed and produce dist/index.js, dist/react.js, dist/\*.d.ts

### Task 2: Implement core type definitions

- [x] create `packages/kubb-client/src/core/types.ts`
- [x] define `RequestConfig<TData>` interface (matches Kubb expectations)
- [x] define `ResponseConfig<TData>` interface
- [x] define `ResponseErrorConfig<TError>` type
- [x] define `Client` type signature (CRITICAL: must match Kubb's Client type exactly)
- [x] define `ClientConfiguration` interface (baseUrl, headers, middleware, timeout)
- [x] define `ClientSetup` interface (use, remove, getConfig, setConfig methods)
- [x] define `ClientWithSetup` interface extending Client with \_setup
- [x] write tests verifying type compatibility with Kubb interfaces
- [x] run tests - must pass before task 3

### Task 3: Implement middleware system

- [x] create `packages/kubb-client/src/core/middleware.ts`
- [x] define `MiddlewareContext<TData, TVariables>` interface
- [x] define `Middleware` interface (name, onRequest, onResponse, onError hooks)
- [x] implement `MiddlewareOrchestrator` class with `use()` method
- [x] implement `MiddlewareOrchestrator.remove()` method
- [x] implement `MiddlewareOrchestrator.executeOnRequest()` with first→last order
- [x] implement `MiddlewareOrchestrator.executeOnResponse()` with last→first order
- [x] implement `MiddlewareOrchestrator.executeOnError()` with recovery support
- [x] write tests for middleware execution order (onRequest forward, onResponse reverse)
- [x] write tests for early response bypass in onRequest
- [x] write tests for error recovery in onError (Response return)
- [x] write tests for middleware add/remove functionality
- [x] run tests - must pass before task 4

### Task 4: Implement core HTTP client

- [x] create `packages/kubb-client/src/core/client.ts`
- [x] implement `parseResponse<TData>()` helper (arraybuffer, blob, text, json)
- [x] implement `createClient()` factory function
- [x] add baseUrl merging logic (use URL constructor)
- [x] add headers merging logic (default + request headers)
- [x] integrate middleware orchestrator into request flow
- [x] implement Phase 1: prepare config (merge baseUrl, headers)
- [x] implement Phase 2: execute onRequest middleware
- [x] implement Phase 3: execute fetch with proper RequestInit
- [x] implement Phase 4: parse response based on responseType
- [x] implement Phase 5: execute onResponse middleware
- [x] implement Phase 6: execute onError middleware on exceptions
- [x] attach `_setup` API to client (use, remove, getConfig, setConfig)
- [x] handle early response from middleware (skip fetch)
- [x] handle error recovery from middleware (Response return)
- [x] write tests for successful GET request flow
- [x] write tests for POST request with JSON body
- [x] write tests for POST request with FormData
- [x] write tests for baseUrl + relative URL merging
- [x] write tests for header merging (default + request)
- [x] write tests for early middleware response bypass
- [x] write tests for fetch errors caught by onError
- [x] write tests for different responseType parsing
- [x] run tests - must pass before task 5

### Task 5: Implement global singleton management

- [x] create `packages/kubb-client/src/core/singleton.ts`
- [x] implement `getGlobalClient()` with lazy initialization
- [x] implement `setGlobalClient()` for custom global client
- [x] implement `resetGlobalClient()` for testing
- [x] write tests for lazy initialization (first call creates client)
- [x] write tests for subsequent calls returning same instance
- [x] write tests for setGlobalClient override
- [x] write tests for resetGlobalClient cleanup
- [x] run tests - must pass before task 6

### Task 6: Implement Request ID middleware

- [x] create `packages/kubb-client/src/middleware/requestId.ts`
- [x] implement `generateRequestId()` with crypto.randomUUID
- [x] add fallback for environments without crypto.randomUUID
- [x] implement `createRequestIdMiddleware()` factory
- [x] add X-Request-Id header injection in onRequest hook
- [x] skip injection if header already present
- [x] write tests for UUID generation (verify format)
- [x] write tests for fallback request ID generation
- [x] write tests for header injection (not present)
- [x] write tests for header skip (already present)
- [x] run tests - must pass before task 7

### Task 7: Implement Auth middleware

- [ ] create `packages/kubb-client/src/middleware/auth.ts`
- [ ] define `AuthMiddlewareOptions` interface (getToken, prefix, skipPaths)
- [ ] implement `createAuthMiddleware()` factory
- [ ] implement path skipping logic (check skipPaths array)
- [ ] implement token retrieval (support sync and async getToken)
- [ ] implement Authorization header injection (Bearer prefix by default)
- [ ] skip injection if no token available
- [ ] write tests for Bearer token injection
- [ ] write tests for custom prefix (e.g., "Token")
- [ ] write tests for path skipping (/auth/login excluded)
- [ ] write tests for null token (no injection)
- [ ] write tests for async getToken
- [ ] run tests - must pass before task 8

### Task 8: Implement Sentry middleware

- [ ] create `packages/kubb-client/src/middleware/sentry.ts`
- [ ] define `SentryMiddlewareOptions` interface (Sentry, excludeUrls, maxBodySize, tags)
- [ ] implement `createSentryMiddleware()` factory
- [ ] add Sentry SDK availability check (console.warn if not found)
- [ ] implement onRequest hook (add breadcrumb for request)
- [ ] implement onResponse hook (add breadcrumb for response, level based on ok status)
- [ ] implement onError hook (captureException with context)
- [ ] add URL exclusion logic (check excludeUrls patterns)
- [ ] write tests for no-op when Sentry not available
- [ ] write tests for request breadcrumb creation
- [ ] write tests for response breadcrumb (info for 2xx, warning for 4xx/5xx)
- [ ] write tests for error capture with tags and context
- [ ] write tests for URL exclusion (matched patterns)
- [ ] run tests - must pass before task 9

### Task 9: Create middleware index and main entry point

- [ ] create `packages/kubb-client/src/middleware/index.ts`
- [ ] export all middleware factories (createRequestIdMiddleware, createAuthMiddleware, createSentryMiddleware)
- [ ] export all middleware option types
- [ ] create `packages/kubb-client/src/index.ts`
- [ ] call `getGlobalClient()` and export as default (for Kubb)
- [ ] export all singleton functions (createClient, getGlobalClient, setGlobalClient, resetGlobalClient)
- [ ] re-export all core types (Client, RequestConfig, ResponseConfig, etc.)
- [ ] re-export Middleware and MiddlewareContext types
- [ ] re-export all middleware factories
- [ ] write tests for default export (verify it's a Client instance)
- [ ] write tests for named exports availability
- [ ] run tests - must pass before task 10

### Task 10: Implement React integration

- [ ] create `packages/kubb-client/src/react.ts`
- [ ] create `ApiClientContext` with React.createContext
- [ ] implement `useApiClient()` hook (context or global fallback)
- [ ] implement `ApiClientProvider` component
- [ ] write tests for useApiClient (returns context client)
- [ ] write tests for useApiClient (returns global client when no context)
- [ ] write tests for ApiClientProvider (provides client to children)
- [ ] run tests - must pass before task 11

### Task 11: Create README documentation

- [ ] create `packages/kubb-client/README.md`
- [ ] add package description and key features
- [ ] add installation section (all 5 package managers: pnpm, npm, yarn, bun, deno)
- [ ] add basic setup example (configure baseUrl, middleware)
- [ ] add usage example with Kubb generated code
- [ ] add per-request override example (custom client)
- [ ] add React integration example (ApiClientProvider, useApiClient)
- [ ] add link to full documentation (ovineko.com)
- [ ] add MIT license notice

### Task 12: Update @ovineko/kubb wrapper for client integration

- [ ] update `packages/kubb/src/types.ts`
- [ ] add `useOvinekoClient?: boolean` to client plugin options in ConfigOptions
- [ ] update `packages/kubb/src/index.ts`
- [ ] compute `clientImportPath` based on `useOvinekoClient` flag
- [ ] pass `importPath: clientImportPath` to pluginClient configuration
- [ ] pass `importPath: clientImportPath` to pluginSwr client configuration
- [ ] write tests for defineConfig with useOvinekoClient=true (verify importPath set)
- [ ] write tests for defineConfig with useOvinekoClient=false (verify no importPath)
- [ ] run tests - must pass before task 13

### Task 13: Build and verify packages

- [ ] run `pnpm build:lib` in packages/kubb-client
- [ ] verify dist/index.js exists and is valid ESM
- [ ] verify dist/index.d.ts exists with all type exports
- [ ] verify dist/react.js exists and is valid ESM
- [ ] verify dist/react.d.ts exists with React types
- [ ] run `pnpm build:lib` in packages/kubb
- [ ] verify updated kubb wrapper builds successfully
- [ ] run full test suite for kubb-client (pnpm test)
- [ ] run full test suite for kubb wrapper (pnpm test)
- [ ] verify test coverage meets 80%+ threshold
- [ ] run linter on both packages (pnpm lint)
- [ ] fix any linting issues

### Task 14: Integration testing with Kubb code generation

- [ ] create `packages/kubb-client/test-integration/` directory
- [ ] add sample OpenAPI spec (petstore.yaml or minimal spec)
- [ ] create kubb.config.ts using @ovineko/kubb wrapper with useOvinekoClient=true
- [ ] run kubb generate to create test API client code
- [ ] verify generated code imports from "@ovineko/kubb-client"
- [ ] verify generated code can make requests (mock fetch in test)
- [ ] write integration test that uses generated client + middleware
- [ ] run integration tests - must pass

### Task 15: Update documentation

- [ ] update root README.md if kubb-client is major addition
- [ ] update CLAUDE.md with kubb-client package info
- [ ] add kubb-client to "Project Overview" section
- [ ] document middleware architecture and patterns
- [ ] add known pitfalls for kubb-client if discovered during implementation

_Note: ralphex automatically moves completed plans to `docs/plans/completed/`_

## Technical Details

### Type Compatibility with Kubb

**CRITICAL**: The `Client` type signature MUST match Kubb's expectations exactly:

```typescript
export type Client = <TData, TError = unknown, TVariables = unknown>(
  config: RequestConfig<TVariables>,
) => Promise<ResponseConfig<TData>>;
```

**Generated code from Kubb** will call the client like this:

```typescript
import client from "@ovineko/kubb-client";

const response = await client<GetPetByIdResponse>({
  method: "GET",
  url: "/pet/123",
});
```

### Middleware Execution Flow

1. **onRequest** (first → last): Request transformation, header injection
   - Can return `Response` to bypass fetch (caching)
   - Runs before network call

2. **fetch()**: Native fetch API call

3. **onResponse** (last → first): Response transformation, logging
   - Runs for ALL responses (including 4xx/5xx)
   - HTTP error codes are NOT caught by onError

4. **onError** (any order): Exception handling
   - Only for network errors, timeouts, parse failures
   - Can return `Response` to recover from error
   - NOT called for HTTP 4xx/5xx status codes

### Data Structures

**RequestConfig**: Matches Kubb's interface

- `url?: string` - relative or absolute URL
- `method: "GET" | "PUT" | "PATCH" | "POST" | "DELETE"`
- `params?: Record<string, any>` - query parameters
- `data?: TData | FormData` - request body
- `responseType?: "arraybuffer" | "blob" | "json" | "text"`
- `signal?: AbortSignal` - for request cancellation
- `headers?: HeadersInit` - request headers

**ResponseConfig**: Successful response wrapper

- `data: TData` - parsed response body
- `status: number` - HTTP status code
- `statusText: string` - HTTP status text

**ClientConfiguration**: Client setup

- `baseUrl?: string` - prepended to all relative URLs
- `headers?: HeadersInit` - default headers for all requests
- `middleware?: Middleware[]` - middleware to register on creation
- `timeout?: number` - request timeout (future enhancement)

## Post-Completion

_Items requiring manual intervention or external systems - no checkboxes, informational only_

**Manual verification:**

- Test kubb-client in real SPA application (browser environment)
- Test per-request client override in Node.js/SSR environment
- Verify Sentry error reporting works correctly with real Sentry SDK
- Performance testing: compare build times vs Java OpenAPI Generator
- Bundle size analysis: ensure no unexpected dependencies bundled

**External system updates:**

- Consuming projects using OpenAPI Generator will need migration
  - Update imports from generated controllers to generated functions
  - Replace Configuration instantiation with client.\_setup.setConfig()
  - Replace controller method calls with generated function calls
- CI/CD pipelines may need Java dependency removal
- Documentation website needs new page for @ovineko/kubb-client

**Future enhancements (out of scope):**

- Timeout support in ClientConfiguration
- Request retry with exponential backoff
- Request deduplication for identical concurrent requests
- Cache middleware (in-memory or localStorage-based)
- OpenTelemetry tracing middleware
- Realm roles integration with scopes (currently in React integration but could be enhanced)
