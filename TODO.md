# 2026-02-25 spa-guard loading UI regression plan (for ralphex)

## Goal

Restore loading UI rendering during retry delays after `2026-02-25-spa-guard-retry-rewrite-master-plan.md`.

## Plan

1. Localize the regression

- Verify in `retryOrchestrator.ts` and `fallbackRendering.ts` that `triggerRetry()` no longer renders loading UI before reload.
- Confirm expected source of loading HTML: `options.html?.loading?.content` with fallback to `defaultLoadingFallbackHtml`.

2. Restore loading renderer API

- Add a dedicated pure helper `showLoadingUI(attempt: number)` in `src/common/fallbackRendering.ts`.
- Behavior:
  - use `html.loading.content`
  - target selector from `html.fallback.selector`
  - apply i18n
  - show retry section
  - fill attempt number
  - spinner handling (`disabled` / custom content)
  - fail-safe behavior when html/target is missing

3. Integrate with orchestrator

- In `src/common/retryOrchestrator.ts`, call `showLoadingUI(nextAttempt)` in the successful scheduling path before the reload `setTimeout`.
- Preserve ownership rule: orchestrator owns retry lifecycle; helper is render-only.

4. Add regression tests

- `retryOrchestrator.test.ts`:
  - assert `showLoadingUI(1)` is called on first retry
  - assert correct attempt when URL retry state exists
- `fallbackRendering.test.ts`:
  - renders loading template
  - sets attempt text
  - reveals retry section
  - spinner disabled/custom-content behavior
  - i18n patching

5. Validate compatibility

- Ensure `showFallbackUI()` behavior remains unchanged.
- Ensure dedupe/fallback phases are unaffected and loading render does not mutate lifecycle state.

6. Update docs

- `spa-guard/spa-guard/README.md`: retry flow should explicitly state loading UI is rendered during retry delay (`html.loading.content`).
- `AGENTS.md`: add note that loading UI rendering is a dedicated helper invoked by orchestrator before reload.

7. Verification

- Run targeted tests:
  - `pnpm test src/common/retryOrchestrator.test.ts`
  - `pnpm test src/common/fallbackRendering.test.ts`
- Then run package checks in `spa-guard/spa-guard`:
  - `pnpm test`
  - `pnpm lint`

8. Improve `unhandledrejection` serialization detail level

- Goal: beacon logs must clearly show _what_ failed (error class, message, stack, HTTP context), not just generic `"Unhandled Promise Rejection"`.
- Update `serializeError` path used by unhandled rejection capture so `PromiseRejectionEvent.reason` is expanded deeply (safe + bounded), instead of collapsing complex objects to `{}`.
- Required extracted fields (when present):
  - `reason.name`, `reason.message`, `reason.stack`, `reason.cause`
  - if `reason` is not an Error (string/number/object), keep original primitive or safe object preview
  - for `AggregateError`: include nested `errors[]` preview (bounded)
  - for `DOMException`: include `name`, `message`, `code` (if present)
  - constructor/type metadata (`reason.type`, constructor name)
  - for HTTP-like errors (`reason.response`): `status`, `statusText`, `url`, `method`
  - for fetch `Response`: include `type` (`basic|cors|opaque|...`) when available
  - extract `X-Request-ID` when present (from response/request headers)
  - for fetch/request wrappers (`reason.request` / `reason.config`): method/url/baseURL only
  - promise context: event type (`PromiseRejectionEvent`), `isTrusted`, `timeStamp`
  - runtime context: current page URL/path, app version/retryId/retryAttempt (if available in spa-guard state)
- Add guardrails:
  - max depth / max keys / max string length to avoid huge payloads
  - circular reference protection
  - do not serialize request/response bodies, payloads, or full headers
  - keep backward compatibility for existing beacon schema fields
  - if `unhandledrejection` is not fired (cross-origin script restriction), log this limitation in docs
- Update beacon payload mapping:
  - keep `errorMessage` concise (`<ErrorName>: <message>`)
  - put expanded diagnostic object into `serialized`
  - ensure server log output stays JSON-parseable and readable
- Add tests:
  - `ResponseError` with nested `response` is serialized with useful fields (`status/url/method/X-Request-ID/type`)
  - custom error with `cause` chain is preserved
  - primitive rejection reason (`Promise.reject(\"oops\")`) is serialized without losing value
  - `AggregateError` includes bounded nested error previews
  - circular structures do not crash serialization
  - large payloads are truncated deterministically
- Docs updates:
  - `README.md`/`AGENTS.md` note new unhandled rejection serialization behavior and redaction/truncation policy.
