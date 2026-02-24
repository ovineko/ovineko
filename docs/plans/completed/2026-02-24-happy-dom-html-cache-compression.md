---

# Replace patchHtmlI18n regex with happy-dom, add HTML cache with compression

## Overview

Replace fragile regex-based HTML parsing in patchHtmlI18n with proper DOM manipulation via happy-dom. Add a cache layer (createHtmlCache) that pre-generates all language variants at startup with pre-compressed payloads (gzip, brotli, zstd). ETag is derived from **SPA_GUARD_VERSION** using the existing version extraction logic from checkVersion.ts (falls back to sha256 if not found). The cache's get() returns a ready-to-use response object with body and headers (Content-Encoding, ETag, Vary, Content-Type, Content-Language). Use @fastify/accept-negotiator for Accept-Encoding negotiation. Bump minimum Node.js to >= 22 LTS across all packages in the repository.

## Context

- Files involved: packages/spa-guard/src/node/index.ts, packages/spa-guard/src/node/index.test.ts, packages/spa-guard/src/common/checkVersion.ts, packages/spa-guard/package.json, and all other package.json files for Node engine bump
- Related patterns: ./node subpackage is server-side only; happy-dom 20.5.0 already in devDependencies; all other framework deps (fastify, react, vite, etc.) are optional peerDependencies
- Dependencies: happy-dom (add to peerDependencies + peerDependenciesMeta as optional), @fastify/accept-negotiator (regular dependency)
- Staged changes: reload.ts/reload.test.ts (spinner disabled feature, unrelated) and node/index.ts/test (regex fix, superseded by this plan)
- Node.js: bump engines to >= 22 across entire repo; zstd unconditional via zlib
- Packages requiring engine bump (currently >=20): spa-guard, clean-pkg-json, datamitsu-config, fastify-base, react-router
- Existing version extraction: fetchHtmlVersion in checkVersion.ts (lines 50-57) already parses **SPA_GUARD_VERSION** from HTML via regex. Extract this regex logic into a shared helper (e.g. extractVersionFromHtml in a common module) so both client-side checkVersion and server-side createHtmlCache can reuse it.

## Development Approach

- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Handle staged changes and clean up

**Files:**

- packages/spa-guard/src/common/reload.ts (staged)
- packages/spa-guard/src/common/reload.test.ts (staged)
- revise.txt (delete)

- [x] Commit staged reload.ts and reload.test.ts (spinner disabled feature) as a separate commit
- [x] Unstage node/index.ts and node/index.test.ts (will be rewritten in task 3)
- [x] Delete revise.txt and commit

### Task 2: Bump Node.js engines to >= 22 across the entire repository

**Files:**

- Modify: `packages/spa-guard/package.json`
- Modify: `packages/clean-pkg-json/package.json`
- Modify: `packages/datamitsu-config/package.json`
- Modify: `packages/fastify-base/package.json`
- Modify: `packages/react-router/package.json`

- [x] Update engines.node from ">=20" to ">=22" in all 5 package.json files listed above
- [x] Run full test suite from repo root to confirm nothing breaks
- [x] Commit as a standalone change: "chore: bump minimum Node.js to >= 22 LTS"

### Task 3: Rewrite patchHtmlI18n with happy-dom DOM parsing

**Files:**

- Modify: `packages/spa-guard/package.json`
- Modify: `packages/spa-guard/src/node/index.ts`
- Modify: `packages/spa-guard/src/node/index.test.ts`

- [x] Add happy-dom to peerDependencies ("^20") and peerDependenciesMeta (optional: true) in package.json; keep it in devDependencies for tests
- [x] Add @fastify/accept-negotiator to dependencies in package.json; run pnpm install
- [x] Rewrite patchHtmlI18n internals: parse HTML with happy-dom Window/Document, set `<html lang>` via DOM setAttribute, inject `<meta name="spa-guard-i18n">` via DOM createElement+prepend into `<head>`, serialize back with document.documentElement.outerHTML
- [x] Keep the PatchHtmlI18nOptions interface and function signature unchanged
- [x] Keep all existing edge-case tests (single-quoted lang, unquoted lang, lang inside attribute value, `>` inside attributes, xml:lang, dotted attributes, case-insensitive head, etc.) - adapt assertions if DOM serialization differs slightly
- [x] Run project test suite - must pass before task 4

