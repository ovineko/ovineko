export type { SpaGuardTranslations } from "@ovineko/spa-guard/i18n";
export { matchLang, translations } from "@ovineko/spa-guard/i18n";

import { negotiate } from "@fastify/accept-negotiator";

import type { SpaGuardTranslations } from "@ovineko/spa-guard/i18n";

import { extractVersionFromHtml } from "@ovineko/spa-guard/_internal";
import { matchLang, translations } from "@ovineko/spa-guard/i18n";
import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { brotliCompress, gzip, zstdCompress } from "node:zlib";
import { type DefaultTreeAdapterTypes, parse, html as parse5Html, serialize } from "parse5";

const gzipAsync = promisify(gzip);
const brotliAsync = promisify(brotliCompress);
const zstdAsync = promisify(zstdCompress);

export interface CreateHtmlCacheOptions {
  /** The HTML string to cache */
  html: string;
  /** Languages to pre-generate (defaults to all keys from built-in + custom translations) */
  languages?: string[];
  /** Custom translations (deep-merged per-language with built-ins) */
  translations?: Record<string, Partial<SpaGuardTranslations>>;
}

export interface HtmlCache {
  get(options: {
    acceptEncoding?: string;
    acceptLanguage?: string;
    lang?: string;
  }): HtmlCacheResponse;
}

export interface HtmlCacheResponse {
  body: Buffer | string;
  headers: Record<string, string>;
}

export interface PatchHtmlI18nOptions {
  /** Raw Accept-Language header value */
  acceptLanguage?: string;
  /** The HTML string to patch */
  html: string;
  /** Explicit language override (takes priority over acceptLanguage) */
  lang?: string;
  /** Custom translations (deep-merged per-language with built-ins) */
  translations?: Record<string, Partial<SpaGuardTranslations>>;
}

interface CacheEntry {
  br: Buffer;
  etag: string;
  gzip: Buffer;
  identity: Buffer;
  lang: string;
  zstd: Buffer;
}

/**
 * Create a pre-computed HTML cache with compressed variants for all languages.
 *
 * At startup, generates all language variants via patchHtmlI18n and
 * pre-compresses each with gzip, brotli, and zstd. ETag is derived from
 * `__SPA_GUARD_VERSION__` in the HTML (falls back to sha256 prefix).
 *
 * The returned cache's `get()` method resolves language via `matchLang`
 * and negotiates encoding via Accept-Encoding, returning a ready-to-use
 * response with body and headers.
 */
export async function createHtmlCache(options: CreateHtmlCacheOptions): Promise<HtmlCache> {
  const { html, translations: customTranslations } = options;

  const merged = mergeTranslations(customTranslations);
  const mergedKeys = new Set(Object.keys(merged));
  // Filter out language codes not present in merged translations to prevent
  // Content-Language header mismatching the actual body language
  const languages = (options.languages ?? Object.keys(merged)).filter((lang) =>
    mergedKeys.has(lang),
  );

  if (languages.length === 0) {
    throw new Error("createHtmlCache requires at least one language");
  }

  // Extract version for ETag base
  const version = extractVersionFromHtml(html);
  const sha256Prefix = version
    ? null
    : createHash("sha256").update(html).digest("hex").slice(0, 16);

  // Pre-generate and compress all language variants
  const entries = new Map<string, CacheEntry>();

  await Promise.all(
    languages.map(async (lang) => {
      const patched = patchHtmlI18n({ html, lang, translations: customTranslations });
      const buf = Buffer.from(patched, "utf8");
      const etag = version ? `"${version}-${lang}"` : `"${sha256Prefix}-${lang}"`;

      const [gzipped, brotli, zstdBuf] = await Promise.all([
        gzipAsync(buf),
        brotliAsync(buf),
        zstdAsync(buf),
      ]);

      entries.set(lang, {
        br: brotli,
        etag,
        gzip: gzipped,
        identity: buf,
        lang,
        zstd: zstdBuf,
      });
    }),
  );

  // Use the original languages array for stable, explicit ordering
  const available = languages;

  return {
    get({ acceptEncoding, acceptLanguage, lang: langOverride }) {
      const resolvedLang = matchLang(langOverride ?? acceptLanguage, available);
      const entry = entries.get(resolvedLang) ?? entries.get(available[0]!)!;

      const headers: Record<string, string> = {
        "Content-Language": entry.lang,
        "Content-Type": "text/html; charset=utf-8",
        ETag: entry.etag,
        Vary: "Accept-Language, Accept-Encoding",
      };

      if (!acceptEncoding) {
        return { body: entry.identity, headers };
      }

      const encoding = negotiate(acceptEncoding, ["br", "zstd", "gzip"]);

      if (!encoding) {
        return { body: entry.identity, headers };
      }

      headers["Content-Encoding"] = encoding;

      const bodyMap: Record<string, Buffer> = {
        br: entry.br,
        gzip: entry.gzip,
        zstd: entry.zstd,
      };

      return { body: bodyMap[encoding]!, headers };
    },
  };
}

/**
 * Server-side HTML patching for i18n.
 *
 * Resolves language from `lang` (explicit) or `acceptLanguage` (header),
 * merges translations, and injects a `<meta name="spa-guard-i18n">` tag
 * into `<head>`. Also updates `<html lang="...">`.
 *
 * English without custom translations is a no-op (returns unchanged HTML).
 */
export function patchHtmlI18n(options: PatchHtmlI18nOptions): string {
  const { acceptLanguage, html, lang: langOverride, translations: customTranslations } = options;

  const merged = mergeTranslations(customTranslations);
  const available = Object.keys(merged);
  const input = langOverride ?? acceptLanguage;
  const resolvedLang = matchLang(input, available);
  const t = merged[resolvedLang];

  // English without custom translations is a no-op — the HTML already contains
  // English defaults, so parsing and serializing would be unnecessary work.
  if (resolvedLang === "en" && !customTranslations?.en) {
    return html;
  }

  if (!t) {
    return html;
  }

  const doc = parse(html);

  // Find <html> and <head>
  const htmlEl = doc.childNodes.find(
    (n): n is DefaultTreeAdapterTypes.Element => n.nodeName === "html",
  );
  if (!htmlEl) {
    return html;
  }

  // Set <html lang>
  const langAttr = htmlEl.attrs.find((a) => a.name === "lang");
  if (langAttr) {
    langAttr.value = resolvedLang;
  } else {
    htmlEl.attrs.push({ name: "lang", value: resolvedLang });
  }

  const headEl = htmlEl.childNodes.find(
    (n): n is DefaultTreeAdapterTypes.Element => n.nodeName === "head",
  );
  if (!headEl) {
    return html;
  }

  // Inject <meta name="spa-guard-i18n"> to <head>
  const meta: DefaultTreeAdapterTypes.Element = {
    attrs: [
      { name: "name", value: "spa-guard-i18n" },
      { name: "content", value: JSON.stringify(t) },
    ],
    childNodes: [],
    namespaceURI: parse5Html.NS.HTML,
    nodeName: "meta",
    parentNode: headEl,
    tagName: "meta",
  };

  headEl.childNodes.unshift(meta);

  return serialize(doc);
}

function mergeTranslations(
  customTranslations?: Record<string, Partial<SpaGuardTranslations>>,
): Record<string, SpaGuardTranslations> {
  const merged: Record<string, SpaGuardTranslations> = { ...translations };
  if (customTranslations) {
    for (const [key, partial] of Object.entries(customTranslations)) {
      const base = merged[key];
      merged[key] = base ? { ...base, ...partial } : (partial as SpaGuardTranslations);
    }
  }
  return merged;
}
