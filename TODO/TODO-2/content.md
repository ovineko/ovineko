# spa-guard Improvement Plan (v2)

## Overview

Three improvements to `@ovineko/spa-guard`:

1. **Improved default HTML templates** — system-ui font, styled buttons, SVG spinner, inline error icon
2. **i18n support** — server-side HTML patching via `<meta>` tag (no script injection), built-in translations
3. **Spinner overlay** — Vite plugin injects into `<body>`, reusable via `showSpinner()`/`dismissSpinner()`, React component

---

## 1. Improved Default HTML Templates

### Font Strategy

- **Body:** `font-family: system-ui, sans-serif` — zero bytes, each OS picks its native UI font
- **Monospace (Error ID):** `font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace`
- **Buttons:** `font-family: inherit` — inherits system-ui from parent

### Data Attribute Contract (for custom HTML compatibility)

When users provide custom `html.fallback.content` or `html.loading.content`, they must use these data attributes for i18n, button actions, and error ID to work:

**Error fallback:**

- `data-spa-guard-content="heading"` — `textContent` replaced with translation
- `data-spa-guard-content="message"` — `textContent` replaced with translation
- `data-spa-guard-action="reload"` — reload button, `textContent` replaced
- `data-spa-guard-action="try-again"` — try again button, `textContent` replaced
- `.spa-guard-error-id` — error ID container (hidden via CSS `:has()` when empty)
- `.spa-guard-retry-id` — span for retry ID value

**Loading state:**

- `data-spa-guard-content="loading"` — "Loading..." text
- `data-spa-guard-section="retrying"` — retry info container (shown/hidden by JS)
- `data-spa-guard-content="retrying"` — "Retry attempt" label text
- `data-spa-guard-content="attempt"` — attempt number
- `data-spa-guard-spinner` — spinner container (content replaced with spinner HTML from options)

**Document in README:** If an attribute is missing in custom HTML, the corresponding feature silently skips that element.

### See attached files

- `error-fallback.html` — ready to use as `defaultErrorFallbackHtml`
- `loading-state.html` — ready to use as `defaultLoadingFallbackHtml`

---

## 2. i18n Support

### Architecture

```
Inline script (~9KB + ~250 bytes)
├── English text baked directly in HTML
├── Before rendering fallback/loading: reads <meta name="spa-guard-i18n">
├── Parses JSON from content attribute via JSON.parse()
├── Patches textContent in virtual container BEFORE DOM injection (no flashing)
└── If meta tag absent → English stays, zero overhead

Core package: @ovineko/spa-guard/i18n
├── exports translations: Record<string, SpaGuardTranslations>
├── exports matchLang(input, availableLangs): string
└── Built-in: en, ko, ja, zh, ar, he (all two-letter keys)

Server utility: @ovineko/spa-guard/server
├── exports patchHtmlI18n(options): string
├── Injects <meta name="spa-guard-i18n" content="..."> into <head>
├── Patches <html lang="...">
└── English = no-op
```

### Security: Meta Tag Instead of Script Injection

**Problem:** `<script>window.X = ${JSON.stringify(userInput)}</script>` is an XSS vector — malicious translation strings could break out of JSON context.

**Solution:** Store translations in a `<meta>` tag. The `content` attribute is HTML-attribute-escaped, so `"`, `<`, `>`, `&` are all safe. The inline script parses it with `JSON.parse()` at render time.

```html
<!-- Injected by patchHtmlI18n into <head> -->
<meta name="spa-guard-i18n" content='{"heading":"문제가 발생했습니다",...}' />
```

**Inline script reads it:**

```javascript
function getI18n() {
  var el = document.querySelector('meta[name="spa-guard-i18n"]');
  if (!el) return null;
  try {
    return JSON.parse(el.getAttribute("content"));
  } catch (e) {
    return null;
  }
}
```

**Server-side escaping:**

```typescript
function escapeAttr(str: string): string {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const jsonStr = JSON.stringify(t);
const metaTag = `<meta name="spa-guard-i18n" content="${escapeAttr(jsonStr)}">`;
```

No script injection. No XSS surface. Content attribute is inert data.

### Virtual Container — No Flashing

The inline script patches translations in a virtual container BEFORE inserting into DOM:

