---
# SPA Guard - Loading UI Regression Fix + Unhandledrejection Serialization

## Overview

Two independent improvements from TODO.md:
1. Restore loading UI rendering before reload during retry delays (regression from the retry rewrite).
2. Improve unhandledrejection serialization in serializeError with strict redaction constraints.

## Context

- Files involved:
  - `spa-guard/spa-guard/src/common/fallbackRendering.ts` - add showLoadingUI helper
  - `spa-guard/spa-guard/src/common/fallbackRendering.test.ts` - regression tests for showLoadingUI
  - `spa-guard/spa-guard/src/common/retryOrchestrator.ts` - call showLoadingUI before reload setTimeout
  - `spa-guard/spa-guard/src/common/retryOrchestrator.test.ts` - assert showLoadingUI is called
  - `spa-guard/spa-guard/src/common/serializeError.ts` - deep expansion of PromiseRejectionEvent.reason with strict redaction
  - `spa-guard/spa-guard/src/common/serializeError.test.ts` - new serialization and redaction cases
  - `spa-guard/spa-guard/README.md` - document retry loading UI and new serialization behavior
  - `AGENTS.md` - add notes per TODO requirements
- Related patterns: showFallbackUI in fallbackRendering.ts as reference pattern; serializeErrorInternal existing dispatch table

## Development Approach

- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**
- Verification scope: spa-guard/spa-guard package only (`pnpm test && pnpm lint`)

## Implementation Steps

### Task 1: Add showLoadingUI helper to fallbackRendering.ts

**Files:**
- Modify: `spa-guard/spa-guard/src/common/fallbackRendering.ts`

- [x] Add exported function `showLoadingUI(attempt: number): void`
- [x] Use `options.html?.loading?.content`; if missing, return silently (no log, no event - fail-safe)
- [x] Target selector from `options.html?.fallback?.selector ?? "body"`
- [x] If target element not found, return silently
- [x] Inject loading HTML into target
- [x] Apply i18n via applyI18n/getI18n
- [x] Show retry section: set visibility/display on element with `data-spa-guard-section="retrying"`
- [x] Fill attempt number into elements matching `[data-spa-guard-content="attempt"]`
- [x] Handle spinner: if `options.html?.spinner?.disabled`, hide spinner element; if custom spinner content present, replace it
- [x] Wrap DOM access in try/catch for fail-safe behavior
- [x] Run tests: `pnpm test src/common/fallbackRendering.test.ts` - must pass

### Task 2: Add showLoadingUI tests to fallbackRendering.test.ts

**Files:**
- Modify: `spa-guard/spa-guard/src/common/fallbackRendering.test.ts`

- [x] Add describe block `showLoadingUI`
- [x] Test: renders loading template content into target element
- [x] Test: sets attempt number in elements with `[data-spa-guard-content="attempt"]`
- [x] Test: reveals retry section via `data-spa-guard-section="retrying"`
- [x] Test: spinner hidden when spinner.disabled is true
- [x] Test: applies i18n when i18n is configured
- [x] Test: returns silently when loading content is not configured
- [x] Test: returns silently when target element not found
- [x] Test: does not throw when DOM access throws
- [x] Run tests: `pnpm test src/common/fallbackRendering.test.ts` - must pass before task 3

### Task 3: Integrate showLoadingUI into retryOrchestrator.ts

**Files:**
- Modify: `spa-guard/spa-guard/src/common/retryOrchestrator.ts`

- [x] Import `showLoadingUI` from `./fallbackRendering`
- [x] In the successful retry scheduling path (after setState for nextAttempt, before setTimeout), call `showLoadingUI(nextAttempt)`
- [x] Verify showFallbackUI behavior for exhausted retries is unchanged
- [x] Run tests: `pnpm test src/common/retryOrchestrator.test.ts` - must pass

### Task 4: Add showLoadingUI call assertions to retryOrchestrator.test.ts

**Files:**
- Modify: `spa-guard/spa-guard/src/common/retryOrchestrator.test.ts`

- [x] Add `showLoadingUI` to the fallbackRendering mock (already mocked as module, add the fn)
- [x] Test: assert `showLoadingUI(1)` is called when triggerRetry is invoked on first attempt (no URL state)
- [x] Test: assert `showLoadingUI(nextAttempt)` uses correct attempt number when URL retry state exists
- [x] Test: assert `showLoadingUI` is NOT called when retry is deduped (phase=scheduled)
- [x] Test: assert `showLoadingUI` is NOT called when fallback phase is reached (exhausted)
- [x] Test: assert `showFallbackUI` is still called on retry exhaustion (compatibility preserved)
- [x] Run tests: `pnpm test src/common/retryOrchestrator.test.ts` - must pass before task 5

