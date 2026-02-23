import { describe, expect, it } from "vitest";

import { escapeAttr, matchLang, patchHtmlI18n, translations } from "./index";

const sampleHtml = `<!DOCTYPE html><html lang="en"><head><title>App</title></head><body><div id="app"></div></body></html>`;

describe("server", () => {
  describe("escapeAttr", () => {
    it("escapes & character", () => {
      expect(escapeAttr("a&b")).toBe("a&amp;b");
    });

    it("escapes double quote", () => {
      expect(escapeAttr('a"b')).toBe("a&quot;b");
    });

    it("escapes < character", () => {
      expect(escapeAttr("a<b")).toBe("a&lt;b");
    });

    it("escapes > character", () => {
      expect(escapeAttr("a>b")).toBe("a&gt;b");
    });

    it("escapes all special characters together", () => {
      expect(escapeAttr('<"&>')).toBe("&lt;&quot;&amp;&gt;");
    });

    it("returns unchanged string without special chars", () => {
      expect(escapeAttr("hello world")).toBe("hello world");
    });
  });

  describe("re-exports from i18n", () => {
    it("re-exports translations", () => {
      expect(translations).toBeDefined();
      expect(translations.en).toBeDefined();
    });

    it("re-exports matchLang", () => {
      expect(typeof matchLang).toBe("function");
      expect(matchLang("ko")).toBe("ko");
    });
  });

  describe("patchHtmlI18n", () => {
    it("returns unchanged HTML for English without custom translations", () => {
      const result = patchHtmlI18n({ html: sampleHtml });
      expect(result).toBe(sampleHtml);
    });

    it("returns unchanged HTML when acceptLanguage resolves to en", () => {
      const result = patchHtmlI18n({ acceptLanguage: "en-US", html: sampleHtml });
      expect(result).toBe(sampleHtml);
    });

    it("injects meta tag for Korean", () => {
      const result = patchHtmlI18n({ html: sampleHtml, lang: "ko" });
      expect(result).toContain('<meta name="spa-guard-i18n"');
      expect(result).toContain("문제가 발생했습니다");
    });

    it("updates html lang attribute", () => {
      const result = patchHtmlI18n({ html: sampleHtml, lang: "ko" });
      expect(result).toContain('lang="ko"');
      expect(result).not.toContain('lang="en"');
    });

    it("resolves language from Accept-Language header", () => {
      const result = patchHtmlI18n({
        acceptLanguage: "ja-JP,ja;q=0.9,en;q=0.8",
        html: sampleHtml,
      });
      expect(result).toContain('lang="ja"');
      expect(result).toContain("問題が発生しました");
    });

    it("lang option takes priority over acceptLanguage", () => {
      const result = patchHtmlI18n({
        acceptLanguage: "ja-JP",
        html: sampleHtml,
        lang: "ko",
      });
      expect(result).toContain('lang="ko"');
      expect(result).toContain("문제가 발생했습니다");
    });

    it("merges custom translations with built-in", () => {
      const result = patchHtmlI18n({
        html: sampleHtml,
        lang: "ko",
        translations: { ko: { heading: "서비스 점검 중입니다" } },
      });
      expect(result).toContain("서비스 점검 중입니다");
      // Other fields from built-in should still be present
      expect(result).toContain("새로고침");
    });

    it("supports completely custom language", () => {
      const result = patchHtmlI18n({
        html: sampleHtml,
        lang: "th",
        translations: {
          th: {
            heading: "เกิดข้อผิดพลาด",
            loading: "กำลังโหลด...",
            message: "กรุณารีเฟรชหน้า",
            reload: "โหลดใหม่",
            retrying: "ลองใหม่ครั้งที่",
            tryAgain: "ลองอีกครั้ง",
          },
        },
      });
      expect(result).toContain('lang="th"');
      expect(result).toContain("เกิดข้อผิดพลาด");
    });

    it("includes RTL flag in meta for Arabic", () => {
      const result = patchHtmlI18n({ html: sampleHtml, lang: "ar" });
      // Double quotes in JSON are escaped as &quot; inside the HTML attribute
      expect(result).toContain("&quot;rtl&quot;:true");
    });

    it("handles HTML with custom English translations", () => {
      const result = patchHtmlI18n({
        html: sampleHtml,
        lang: "en",
        translations: { en: { heading: "Custom heading" } },
      });
      expect(result).toContain("Custom heading");
      expect(result).toContain('<meta name="spa-guard-i18n"');
    });

    it("injects meta tag after <head> opening tag", () => {
      const result = patchHtmlI18n({ html: sampleHtml, lang: "ko" });
      const headIdx = result.indexOf("<head>");
      const metaIdx = result.indexOf('<meta name="spa-guard-i18n"');
      expect(metaIdx).toBeGreaterThan(headIdx);
      expect(metaIdx).toBeLessThan(result.indexOf("</head>"));
    });

    it("escapes special chars in meta content attribute", () => {
      const result = patchHtmlI18n({
        html: sampleHtml,
        lang: "test",
        translations: {
          test: {
            heading: 'He said "hello" & <goodbye>',
            loading: "Loading...",
            message: "msg",
            reload: "reload",
            retrying: "retry",
            tryAgain: "try",
          },
        },
      });
      // The content attribute should have escaped HTML entities
      expect(result).toContain("&amp;");
      expect(result).toContain("&lt;");
      expect(result).toContain("&gt;");
    });

    it("handles HTML without lang attribute", () => {
      const htmlNoLang = `<!DOCTYPE html><html><head></head><body></body></html>`;
      const result = patchHtmlI18n({ html: htmlNoLang, lang: "ko" });
      expect(result).toContain('lang="ko"');
    });
  });
});
