export type { SpaGuardTranslations } from "../i18n";
export { matchLang, translations } from "../i18n";

import { Window } from "happy-dom";

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

  // Parse HTML with happy-dom
  const window = new Window();
  const document = window.document;
  document.write(html);

  // Set <html lang>
  document.documentElement.setAttribute("lang", resolvedLang);

  // Create and inject <meta name="spa-guard-i18n"> into <head>
  const meta = document.createElement("meta");
  meta.setAttribute("name", "spa-guard-i18n");
  meta.setAttribute("content", JSON.stringify(t));

  if (document.head) {
    document.head.prepend(meta);
  }

  // Reconstruct full HTML with original DOCTYPE
  const doctypeMatch = html.match(/^(<!doctype[^>]*>)/i);
  const doctype = doctypeMatch ? doctypeMatch[1] : "";
  const result = doctype + document.documentElement.outerHTML;

  window.close();

  return result;
}
