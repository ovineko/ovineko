import type { SpaGuardTranslations } from "../i18n";

/**
 * Apply i18n translations to a virtual container's data-attributed elements.
 * Patches `[data-spa-guard-content]` and `[data-spa-guard-action]` elements,
 * and applies RTL direction if needed.
 *
 * Must be called on a virtual (detached) container BEFORE inserting into DOM
 * to avoid flash of untranslated content.
 */
export function applyI18n(container: HTMLElement, t: SpaGuardTranslations): void {
  // Patch data-spa-guard-content elements
  const contentEls = container.querySelectorAll<HTMLElement>("[data-spa-guard-content]");
  for (const el of contentEls) {
    const key = el.dataset.spaGuardContent as keyof SpaGuardTranslations;
    if (key && key in t) {
      const value = t[key];
      if (typeof value === "string") {
        el.textContent = value;
      }
    }
  }

  // Patch data-spa-guard-action elements (buttons)
  const actionEls = container.querySelectorAll<HTMLElement>("[data-spa-guard-action]");
  for (const el of actionEls) {
    const action = el.dataset.spaGuardAction;
    const tKey = action === "try-again" ? "tryAgain" : (action as keyof SpaGuardTranslations);
    if (tKey && tKey in t) {
      const value = t[tKey];
      if (typeof value === "string") {
        el.textContent = value;
      }
    }
  }

  // Apply RTL direction
  if (t.rtl && container.firstElementChild) {
    (container.firstElementChild as HTMLElement).style.direction = "rtl";
  }
}

/**
 * Read i18n translations from the `<meta name="spa-guard-i18n">` tag.
 * Returns parsed translations or null if the tag is absent or malformed.
 */
export function getI18n(): null | SpaGuardTranslations {
  try {
    const el = document.querySelector('meta[name="spa-guard-i18n"]');
    if (!el) {
      return null;
    }
    const content = el.getAttribute("content");
    if (!content) {
      return null;
    }
    return JSON.parse(content) as SpaGuardTranslations;
  } catch {
    return null;
  }
}
