---
# Fix packages/spa-guard README accuracy

## Overview
Update README.md to match the current source code. Four categories of discrepancies found: missing BeaconSchema fields, incorrect FastifySPAGuardOptions signatures, incomplete FallbackProps interface, and missing fastify-plugin peer dep info.

## Context
- Files involved: `packages/spa-guard/README.md`
- Source of truth files checked:
  - `src/schema/index.ts` — BeaconSchema type
  - `src/fastify/index.ts` — FastifySPAGuardOptions interface
  - `src/react-error-boundary/index.tsx` — ErrorBoundaryProps, FallbackProps
  - `package.json` — peer dependencies

## Discrepancies found
1. BeaconSchema missing two fields in two README sections (Fastify Integration and Types):
   - `retryAttempt?: number`
   - `retryId?: string`
2. FastifySPAGuardOptions signatures are wrong in two places (Quick Start example and API Reference):
   - callbacks only show 2 params but actual is 3: `(beacon, request: FastifyRequest, reply: FastifyReply)`
   - return type is `void` but actual is `BeaconHandlerResult | void` where `BeaconHandlerResult = { skipDefaultLog?: boolean }`
   - README uses `request: any` instead of `FastifyRequest`
   - `BeaconHandlerResult` is not documented at all
3. React ErrorBoundary docs are inaccurate:
   - `ErrorBoundaryProps.fallback` type: README shows `React.ComponentType<FallbackProps>`, actual is `((props: FallbackProps) => React.ReactElement) | React.ComponentType<FallbackProps>`
   - Custom fallback example missing `spaGuardState: SpaGuardState` and `errorInfo: null | React.ErrorInfo` from FallbackProps destructuring
4. Module exports table shows `fastify@^4 || ^5` for `./fastify` but `fastify-plugin@^4 || ^5` is also a peer dep

## Development Approach
- Testing approach: N/A (documentation only, no code changes)
- Complete each task fully before moving to the next

## Implementation Steps

### Task 1: Fix BeaconSchema in both documentation sections

**Files:**
- Modify: `packages/spa-guard/README.md`

- [x] Add `retryAttempt?: number; // Current retry attempt at time of beacon` and `retryId?: string; // ID of the retry cycle` to the "Fastify Integration > BeaconSchema structure" block (around line 373)
- [x] Add same fields to the "Types > BeaconSchema" block in API Reference (around line 1015)

### Task 2: Fix FastifySPAGuardOptions interface and examples

**Files:**
- Modify: `packages/spa-guard/README.md`

- [x] Update Quick Start Fastify example to use 3-param callback signature `(beacon, request, reply)`
- [x] Update "Fastify Integration" detailed example to use 3-param callback signature
- [x] Update `FastifySPAGuardOptions` in API Reference to show correct types (`FastifyRequest`, `FastifyReply`, `BeaconHandlerResult | void`)
- [x] Add `BeaconHandlerResult` interface documentation (`{ skipDefaultLog?: boolean }`) with brief explanation

### Task 3: Fix React ErrorBoundary documentation

**Files:**
- Modify: `packages/spa-guard/README.md`

- [ ] Fix `ErrorBoundaryProps.fallback` type to `((props: FallbackProps) => React.ReactElement) | React.ComponentType<FallbackProps>`
- [ ] Add `spaGuardState: SpaGuardState` and `errorInfo: null | React.ErrorInfo` to FallbackProps in the custom fallback example

### Task 4: Fix module table peer deps for fastify

**Files:**
- Modify: `packages/spa-guard/README.md`

- [ ] Update `./fastify` row in module exports table to list `fastify@^4 \|\| ^5, fastify-plugin@^4 \|\| ^5`

### Task 5: Verify no other discrepancies remain

- [ ] Re-read all modified sections and verify they match the source code
- [ ] Move this plan to `docs/plans/completed/`
---