```javascript
function showFallback(htmlString, selector) {
  var container = document.createElement("div");
  container.innerHTML = htmlString;

  var t = getI18n(); // reads <meta> tag, returns object or null
  if (t) {
    var els = container.querySelectorAll("[data-spa-guard-content]");
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute("data-spa-guard-content");
      if (key && t[key]) els[i].textContent = t[key];
    }
    var btns = container.querySelectorAll("[data-spa-guard-action]");
    for (var j = 0; j < btns.length; j++) {
      var action = btns[j].getAttribute("data-spa-guard-action");
      var tKey = action === "try-again" ? "tryAgain" : action;
      if (tKey && t[tKey]) btns[j].textContent = t[tKey];
    }
    if (t.rtl && container.firstElementChild) {
      container.firstElementChild.style.direction = "rtl";
    }
  }

  // Single DOM write — user sees final translated result
  var target = document.querySelector(selector) || document.body;
  target.innerHTML = container.innerHTML;
}
```

Same approach for loading template.

### Translation Keys — All Two-Letter

Built-in keys: `en`, `ko`, `ja`, `zh`, `ar`, `he`

No `zh-Hans` / `zh-Hant` distinction in built-ins. If someone needs Traditional Chinese, they add via custom translations:

```typescript
patchHtmlI18n({
  html,
  lang: 'zh-Hant',
  translations: { 'zh-Hant': { heading: '出了點問題', ... } }
})
```

### matchLang — Handles Both Directions

```typescript
export function matchLang(
  input: string | undefined,
  available: string[] = Object.keys(translations),
): string {
  if (!input) return "en";

  // Detect if input is Accept-Language header vs simple lang code
  const isAcceptLanguage = input.includes(",") || input.includes(";q=");

  if (!isAcceptLanguage) {
    // Direct language code: "zh-CN", "ko", "zh-Hant", etc.
    const lower = input.toLowerCase();
    const exact = available.find((a) => a.toLowerCase() === lower);
    if (exact) return exact;
    const prefix = lower.split("-")[0]!;
    const match = available.find(
      (a) => a.toLowerCase() === prefix || a.toLowerCase().startsWith(prefix + "-"),
    );
    return match ?? "en";
  }

  // Accept-Language header parsing
  const requested = input
    .split(",")
    .map((part) => {
      const [lang, q] = part.trim().split(";q=");
      return { lang: lang!.trim().toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of requested) {
    const exact = available.find((a) => a.toLowerCase() === lang);
    if (exact) return exact;
    const prefix = lang.split("-")[0]!;
    const match = available.find(
      (a) => a.toLowerCase() === prefix || a.toLowerCase().startsWith(prefix + "-"),
    );
    if (match) return match;
  }

  return "en";
}
```

Handles:

- `matchLang('zh-CN', ['en', 'zh'])` → `'zh'`
- `matchLang('zh', ['en', 'zh'])` → `'zh'`
- `matchLang('ko-KR,ko;q=0.9,en;q=0.8', ['en', 'ko'])` → `'ko'`
- `matchLang('zh-TW', ['en', 'zh', 'zh-Hant'])` → `'zh-Hant'`
- `matchLang(undefined, ['en', 'ko'])` → `'en'`

### patchHtmlI18n

```typescript
export interface PatchHtmlI18nOptions {
  /** The HTML string to patch (required) */
  html: string;
  /** Raw Accept-Language header value */
  acceptLanguage?: string;
  /** Explicit language override (takes priority over acceptLanguage) */
  lang?: string;
  /** Custom translations (merged with built-in, partial per-lang override) */
  translations?: Record<string, Partial<SpaGuardTranslations>>;
}

export function patchHtmlI18n(options: PatchHtmlI18nOptions): string {
  const { html, acceptLanguage, lang: langOverride, translations: customTranslations } = options;

  // Merge: built-in ← custom (per-language deep merge)
  const merged: Record<string, SpaGuardTranslations> = { ...builtInTranslations };
  if (customTranslations) {
    for (const [lang, partial] of Object.entries(customTranslations)) {
      merged[lang] = { ...(merged[lang] ?? builtInTranslations.en!), ...partial };
    }
  }

  const availableLangs = Object.keys(merged);

  // Both explicit lang and Accept-Language go through matchLang
  // "zh-CN" → resolves to "zh" key, etc.
  const lang = langOverride
    ? matchLang(langOverride, availableLangs)
    : matchLang(acceptLanguage, availableLangs);

  const t = merged[lang] ?? merged["en"]!;

  // English without custom translations = no-op
  if (lang === "en" && !customTranslations?.en) {
    return html;
  }

  const jsonStr = JSON.stringify(t);
  const metaTag = `<meta name="spa-guard-i18n" content="${escapeAttr(jsonStr)}">`;

  let result = html.replace("<head>", `<head>${metaTag}`);
  result = result.replace(/<html([^>]*)lang="[^"]*"/, `<html$1lang="${lang}"`);

  return result;
}
```

