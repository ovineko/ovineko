export type { SpaGuardTranslations } from "../i18n";
export { matchLang, translations } from "../i18n";

import type { SpaGuardTranslations } from "../i18n";

import { matchLang, translations } from "../i18n";

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

/**
 * Escape special characters for safe use in HTML attribute values.
 */
export function escapeAttr(str: string): string {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
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

  // Build merged translation map
  const merged: Record<string, SpaGuardTranslations> = { ...translations };
  if (customTranslations) {
    for (const [key, partial] of Object.entries(customTranslations)) {
      const base = merged[key];
      merged[key] = base ? { ...base, ...partial } : (partial as SpaGuardTranslations);
    }
  }

  const available = Object.keys(merged);
  const input = langOverride ?? acceptLanguage;
  const resolvedLang = matchLang(input, available);
  const t = merged[resolvedLang];

  // English without custom translations → no-op
  if (resolvedLang === "en" && !customTranslations?.en) {
    return html;
  }

  if (!t) {
    return html;
  }

  const jsonStr = JSON.stringify(t);
  const metaTag = `<meta name="spa-guard-i18n" content="${escapeAttr(jsonStr)}">`;

  let result = html;

  // Inject meta tag into <head>
  const headIdx = result.indexOf("<head>");
  if (headIdx === -1) {
    const headAltIdx = result.indexOf("<head ");
    if (headAltIdx !== -1) {
      const closeIdx = result.indexOf(">", headAltIdx);
      if (closeIdx !== -1) {
        const insertPos = closeIdx + 1;
        result = result.slice(0, insertPos) + metaTag + result.slice(insertPos);
      }
    }
  } else {
    const insertPos = headIdx + "<head>".length;
    result = result.slice(0, insertPos) + metaTag + result.slice(insertPos);
  }

  // Update <html lang="...">
  result = result.replace(/<html([^>]*)lang="[^"]*"/, `<html$1lang="${resolvedLang}"`);
  if (!result.includes(`lang="${resolvedLang}"`)) {
    result = result.replace(/<html/, `<html lang="${resolvedLang}"`);
  }

  return result;
}