### Task 4: Extract version parsing into shared helper and add createHtmlCache

**Files:**

- Modify: `packages/spa-guard/src/common/checkVersion.ts`
- Create: `packages/spa-guard/src/common/parseVersion.ts` (shared helper)
- Create: `packages/spa-guard/src/common/parseVersion.test.ts`
- Modify: `packages/spa-guard/src/node/index.ts`
- Modify: `packages/spa-guard/src/node/index.test.ts`

- [x] Extract version parsing regex from fetchHtmlVersion (checkVersion.ts lines 50-57) into a shared `extractVersionFromHtml(html: string): string | null` function in parseVersion.ts. Handles both **SPA_GUARD_VERSION** and fallback to **SPA_GUARD_OPTIONS**.version
- [x] Update fetchHtmlVersion in checkVersion.ts to use the new shared helper
- [x] Write tests for extractVersionFromHtml: HTML with **SPA_GUARD_VERSION** (returns version), HTML without it but with **SPA_GUARD_OPTIONS** (returns version from fallback), HTML with neither (returns null)
- [x] Export CreateHtmlCacheOptions interface: `{ html: string; languages?: string[]; translations?: Record<string, Partial<SpaGuardTranslations>> }`
- [x] Export HtmlCacheResponse type: `{ body: Buffer | string; headers: Record<string, string> }` - headers include Content-Encoding (when compressed), ETag, Vary, Content-Type, Content-Language
- [x] Export HtmlCache interface with `get(options: { acceptLanguage?: string; lang?: string; acceptEncoding?: string }): HtmlCacheResponse`
- [x] Implement createHtmlCache (async): call extractVersionFromHtml on input HTML to get version for ETag base; iterate languages, call patchHtmlI18n for each, pre-compress each variant with zlib.gzip, zlib.brotliCompress, and zlib zstd (unconditional, Node >= 22); compute ETag as `"<version>-<lang>"` if version found, otherwise `"<sha256_prefix>-<lang>"`; store in Map
- [x] get() resolves language via matchLang, negotiates encoding via @fastify/accept-negotiator's negotiate(acceptEncoding, ["br", "zstd", "gzip"]) - returns best match or null for identity; returns the corresponding pre-compressed variant
- [x] get() returns headers object: `{ "Content-Type": "text/html; charset=utf-8", "Content-Language": lang, "Content-Encoding": encoding (omitted for identity), "ETag": etag, "Vary": "Accept-Language, Accept-Encoding" }`
- [x] If languages not provided, default to all keys from built-in + custom translations
- [x] Write tests: multi-language cache, ETag uses version from HTML when available, ETag falls back to sha256 when no version in HTML, ETag differs between languages, compression output is valid (decompress and compare), get() returns correct headers for different Accept-Encoding values, Vary header always present, Content-Language matches resolved language, Content-Encoding omitted for identity, fallback to identity when no encoding matches
- [x] Run project test suite - must pass before task 5

### Task 5: Verify acceptance criteria

- [x] Run full test suite (`pnpm test` in packages/spa-guard)
- [x] Run linter (`pnpm lint` in packages/spa-guard)
- [x] Verify build succeeds (`pnpm build` in packages/spa-guard)
- [x] Verify test coverage meets 80%+

### Task 6: Update documentation

- [x] Update README.md with createHtmlCache API usage example (server-side caching + compression pattern, showing how to spread returned headers into the response)
- [x] Update CLAUDE.md if internal patterns changed
- [x] Move this plan to `docs/plans/completed/`
