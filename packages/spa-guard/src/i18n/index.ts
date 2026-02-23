import { translations } from "./translations";

export interface SpaGuardTranslations {
  heading: string;
  loading: string;
  message: string;
  reload: string;
  retrying: string;
  rtl?: boolean;
  tryAgain: string;
}

/**
 * Match a language code or Accept-Language header against available translations.
 *
 * - If `input` is undefined, returns `"en"`.
 * - If `input` contains `,` or `;q=`, it's parsed as an Accept-Language header
 *   with quality values sorted descending.
 * - Otherwise it's treated as a direct language code.
 *
 * Resolution: exact match → prefix match → `"en"`.
 */
export function matchLang(
  input: string | undefined,
  available: string[] = Object.keys(translations),
): string {
  if (input === undefined) {
    return "en";
  }

  if (input.includes(",") || input.includes(";q=")) {
    return matchAcceptLanguage(input, available);
  }

  return matchSingle(input, available) ?? "en";
}

function matchAcceptLanguage(header: string, available: string[]): string {
  const entries = header
    .split(",")
    .map((part) => {
      const [lang = "", ...rest] = part.trim().split(";");
      const qMatch = rest.join(";").match(/q\s*=\s*([\d.]+)/);
      const q = qMatch?.[1] ? Number.parseFloat(qMatch[1]) : 1;
      return { lang: lang.trim(), q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of entries) {
    const match = matchSingle(lang, available);
    if (match) {
      return match;
    }
  }

  return "en";
}

function matchSingle(code: string, available: string[]): string | undefined {
  const lower = code.toLowerCase();
  const prefix = lower.split("-")[0];

  return (
    available.find((a) => a.toLowerCase() === lower) ??
    available.find((a) => a.toLowerCase() === prefix) ??
    available.find((a) => a.toLowerCase().startsWith(prefix + "-"))
  );
}

export { translations } from "./translations";
