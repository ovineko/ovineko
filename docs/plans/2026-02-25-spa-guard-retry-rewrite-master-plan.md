---
# SPA Guard Retry Rewrite (Single Master Plan)

## Intent
Full rewrite of retry/fallback pipeline for alpha version.

Constraints:
- No backward compatibility requirements.
- We can break and redesign internal/public APIs freely.
- Goal is simpler architecture with one retry owner and explicit lifecycle.

## Problems to eliminate
- Retry logic is spread across listeners/reload/url-state/recovery modules.
- Multiple state sources (URL sentinel, fallback flag, timers, storage) drift and race.
- Duplicate triggers (error storms) are handled ad-hoc.
- `vite:preloadError` and malformed URL params can trigger unsafe behavior.
- Fallback lock can become inconsistent with rendered UI.

## Target Architecture

### 1) Single retry owner
- New module: `spa-guard/spa-guard/src/common/retryOrchestrator.ts`
- Only this module can:
  - accept retry triggers
  - dedupe concurrent triggers
  - schedule reload
  - transition to fallback
  - serialize state to URL
  - re-arm retries after healthy recovery

### 2) Explicit state machine
- `phase`: `idle | scheduled | fallback`
- `attempt`: number
- `retryId`: string | null
- `timer`: timeout handle | null
- Optional debug metadata: last source/time

No sentinel semantics in core state.

### 3) Listener responsibilities
- `listen/internal.ts` only classifies browser events:
  - ignore/filter?
  - send beacon?
  - dispatch to orchestrator?
- No direct retry scheduling from listeners.
- No retry lifecycle cleanup logic in listeners.

### 4) Rendering separation
- Fallback/loading UI rendering stays in dedicated helpers.
- Rendering must not own lifecycle decisions.
- Orchestrator decides lifecycle; renderer only draws.

## New API Surface (breaking change allowed)
- `triggerRetry(input): TriggerResult`
- `markRetryHealthyBoot(): void`
- `getRetrySnapshot(): RetrySnapshot`
- `resetRetryOrchestratorForTests(): void`

`attemptReload`/legacy flow can be removed or replaced directly where used.

## Rewrite Scope
- `spa-guard/spa-guard/src/common/listen/internal.ts`
- `spa-guard/spa-guard/src/common/reload.ts`
- `spa-guard/spa-guard/src/common/retryState.ts`
- `spa-guard/spa-guard/src/common/staticAssetRecovery.ts`
- `spa-guard/spa-guard/src/common/lastReloadTime.ts` (either absorb or simplify)
- related tests under `src/common/*.test.ts`
- docs: `AGENTS.md`, `spa-guard/spa-guard/README.md`

## Implementation Tasks

### Task 1: Build retryOrchestrator from scratch
- [x] Create orchestrator state machine and public functions.
- [x] Implement dedupe: first trigger wins, concurrent triggers are ignored/logged.
- [x] Implement retry progression, delay scheduling, and reload URL building.
- [x] Implement fallback transition and lock behavior.

### Task 2: Move URL state behind orchestrator
- [x] Keep URL as serialization layer only.
- [x] Remove sentinel lifecycle logic from listeners.
- [x] Remove `-1` sentinel control flow from runtime decisions.
- [x] Strict-parse URL retry params (`-1` no longer needed as control signal).

### Task 3: Refactor event listeners to pure classification
- [x] Replace direct `attemptReload` calls with orchestrator trigger calls.
- [x] Guard `vite:preloadError` with minimal validity checks.
- [x] Keep beacon behavior explicit and independent from scheduling internals.

### Task 4: Refactor static asset recovery integration
- [x] `staticAssetRecovery` triggers orchestrator with `source=static-asset-error`.
- [x] Preserve burst coalescing and cache-bust behavior via orchestrator input.
- [x] Ensure storms do not schedule multiple retries.

### Task 5: Refactor fallback rendering contract
- [x] Remove lifecycle mutations from rendering helpers.
- [x] Ensure fallback lock cannot be set without a successful lifecycle transition.
- [x] Ensure misconfigured fallback UI fails safely (no silent deadlock).

### Task 6: Remove obsolete primitives
- [x] Delete or collapse no-longer-needed state keys/constants.
- [x] Remove stale modules/branches tied to sentinel cleanup behavior.
- [x] Update exports (`common/index.ts`, `_internal.ts`) to new API.

### Task 7: Test rewrite (mandatory)
- [ ] Add orchestrator unit tests for all phase transitions.
- [ ] Add concurrency tests: 20 rapid triggers => 1 schedule.
- [ ] Add recovery tests: fallback lock, healthy re-arm.
- [ ] Add malformed URL tests (`1foo`, `-1abc`, `1.5`, `1e2`).
- [ ] Update listener tests to assert delegation, not hidden retry internals.

### Task 8: Documentation rewrite
- [ ] Update `AGENTS.md` architecture notes and pitfalls.
- [ ] Update package README retry behavior and event flow.
- [ ] Document new retry ownership rule: only orchestrator controls lifecycle.

## Acceptance Criteria
- Retry lifecycle is owned by one module and one API.
- No sentinel cleanup race exists.
- Error storms cannot schedule multiple retries.
- Fallback lock and recovery are explicit and deterministic.
- Misconfigured fallback UI does not create silent permanent lock.
- URL retry parsing is strict and resilient to malformed query values.
- Test suite for retry pipeline passes with new architecture.
---
