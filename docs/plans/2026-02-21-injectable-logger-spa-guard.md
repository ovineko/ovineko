# Injectable Logger System for spa-guard

## Overview

Replace all direct `console.*` calls across spa-guard modules with an injectable Logger system using dependency injection (following the existing `serializeError` DI pattern). Production inline build gets no logger = no log strings in bundle. Trace/runtime builds get full logging via `createLogger()`.

Two-part hybrid approach:

1. Event auto-logging: `emitEvent()` calls `logger.logEvent(event)` automatically - all 8 event types get formatted log output. Formatting strings live in `logger.ts`, not in the modules that emit events.
2. Injectable utility with specific methods: Logger interface has named methods per non-event log point (e.g. `capturedError(type, event)`, `noFallbackConfigured()`, `beaconSendFailed(error)`). All message text lives inside `createLogger()`, NOT at call sites. Call sites pass only data (numbers, existing variables, event objects).

Key optimization: production inline entry does NOT import `logger.ts` -> tree-shaking eliminates all log strings from the bundle. Currently terser `drop_console: true` strips `console.*` post-hoc; the new approach eliminates strings at the source level via DI, making `drop_console` a safety net only.

## Current State Analysis

27 `console.*` calls across 5 modules:

- `listen/internal.ts`: 5 calls (raw browser error logging + retry limit check)
- `reload.ts`: 9 calls (3 redundant with events + 6 operational/config)
- `sendBeacon.ts`: 2 calls (config warning + send failure)
- `checkVersion.ts`: 11 calls (config, operational, notifications)
- `retryImport.ts`: 0 calls, only emits events -> silent in console

Problems:

- retryImport events produce zero console output
- reload.ts logs the same info twice (console + event)
- No way to toggle logging independently of terser

## Context

Files involved:

- Create: `packages/spa-guard/src/common/logger.ts`
- Modify: `packages/spa-guard/src/common/events/internal.ts`
- Modify: `packages/spa-guard/src/common/events/types.ts`
- Modify: `packages/spa-guard/src/common/constants.ts`
- Modify: `packages/spa-guard/src/common/listen/internal.ts`
- Modify: `packages/spa-guard/src/common/listen/index.ts`
- Modify: `packages/spa-guard/src/common/reload.ts`
- Modify: `packages/spa-guard/src/common/sendBeacon.ts`
- Modify: `packages/spa-guard/src/common/checkVersion.ts`
- Modify: `packages/spa-guard/src/inline-trace/index.ts`
- Modify: `packages/spa-guard/src/common/log.ts` (cleanup if unused)
- Modify: `packages/spa-guard/README.md`

Related patterns: `serializeError` DI in `listenInternal`, Symbol-keyed window globals for `internalConfig`

Note: This is an alpha package. No backwards compatibility concerns. Breaking changes are expected and acceptable.

## Development Approach

- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Create Logger module and enhance emitEvent

**Files:**

- Create: `packages/spa-guard/src/common/logger.ts`
- Modify: `packages/spa-guard/src/common/events/internal.ts`
- Modify: `packages/spa-guard/src/common/constants.ts`

- [x] Define `Logger` interface with:
  - `logEvent(event: SPAGuardEvent): void` - auto-logs events with appropriate level and formatting
  - Specific methods for each non-event log point. Method signatures accept only data (numbers, objects, existing strings like event type names), never log-message text. Examples:
    - `capturedError(type: string, ...args: unknown[]): void` — type reuses the addEventListener type string already in bundle ("error", "unhandledrejection", etc.)
    - `retryLimitExceeded(attempt: number, max: number): void`
    - `fallbackAlreadyShown(error: unknown): void`
    - `noFallbackConfigured(): void`
    - `fallbackTargetNotFound(selector: string): void` — selector is already a variable
    - `clearingRetryState(): void`
    - `updatedRetryAttempt(attempt: number): void`
    - `fallbackInjectFailed(error: unknown): void`
    - `noBeaconEndpoint(): void`
    - `beaconSendFailed(error: unknown): void`
    - Version-check methods (11 methods for checkVersion.ts calls)
  - Generic `log/warn/error(msg, ...args)` methods with `[spa-guard]` prefix for future use / non-inline modules if specific method feels overkill