### SpaGuardTranslations Type

```typescript
export interface SpaGuardTranslations {
  heading: string;
  message: string;
  reload: string;
  tryAgain: string;
  loading: string;
  retrying: string;
  rtl?: boolean;
}
```

### Built-in Translations

```typescript
export const translations: Record<string, SpaGuardTranslations> = {
  en: {
    heading: "Something went wrong",
    message: "Please refresh the page to continue.",
    reload: "Reload page",
    tryAgain: "Try again",
    loading: "Loading...",
    retrying: "Retry attempt",
  },
  ko: {
    heading: "문제가 발생했습니다",
    message: "페이지를 새로고침해 주세요.",
    reload: "새로고침",
    tryAgain: "다시 시도",
    loading: "로딩 중...",
    retrying: "재시도",
  },
  ja: {
    heading: "問題が発生しました",
    message: "ページを更新してください。",
    reload: "再読み込み",
    tryAgain: "もう一度試す",
    loading: "読み込み中...",
    retrying: "リトライ",
  },
  zh: {
    heading: "出了点问题",
    message: "请刷新页面以继续。",
    reload: "重新加载",
    tryAgain: "重试",
    loading: "加载中...",
    retrying: "重试次数",
  },
  ar: {
    heading: "حدث خطأ ما",
    message: "يرجى تحديث الصفحة للمتابعة.",
    reload: "إعادة تحميل",
    tryAgain: "حاول مرة أخرى",
    loading: "...جارٍ التحميل",
    retrying: "محاولة إعادة",
    rtl: true,
  },
  he: {
    heading: "משהו השתבש",
    message: "אנא רענן את הדף כדי להמשיך.",
    reload: "טען מחדש",
    tryAgain: "נסה שוב",
    loading: "...טוען",
    retrying: "ניסיון חוזר",
    rtl: true,
  },
};
```

### Usage Examples

```typescript
import { patchHtmlI18n, translations } from "@ovineko/spa-guard/server";

// Auto-detect from Accept-Language
html = patchHtmlI18n({ html, acceptLanguage: request.headers["accept-language"] });

// Explicit language (from cookie, DB, URL...)
html = patchHtmlI18n({ html, lang: "ko" });

// Custom partial override
html = patchHtmlI18n({
  html,
  lang: "ko",
  translations: { ko: { heading: "서비스 점검 중입니다" } },
});

// Completely custom language
html = patchHtmlI18n({
  html,
  lang: "th",
  translations: {
    th: {
      heading: "เกิดข้อผิดพลาด",
      message: "กรุณารีเฟรชหน้าเพื่อดำเนินการต่อ",
      reload: "โหลดใหม่",
      tryAgain: "ลองอีกครั้ง",
      loading: "กำลังโหลด...",
      retrying: "ลองใหม่ครั้งที่",
    },
  },
});

// Nothing provided → English, no-op
html = patchHtmlI18n({ html });

// Inspect built-in
console.log(Object.keys(translations)); // ['en', 'ko', 'ja', 'zh', 'ar', 'he']
```

### SPA-side Language Update (Runtime)

When SPA changes language, update the meta tag so future errors show correct language:

```typescript
import { translations } from "@ovineko/spa-guard/i18n";

function onLanguageChange(lang: string) {
  document.documentElement.lang = lang;
  // Update meta tag for inline script
  let meta = document.querySelector('meta[name="spa-guard-i18n"]');
  const t = translations[lang];
  if (t) {
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "spa-guard-i18n");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", JSON.stringify(t));
  }
}
```

