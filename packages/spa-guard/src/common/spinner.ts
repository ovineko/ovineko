import { getOptions } from "./options";

export const SPINNER_ID = "__spa-guard-spinner";

export const defaultSpinnerSvg = [
  '<svg width="40" height="40" viewBox="0 0 40 40" style="animation:spa-guard-spin .8s linear infinite">',
  '<circle cx="20" cy="20" r="16" fill="none" stroke="#e8e8e8" stroke-width="3"/>',
  '<circle cx="20" cy="20" r="16" fill="none" stroke="#666" stroke-width="3" stroke-dasharray="80" stroke-dashoffset="60" stroke-linecap="round"/>',
  "</svg>",
  "<style>@keyframes spa-guard-spin{to{transform:rotate(360deg)}}</style>",
].join("");

export function dismissSpinner(): void {
  const el = document.getElementById(SPINNER_ID);
  if (el) {
    el.remove();
  }
  document.body.style.overflow = "";
}

export function getSpinnerHtml(backgroundOverride?: string): string {
  const opts = getOptions();
  if (opts.spinner?.disabled) {
    return "";
  }

  const spinnerContent = opts.spinner?.content ?? defaultSpinnerSvg;
  const bg = backgroundOverride ?? opts.spinner?.background ?? "#fff";

  return `<div id="${SPINNER_ID}" style="position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:var(--spa-guard-spinner-bg,${bg})">${spinnerContent}</div>`;
}

export function showSpinner(options?: { background?: string }): () => void {
  const opts = getOptions();
  if (opts.spinner?.disabled) {
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

  document.body.style.overflow = "hidden";
  document.body.append(overlay);

  return () => dismissSpinner();
}
