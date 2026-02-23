export interface SpaGuardTranslations {
  heading: string;
  loading: string;
  message: string;
  reload: string;
  retrying: string;
  rtl?: boolean;
  tryAgain: string;
}

export const translations: Record<string, SpaGuardTranslations> = {
  ar: {
    heading: "حدث خطأ ما",
    loading: "...جارٍ التحميل",
    message: "يرجى تحديث الصفحة للمتابعة.",
    reload: "إعادة تحميل",
    retrying: "محاولة إعادة",
    rtl: true,
    tryAgain: "حاول مرة أخرى",
  },
  en: {
    heading: "Something went wrong",
    loading: "Loading...",
    message: "Please refresh the page to continue.",
    reload: "Reload page",
    retrying: "Retry attempt",
    tryAgain: "Try again",
  },
  he: {
    heading: "משהו השתבש",
    loading: "...טוען",
    message: "אנא רענן את הדף כדי להמשיך.",
    reload: "טען מחדש",
    retrying: "ניסיון חוזר",
    rtl: true,
    tryAgain: "נסה שוב",
  },
  ja: {
    heading: "問題が発生しました",
    loading: "読み込み中...",
    message: "ページを更新してください。",
    reload: "再読み込み",
    retrying: "リトライ",
    tryAgain: "もう一度試す",
  },
  ko: {
    heading: "문제가 발생했습니다",
    loading: "로딩 중...",
    message: "페이지를 새로고침해 주세요.",
    reload: "새로고침",
    retrying: "재시도",
    tryAgain: "다시 시도",
  },
  zh: {
    heading: "出了点问题",
    loading: "加载中...",
    message: "请刷新页面以继续。",
    reload: "重新加载",
    retrying: "重试次数",
    tryAgain: "重试",
  },
};

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

  const isAcceptLanguage = input.includes(",") || input.includes(";q=");

  if (isAcceptLanguage) {
    const entries = input
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

  return matchSingle(input, available) ?? "en";
}

function matchSingle(code: string, available: string[]): string | undefined {
  const lower = code.toLowerCase();

  // Exact match (case-insensitive)
  const exact = available.find((a) => a.toLowerCase() === lower);
  if (exact) {
    return exact;
  }

  // Prefix match: "zh-CN" matches "zh"
  const prefix = lower.split("-")[0];
  const prefixMatch = available.find((a) => a.toLowerCase() === prefix);
  if (prefixMatch) {
    return prefixMatch;
  }

  // Reverse prefix: "zh" matches "zh-Hant" if available
  const reverseMatch = available.find((a) => a.toLowerCase().startsWith(prefix + "-"));
  if (reverseMatch) {
    return reverseMatch;
  }

  return undefined;
}