### Task 5: Improve unhandledrejection serialization in serializeError.ts

**Files:**
- Modify: `spa-guard/spa-guard/src/common/serializeError.ts`

- [x] Add guardrail constants: MAX_DEPTH=4, MAX_KEYS=20, MAX_STRING_LEN=500
- [x] Add circular reference protection using a WeakSet visited tracker
- [x] Update PromiseRejectionEvent branch: expand `reason` deeply with strict redaction
- [x] For Error reason: extract only `name`, `message`, `stack`, `cause` (recursively, bounded by MAX_DEPTH)
- [x] For AggregateError reason: include bounded `errors[]` preview (first 3 items, same safe fields)
- [x] For DOMException reason: extract `name`, `message`, `code`
- [x] For HTTP-like errors with `reason.response`: extract ONLY `status`, `statusText`, `url`, `method`, `response.type`; extract `X-Request-ID` from response headers ONLY if present - NO body, NO payload, NO full headers
- [x] For request wrappers (`reason.request` / `reason.config`): extract ONLY `method`, `url`, `baseURL` - NO body, NO payload, NO headers
- [x] For non-Error reason (string/number/object): preserve primitive as-is or safe bounded object preview
- [x] Add `isTrusted` and `timeStamp` from the PromiseRejectionEvent to output
- [x] Add runtime context: `pageUrl` (window.location.href if available), `constructorName` (reason?.constructor?.name)
- [x] Ensure string values are truncated to MAX_STRING_LEN
- [x] Ensure recursive object extraction respects MAX_DEPTH and MAX_KEYS
- [x] Keep backward compatibility: existing fields in `type: "Error"` and `type: "PromiseRejectionEvent"` remain present
- [x] Run tests: `pnpm test src/common/serializeError.test.ts` - must pass

### Task 6: Add serialization and redaction tests to serializeError.test.ts

**Files:**
- Modify: `spa-guard/spa-guard/src/common/serializeError.test.ts`

- [x] Test: ResponseError with response containing status/statusText/url/method/type is serialized correctly
- [x] Test: X-Request-ID header IS serialized when present in response.headers
- [x] Test: response body is NOT present in serialized output
- [x] Test: request/response payload is NOT present in serialized output
- [x] Test: full headers object (beyond X-Request-ID) is NOT present in serialized output
- [x] Test: Error with cause chain preserves cause.name/message/stack
- [x] Test: `Promise.reject("oops")` - primitive reason preserved as-is
- [x] Test: AggregateError includes bounded nested error previews (first 3)
- [x] Test: circular object structure does not crash serialization
- [x] Test: large string values are truncated to MAX_STRING_LEN
- [x] Test: object with >MAX_KEYS keys is bounded
- [x] Test: PromiseRejectionEvent output includes isTrusted, timeStamp fields
- [x] Run tests: `pnpm test src/common/serializeError.test.ts` - must pass before task 7

### Task 7: Update docs

**Files:**
- Modify: `spa-guard/spa-guard/README.md`
- Modify: `AGENTS.md`

- [x] README.md: add note in retry flow section that loading UI (`html.loading.content`) is rendered during retry delay before reload
- [x] README.md: add note in unhandledrejection section about serialization behavior and strict redaction policy (no bodies, no payloads, no full headers - only safe metadata and X-Request-ID)
- [x] AGENTS.md: add note that loading UI rendering is a dedicated helper (`showLoadingUI`) invoked by orchestrator before reload setTimeout
- [x] AGENTS.md: add note about unhandledrejection serialization guardrails and redaction constraints

### Task 8: Verify acceptance criteria

- [x] manual check: `showLoadingUI` is exported and called in orchestrator before setTimeout
- [x] manual check: serializeError PromiseRejectionEvent output includes expanded reason fields and redacts body/payload/full headers
- [x] run full test suite in `spa-guard/spa-guard`: `pnpm test`
- [x] run linter in `spa-guard/spa-guard`: `pnpm lint`

### Task 9: Cleanup

- [ ] move this plan to `docs/plans/completed/`
- [ ] delete `TODO.md` from repo root
---
