import { describe, expect, it } from "vitest";

import type { SpaGuardTranslations } from "./index";

import { matchLang, translations } from "./index";

describe("i18n", () => {
  describe("translations", () => {
    it("includes all 38 supported languages", () => {
      const expected = [
        "ar",
        "az",
        "ca",
        "cs",
        "da",
        "de",
        "el",
        "en",
        "es",
        "eu",
        "fa",
        "fi",
        "fr",
        "he",
        "hr",
        "hu",
        "id",
        "it",
        "ja",
        "ka",
        "kk",
        "ko",
        "ky",
        "lt",
        "lv",
        "nl",
        "no",
        "pl",
        "pt",
        "ro",
        "ru",
        "sk",
        "sl",
        "sv",
        "th",
        "tr",
        "uk",
        "zh",
      ];
      expect(Object.keys(translations).sort()).toEqual(expected);
      expect(Object.keys(translations)).toHaveLength(38);
    });

    it("all translations have required fields", () => {
      for (const [, t] of Object.entries(translations)) {
        expect(t.heading).toBeDefined();
        expect(t.loading).toBeDefined();
        expect(t.message).toBeDefined();
        expect(t.reload).toBeDefined();
        expect(t.retrying).toBeDefined();
        expect(t.tryAgain).toBeDefined();
      }
    });

    it("ar, he, and fa have rtl flag", () => {
      expect(translations.ar.rtl).toBe(true);
      expect(translations.he.rtl).toBe(true);
      expect(translations.fa.rtl).toBe(true);
    });

    it("non-RTL languages do not have rtl flag", () => {
      const nonRtlLangs = ["en", "de", "fr", "es", "ru", "ja", "ko", "zh"];
      for (const lang of nonRtlLangs) {
        expect(translations[lang as keyof typeof translations].rtl).toBeUndefined();
      }
    });

    it("all languages have exactly 6 required string keys", () => {
      const requiredKeys = ["heading", "loading", "message", "reload", "retrying", "tryAgain"];
      for (const [, t] of Object.entries(translations)) {
        const keys = Object.keys(t).filter((k) => k !== "rtl");
        expect(keys.sort()).toEqual(requiredKeys.sort());

        // Ensure all values are non-empty strings
        for (const key of requiredKeys) {
          expect(typeof t[key as keyof typeof t]).toBe("string");
          expect((t[key as keyof typeof t] as string).length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("SpaGuardTranslations type", () => {
    it("has correct shape", () => {
      const t: SpaGuardTranslations = {
        heading: "test",
        loading: "test",
        message: "test",
        reload: "test",
        retrying: "test",
        tryAgain: "test",
      };
      expect(t.heading).toBe("test");
    });

    it("allows optional rtl field", () => {
      const t: SpaGuardTranslations = {
        heading: "test",
        loading: "test",
        message: "test",
        reload: "test",
        retrying: "test",
        rtl: true,
        tryAgain: "test",
      };
      expect(t.rtl).toBe(true);
    });
  });

  describe("matchLang", () => {
    describe("direct language codes", () => {
      it("returns exact match for simple code", () => {
        expect(matchLang("ko")).toBe("ko");
      });

      it("returns exact match for en", () => {
        expect(matchLang("en")).toBe("en");
      });

      it("returns prefix match for region code", () => {
        expect(matchLang("zh-CN")).toBe("zh");
      });

      it("returns prefix match for ko-KR", () => {
        expect(matchLang("ko-KR")).toBe("ko");
      });

      it("returns en for unknown language", () => {
        expect(matchLang("xx")).toBe("en");
      });

      it("returns en when input is undefined", () => {
        const input: string | undefined = undefined; // eslint-disable-line unicorn/no-useless-undefined
        expect(matchLang(input)).toBe("en");
      });
    });

    describe("Accept-Language header parsing", () => {
      it("parses simple Accept-Language with quality values", () => {
        expect(matchLang("ko-KR,ko;q=0.9,en;q=0.8")).toBe("ko");
      });

      it("selects highest quality match", () => {
        expect(matchLang("en;q=0.8,ko;q=0.9")).toBe("ko");
      });

      it("defaults quality to 1 when not specified", () => {
        expect(matchLang("ja,en;q=0.5")).toBe("ja");
      });

      it("returns en for Accept-Language with only unknown languages", () => {
        expect(matchLang("xx;q=1,yy;q=0.5")).toBe("en");
      });

      it("handles wildcard in Accept-Language", () => {
        expect(matchLang("*;q=0.1,ko;q=0.9")).toBe("ko");
      });

      it("handles zh-CN in Accept-Language", () => {
        expect(matchLang("zh-CN,zh;q=0.9,en;q=0.8")).toBe("zh");
      });

      it("handles complex Accept-Language header", () => {
        expect(matchLang("ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7")).toBe("ar");
      });
    });

    describe("custom available list", () => {
      it("matches against custom available list", () => {
        expect(matchLang("fr", ["fr", "en"])).toBe("fr");
      });

      it("returns en fallback when not in custom available list", () => {
        expect(matchLang("ko", ["fr", "en"])).toBe("en");
      });

      it("uses prefix matching with custom available list", () => {
        expect(matchLang("zh-TW", ["en", "zh", "zh-Hant"])).toBe("zh");
      });
    });
  });
});
