# Implement ForceRetryError, appName, and BeaconError for spa-guard

## Overview

Add three features to @ovineko/spa-guard based on TODO.md analysis (verified against actual codebase):

1. ForceRetryError - typed error class that triggers auto-retry without forceRetry config
2. appName option - beacon source identification for monorepo setups
3. BeaconError - utility class for error tracking service integration (Sentry, Datadog, etc.)

## Context

- Files involved: shouldIgnore.ts, options.ts, sendBeacon.ts, schema/index.ts, fastify/index.ts, common/index.ts, runtime/index.ts, react/index.tsx, vite-plugin/index.ts
- Related patterns: vitest with vi.mock(), Typebox schemas, window-based config via getOptions(), event-driven architecture
- Dependencies: No new external dependencies required
- The errors/ directory under common/ does not exist yet and must be created
- beaconSchema uses additionalProperties: false, so appName must be added to schema before sendBeacon can include it
- VitePluginOptions extends Options, so appName flows automatically through the vite plugin

## Development Approach

- **Testing approach**: TDD where practical (write tests alongside implementation)
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: ForceRetryError class

**Files:**

- Create: `packages/spa-guard/src/common/errors/ForceRetryError.ts`
- Create: `packages/spa-guard/src/common/errors/ForceRetryError.test.ts`
- Modify: `packages/spa-guard/src/common/shouldIgnore.ts` (add magic substring to forceRetry patterns)
- Modify: `packages/spa-guard/src/common/shouldIgnore.test.ts` (add ForceRetryError integration tests)
- Modify: `packages/spa-guard/src/common/index.ts` (export ForceRetryError)
- Modify: `packages/spa-guard/src/runtime/index.ts` (re-export ForceRetryError)
- Modify: `packages/spa-guard/src/react/index.tsx` (re-export ForceRetryError)

- [x] Create ForceRetryError class with magic substring `__SPA_GUARD_FORCE_RETRY__` prepended to message
- [x] Update shouldForceRetry() in shouldIgnore.ts to always include the magic substring in patterns
- [x] Add exports from common/index.ts, runtime/index.ts, react/index.tsx
- [x] Write unit tests for ForceRetryError (instanceof, name, message, magic substring)
- [x] Write integration tests in shouldIgnore.test.ts (ForceRetryError triggers shouldForceRetry without config)
- [x] Run test suite - must pass before task 2

### Task 2: appName option for beacon source identification

**Files:**

- Modify: `packages/spa-guard/src/common/options.ts` (add appName to Options interface)
- Modify: `packages/spa-guard/src/schema/index.ts` (add appName to beaconSchema)
- Modify: `packages/spa-guard/src/common/sendBeacon.ts` (enrich beacon with appName from options)
- Modify: `packages/spa-guard/src/common/sendBeacon.test.ts` (test appName inclusion/exclusion)
- Modify: `packages/spa-guard/src/fastify/index.ts` (log appName in default beacon handler)

- [x] Add `appName?: string` to Options interface in options.ts
- [x] Add `appName: Type.Optional(Type.String())` to beaconSchema in schema/index.ts
- [x] Update sendBeacon.ts to enrich beacon payload with appName from getOptions()
- [x] Update fastify plugin default logging to include appName
- [x] Write tests for sendBeacon with and without appName configured
- [x] Run test suite - must pass before task 3

### Task 3: BeaconError utility class

**Files:**

- Create: `packages/spa-guard/src/common/errors/BeaconError.ts`
- Create: `packages/spa-guard/src/common/errors/BeaconError.test.ts`
- Modify: `packages/spa-guard/src/common/index.ts` (export BeaconError)
- Modify: `packages/spa-guard/src/fastify/index.ts` (re-export BeaconError)

- [x] Create BeaconError class that wraps BeaconSchema into structured Error with typed properties (appName, errorMessage, eventName, retryAttempt, retryId, serialized, eventMessage) and toJSON()
- [x] Export from common/index.ts and fastify/index.ts
- [x] Write unit tests covering: full beacon, partial beacon, instanceof checks, toJSON output
- [x] Run test suite - must pass before task 4

### Task 4: Verify acceptance criteria

- [x] Run full test suite: `npm test` in packages/spa-guard
- [x] Run type checking: `npm run typecheck` in packages/spa-guard
- [x] Run build: `npm run build` in packages/spa-guard
- [x] Verify ForceRetryError is exported from common, runtime, and react entry points
- [x] Verify BeaconError is exported from common and fastify entry points
- [x] Verify test coverage meets 80%+

### Task 5: Update documentation

- [ ] Update README.md with ForceRetryError usage examples
- [ ] Update README.md with appName configuration examples (vite plugin + backend)
- [ ] Update README.md with BeaconError integration examples (Sentry, Datadog)
- [ ] Move this plan to `docs/plans/completed/`
