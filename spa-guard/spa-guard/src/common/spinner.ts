import { defaultSpinnerHtml } from "./html.generated";
import { getOptions } from "./options";

export const SPINNER_ID = "__spa-guard-spinner";

export const defaultSpinnerSvg = defaultSpinnerHtml;

let savedOverflow: null | string = null;

export function dismissSpinner(): void {
  if (typeof document === "undefined") {
    return;
  }
  const el = document.getElementById(SPINNER_ID);
  if (el) {
    el.remove();
  }
  if (savedOverflow !== null) {
    document.body.style.overflow = savedOverflow;
    savedOverflow = null;
  } else if (el) {
    // Only reset to "" if we actually removed a spinner element
    // (e.g. vite-injected spinner where showSpinner was never called)
    document.body.style.overflow = "";
  }
}

// Strip characters that could break out of an HTML attribute value, close an
// HTML tag, or break out of a CSS rule block when the background string is
// interpolated into raw HTML/CSS (e.g. <style> tag content).
export const sanitizeCssValue = (value: string): string => value.replaceAll(/["'<>\\{};\n]/g, "");

export function getSpinnerHtml(backgroundOverride?: string): string {
  const opts = getOptions();
  if (opts.html?.spinner?.disabled) {
    return "";
  }

  const spinnerContent = opts.html?.spinner?.content ?? defaultSpinnerSvg;
  const bg = sanitizeCssValue(backgroundOverride ?? opts.html?.spinner?.background ?? "#fff");

  return `<div id="${SPINNER_ID}" style="position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:var(--spa-guard-spinner-bg,${bg})">${spinnerContent}</div>`;
}

export function showSpinner(options?: { background?: string }): () => void {
  if (typeof document === "undefined") {
    return () => {};
  }

  const opts = getOptions();
  if (opts.html?.spinner?.disabled) {
    return () => {};
  }

  const existing = document.getElementById(SPINNER_ID);
  if (existing) {
    existing.remove();
  }

  const html = getSpinnerHtml(options?.background);
  if (!html) {
    return () => {};
  }

  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  const overlay = wrapper.firstElementChild as HTMLElement;

  if (!existing) {
    savedOverflow = document.body.style.overflow;
  }
  document.body.style.overflow = "hidden";
  document.body.append(overlay);

  return () => dismissSpinner();
}