- [x] Implement `createLogger()` factory. All human-readable log messages live HERE:
  - Event formatting map: chunk-error->error, retry-attempt->warn, retry-reset->log, retry-exhausted->error, fallback-ui-shown->warn, lazy-retry-attempt->warn, lazy-retry-exhausted->error, lazy-retry-success->log
  - Each specific method implementation with console.[level] + formatted message
- [x] Add Symbol-keyed logger storage to window in constants.ts (`loggerWindowKey`)
- [x] Add `setLogger(logger?: Logger)` and `getLogger(): Logger | undefined` to events/internal.ts (stored on window, same pattern as internalConfig)
- [x] Add `EmitOptions` type: `{ silent?: boolean }`
- [x] Enhance `emitEvent(event, options?)`: when not silent and `getLogger()` returns a logger, call `logger.logEvent(event)`
- [x] Write tests: createLogger produces correct console output for each event type
- [x] Write tests: emitEvent auto-logs events, silent flag suppresses logging but subscribers still receive events
- [x] Write tests: setLogger/getLogger lifecycle
- [x] Run project test suite - must pass before task 2

### Task 2: Migrate listen/internal.ts and listen/index.ts

**Files:**

- Modify: `packages/spa-guard/src/common/listen/internal.ts`
- Modify: `packages/spa-guard/src/common/listen/index.ts`

- [x] Add optional `logger?: Logger` parameter to `listenInternal(serializeError, logger?)`
- [x] Call `setLogger(logger)` at the start of listenInternal (before initialization guard, so logger is available even if already initialized)
- [x] Replace 5 console.\* calls with Logger method calls via getLogger():
  - Line 21-25: `console.log(logMessage("Retry limit exceeded..."))` -> `getLogger()?.retryLimitExceeded(retryState.retryAttempt, reloadDelays.length)`
  - Line 37: `console.error(logMessage("error:capture:"), event)` -> `getLogger()?.capturedError("error", event)`
  - Line 62: `console.error(logMessage("unhandledrejection:"), event)` -> `getLogger()?.capturedError("unhandledrejection", event)`
  - Line 85: `console.error(logMessage("CSP violation:"), ...)` -> `getLogger()?.capturedError("csp", event.blockedURI, event.violatedDirective)`
  - Line 102: `console.error(logMessage("vite:preloadError:"), event)` -> `getLogger()?.capturedError("vite:preloadError", event)`
- [x] Keep shouldIgnoreMessages checks at call sites (guard the getLogger() calls)
- [x] Update `listen()` in index.ts to pass `createLogger()` as second argument
- [x] Remove `logMessage` import from listen/internal.ts
- [x] Update/add tests
- [x] Run project test suite - must pass before task 3

### Task 3: Migrate reload.ts

**Files:**

- Modify: `packages/spa-guard/src/common/reload.ts`

- [x] Remove 3 redundant console calls that duplicate event information:
  - Lines 66-72: retry-reset console.log (now auto-logged by emitEvent)
  - Line 100: retry-exhausted console.error (now auto-logged by emitEvent)
  - Lines 128-136: retry-attempt console.warn (now auto-logged by emitEvent)
- [x] For these 3 removed calls: pass `{ silent: shouldIgnoreMessages([errorMsg]) }` to the corresponding emitEvent calls to preserve shouldIgnore suppression
- [x] Replace remaining 6 console calls with specific Logger methods:
  - Lines 88-91: `console.error(logMessage("Fallback UI was already shown..."))` -> `getLogger()?.fallbackAlreadyShown(error)`
  - Line 165: `console.error(logMessage("No fallback UI configured"))` -> `getLogger()?.noFallbackConfigured()`
  - Line 172: `console.error(logMessage("Target element not found..."))` -> `getLogger()?.fallbackTargetNotFound(selector)`
  - Line 179: `console.log(logMessage("Clearing retry state..."))` -> `getLogger()?.clearingRetryState()`
  - Lines 188-190: `console.log(logMessage("Updated retry attempt..."))` -> `getLogger()?.updatedRetryAttempt(retryState.retryAttempt + 1)`
  - Line 204: `console.error(logMessage("Failed to inject fallback UI"), error)` -> `getLogger()?.fallbackInjectFailed(error)`