This is the user's responsibility, not automated by the library.

### New Entry Points

| Export                      | Description                                                |
| --------------------------- | ---------------------------------------------------------- |
| `@ovineko/spa-guard/i18n`   | `translations`, `matchLang()`, `SpaGuardTranslations` type |
| `@ovineko/spa-guard/server` | `patchHtmlI18n()`, `escapeAttr()`, re-exports from `/i18n` |

---

## 3. Spinner

### Options — Simple and Flat

```typescript
interface Options {
  // ...existing options...

  spinner?: {
    /**
     * Custom spinner HTML (the spinner element only, no container/overlay).
     * If not provided, uses the default SVG spinner.
     */
    content?: string;
    /**
     * Disable spinner entirely.
     * No injection into body, showSpinner() is a no-op, <Spinner /> returns null.
     * @default false
     */
    disabled?: boolean;
    /**
     * Overlay background color.
     * Used as CSS variable fallback: var(--spa-guard-spinner-bg, <this value>).
     * @default '#fff'
     */
    background?: string;
  };
}
```

### CSS Variable for Background

The spinner overlay uses a CSS variable with inline fallback:

```html
<div
  id="__spa-guard-spinner"
  style="position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:var(--spa-guard-spinner-bg,#fff)"
>
  <!-- spinner content -->
</div>
```

`showSpinner()` sets the CSS variable on the overlay element:

```typescript
if (bg !== defaultBg) {
  overlay.style.setProperty("--spa-guard-spinner-bg", bg);
}
```

No string manipulation of inline styles.

### getSpinnerHtml Helper

Central function for building spinner overlay HTML. Used by Vite plugin, `showSpinner()`, and inline script.

```typescript
const SPINNER_ID = "__spa-guard-spinner";

const defaultSpinnerSvg = [
  '<svg width="40" height="40" viewBox="0 0 40 40" style="animation:spa-guard-spin .8s linear infinite">',
  '<circle cx="20" cy="20" r="16" fill="none" stroke="#e8e8e8" stroke-width="3"/>',
  '<circle cx="20" cy="20" r="16" fill="none" stroke="#666" stroke-width="3" stroke-dasharray="80" stroke-dashoffset="60" stroke-linecap="round"/>',
  "</svg>",
  "<style>@keyframes spa-guard-spin{to{transform:rotate(360deg)}}</style>",
].join("");

export function getSpinnerHtml(backgroundOverride?: string): string {
  const opts = getOptions();
  if (opts.spinner?.disabled) return "";

  const spinnerContent = opts.spinner?.content ?? defaultSpinnerSvg;
  const bg = backgroundOverride ?? opts.spinner?.background ?? "#fff";

  return `<div id="${SPINNER_ID}" style="position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:var(--spa-guard-spinner-bg,${bg})">${spinnerContent}</div>`;
}
```

### dismissSpinner

```typescript
export function dismissSpinner(): void {
  const el = document.getElementById(SPINNER_ID);
  if (el) el.remove();
  document.body.style.overflow = "";
}
```

### showSpinner

```typescript
export function showSpinner(options?: { background?: string }): () => void {
  const opts = getOptions();
  if (opts.spinner?.disabled) return () => {};

  // Remove existing spinner if any
  const existing = document.getElementById(SPINNER_ID);
  if (existing) existing.remove();

  const html = getSpinnerHtml(options?.background);
  if (!html) return () => {};

  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  const overlay = wrapper.firstElementChild as HTMLElement;

  document.body.style.overflow = "hidden";
  document.body.appendChild(overlay);

  return () => dismissSpinner();
}
```

### recommendedSetup — Includes dismissSpinner

```typescript
export function recommendedSetup(overrides?: RecommendedSetupOptions): () => void {
  // ...existing logic (version check, etc.)...

  dismissSpinner();

  return cleanup;
}
```

### Vite Plugin — Spinner Injection into `<body>`