- [x] Remove `logMessage` import
- [x] Update/add tests: verify shouldIgnore suppresses event logging via silent flag
- [x] Update/add tests: verify Logger methods called correctly
- [x] Run project test suite - must pass before task 4

### Task 4: Migrate sendBeacon.ts and checkVersion.ts

**Files:**

- Modify: `packages/spa-guard/src/common/sendBeacon.ts`
- Modify: `packages/spa-guard/src/common/checkVersion.ts`

- [ ] sendBeacon.ts: replace 2 console calls with Logger methods:
  - Line 15: `console.warn(logMessage("Report endpoint..."))` -> `getLogger()?.noBeaconEndpoint()`
  - Line 32: `console.error(logMessage("Failed to send beacon:"), error)` -> `getLogger()?.beaconSendFailed(error)`
- [ ] checkVersion.ts: replace 11 console calls with specific Logger methods for version-check diagnostics
- [ ] Remove `logMessage` imports from both files
- [ ] Update/add tests
- [ ] Run project test suite - must pass before task 5

### Task 5: Update entry points and clean up log.ts

**Files:**

- Modify: `packages/spa-guard/src/inline-trace/index.ts`
- Modify: `packages/spa-guard/src/common/log.ts`
- No change: `packages/spa-guard/src/inline/index.ts` (production stays as-is: no logger)

- [ ] inline-trace/index.ts: import `createLogger` from logger.ts, pass to `listenInternal(serializeError, createLogger())`
- [ ] inline/index.ts: no changes — `listenInternal(() => "")` stays minimal, tree-shaking removes logger.ts
- [ ] Check if `logMessage()` is still used anywhere (fastify/index.ts may still use it)
- [ ] If only fastify uses logMessage, keep log.ts as-is
- [ ] If nothing uses logMessage, remove log.ts
- [ ] Build the package and verify:
  - dist-inline/index.js contains no log message strings (grep for `[spa-guard]` or key phrases)
  - dist-inline-trace/index.js contains formatted log messages
  - Compare sizes: production inline should be same or smaller
- [ ] Write/update tests
- [ ] Run project test suite - must pass before task 6

### Task 6: Clean up README

**Files:**

- Modify: `packages/spa-guard/README.md`

- [ ] Remove entire "Breaking Changes" section (lines 13-64 with both migration guides)
- [ ] Add a short alpha notice near the top (after Install section): this package is in alpha, public API may change between versions without migration guides, README always reflects the current state
- [ ] Review rest of README for accuracy with current API after logging changes
- [ ] Add note to CLAUDE.md or project conventions: while in alpha, no need to document breaking changes — just update README to reflect current state
- [ ] Run linter on README if applicable

### Task 7: Verify acceptance criteria

- [ ] Verify retryImport.ts events now produce console output via event auto-logging (in trace mode)
- [ ] Verify reload.ts has no duplicated logging (each piece of info logged once)
- [ ] Verify shouldIgnoreMessages suppresses event logging via silent flag
- [ ] Verify production inline bundle (dist-inline/index.js) does NOT contain log message strings
- [ ] Verify trace inline bundle (dist-inline-trace/index.js) DOES contain log messages
- [ ] Compare bundle sizes before/after
- [ ] Run full test suite
- [ ] Run linter
- [ ] Verify test coverage meets 80%+

### Task 8: Update documentation

- [ ] Update CLAUDE.md if internal patterns changed (Logger DI pattern, event auto-logging)
- [ ] Move this plan to `docs/plans/completed/`