```typescript
// Inside transformIndexHtml handler:
const tags: HtmlTagDescriptor[] = [
  { tag: "script", children: inlineScript, injectTo: "head-prepend" },
];

const spinnerOpts = finalOptions.spinner;
if (spinnerOpts?.disabled !== true) {
  const spinnerContent = spinnerOpts?.content ?? defaultSpinnerSvg;
  const bg = spinnerOpts?.background ?? "#fff";

  // Store resolved values in options for runtime reuse
  finalOptions.spinner = { ...spinnerOpts, content: spinnerContent, background: bg };

  tags.push({
    tag: "div",
    attrs: {
      id: "__spa-guard-spinner",
      style: `position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:var(--spa-guard-spinner-bg,${bg})`,
    },
    children: spinnerContent,
    injectTo: "body-prepend",
  });

  tags.push({
    tag: "script",
    children: "document.body.style.overflow='hidden'",
    injectTo: "body-prepend",
  });

  if (bg !== "#fff") {
    tags.push({
      tag: "style",
      children: `:root{--spa-guard-spinner-bg:${bg}}`,
      injectTo: "head",
    });
  }
}

return { html, tags };
```

### Inline Script — Spinner Reuse in Loading Template

```javascript
function showLoading(htmlString, selector) {
  var container = document.createElement("div");
  container.innerHTML = htmlString;

  // Reuse spinner from options
  var opts = window.__SPA_GUARD_OPTIONS__;
  var spinnerEl = container.querySelector("[data-spa-guard-spinner]");
  if (spinnerEl && opts && opts.spinner && opts.spinner.content) {
    spinnerEl.innerHTML = opts.spinner.content;
  }

  // i18n patching (same as showFallback)
  var t = getI18n();
  if (t) {
    /* patch data-spa-guard-content and data-spa-guard-action elements */
  }

  var target = document.querySelector(selector) || document.body;
  target.innerHTML = container.innerHTML;
}
```

### React Component — `<Spinner />`

```tsx
// @ovineko/spa-guard/react

import { type ComponentProps } from "react";
import { getOptions } from "../common/options";

type SpinnerProps = Omit<ComponentProps<"div">, "dangerouslySetInnerHTML" | "children">;

/**
 * Renders the spa-guard spinner inside a <div>.
 * Returns null if spinner is disabled or no content available.
 * All <div> props forwarded to wrapper element.
 */
export function Spinner(props: SpinnerProps): React.ReactElement | null {
  const opts = getOptions();

  if (opts.spinner?.disabled) return null;

  const content = opts.spinner?.content;
  if (!content) return null;

  return <div {...props} dangerouslySetInnerHTML={{ __html: content }} />;
}
```

**Usage:**

```tsx
import { Spinner } from '@ovineko/spa-guard/react';

<Spinner />
<Spinner className="my-spinner" style={{ marginTop: 20 }} />
// Returns null when spinner.disabled: true
```

---

## Summary

### New Entry Points

| Export                      | Description                                                |
| --------------------------- | ---------------------------------------------------------- |
| `@ovineko/spa-guard/i18n`   | `translations`, `matchLang()`, `SpaGuardTranslations` type |
| `@ovineko/spa-guard/server` | `patchHtmlI18n()`, `escapeAttr()`, re-exports from `/i18n` |

### Modified Entry Points

| Export                           | Changes                                                         |
| -------------------------------- | --------------------------------------------------------------- |
| `@ovineko/spa-guard/runtime`     | + `dismissSpinner()`, `showSpinner()`, `getSpinnerHtml()`       |
| `@ovineko/spa-guard/react`       | + `<Spinner />` component                                       |
| `@ovineko/spa-guard/vite-plugin` | + `spinner` option, body injection                              |
| Inline script                    | + meta tag i18n read (~150 bytes), + spinner reuse (~100 bytes) |

### Options Changes

```typescript
interface Options {
  // ...existing options...

  spinner?: {
    content?: string; // Custom spinner HTML
    disabled?: boolean; // @default false
    background?: string; // @default '#fff'
  };
}
```

### recommendedSetup Changes

Now also calls `dismissSpinner()`.

### Zero-Overhead Guarantees

- No i18n meta tag → `getI18n()` returns null, single querySelector + null check
- `spinner.disabled: true` → no body injection, `showSpinner()` no-op, `<Spinner />` returns null
- All new exports tree-shakeable
