import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import type { HtmlCache } from "./index";

import { createHtmlCache, escapeAttr, matchLang, patchHtmlI18n, translations } from "./index";

const sampleHtml = `<!DOCTYPE html><html lang="en"><head><title>App</title></head><body><div id="app"></div></body></html>`;

const sampleHtmlWithVersion = `<!DOCTYPE html><html lang="en"><head><title>App</title><script>window.__SPA_GUARD_VERSION__="1.2.3";</script></head><body></body></html>`;

describe("node", () => {
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

    it("works with new languages - German", () => {
      const result = patchHtmlI18n({ html: sampleHtml, lang: "de" });
      expect(result).toContain('lang="de"');
      expect(result).toContain('<meta name="spa-guard-i18n"');
      expect(result).toContain("Etwas ist schief gelaufen");
    });

    it("works with new languages - Russian", () => {
      const result = patchHtmlI18n({ html: sampleHtml, lang: "ru" });
      expect(result).toContain('lang="ru"');
      expect(result).toContain('<meta name="spa-guard-i18n"');
      expect(result).toContain("Что-то пошло не так");
    });

    it("works with new languages - Spanish", () => {
      const result = patchHtmlI18n({ html: sampleHtml, lang: "es" });
      expect(result).toContain('lang="es"');
      expect(result).toContain("Algo salió mal");
    });

    it("includes RTL flag for Persian (fa)", () => {
      const result = patchHtmlI18n({ html: sampleHtml, lang: "fa" });
      expect(result).toContain('lang="fa"');
      expect(result).toContain("&quot;rtl&quot;:true");
      expect(result).toContain("مشکلی پیش آمد");
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
      // DOM serialization escapes & and " in attribute values;
      // < and > may remain unescaped (valid HTML in quoted attributes)
      expect(result).toContain("&amp;");
      expect(result).toContain("&quot;");
      // Verify the content is preserved (parseable from the attribute)
      const match = result.match(/content="([^"]*)"/);
      expect(match).toBeTruthy();
    });

    it("handles HTML without lang attribute", () => {
      const htmlNoLang = `<!DOCTYPE html><html><head></head><body></body></html>`;
      const result = patchHtmlI18n({ html: htmlNoLang, lang: "ko" });
      expect(result).toContain('lang="ko"');
    });

    it("adds lang to html tag even when another element has the same lang", () => {
      const htmlWithLangElsewhere = `<!DOCTYPE html><html><head></head><body><div lang="ko">Content</div></body></html>`;
      const result = patchHtmlI18n({ html: htmlWithLangElsewhere, lang: "ko" });
      expect(result).toMatch(/<html\s+lang="ko"/);
    });

    it("does not confuse data-lang with lang attribute on html element", () => {
      const htmlWithDataLang = `<!DOCTYPE html><html data-lang="en"><head></head><body></body></html>`;
      const result = patchHtmlI18n({ html: htmlWithDataLang, lang: "ko" });
      // Should add a real lang attribute, not just rewrite data-lang
      expect(result).toMatch(/<html\b[^>]*\slang="ko"/);
      // data-lang should remain unchanged
      expect(result).toContain('data-lang="en"');
    });

    it("updates single-quoted lang attribute", () => {
      const htmlSingleQuote = `<!DOCTYPE html><html lang='en'><head></head><body></body></html>`;
      const result = patchHtmlI18n({ html: htmlSingleQuote, lang: "ko" });
      expect(result).toContain('lang="ko"');
      expect(result).not.toContain("lang='en'");
    });

    it("updates lang attribute with whitespace around =", () => {
      const htmlSpaced = `<!DOCTYPE html><html lang = "en"><head></head><body></body></html>`;
      const result = patchHtmlI18n({ html: htmlSpaced, lang: "ko" });
      expect(result).toContain('lang="ko"');
      // Must not produce duplicate lang attributes
      expect((result.match(/lang\s*=/g) ?? []).length).toBe(1);
      expect(result).toContain("</head>");
      expect(result).toContain("</body>");
      expect(result).toContain("</html>");
    });

    it("updates unquoted lang attribute without corrupting HTML", () => {
      const htmlUnquoted = `<!DOCTYPE html><html lang=en><head></head><body></body></html>`;
      const result = patchHtmlI18n({ html: htmlUnquoted, lang: "ko" });
      expect(result).toContain('lang="ko"');
      expect(result).not.toContain("lang=en");
      // Ensure the HTML structure remains intact (not truncated by regex)
      expect(result).toContain("</head>");
      expect(result).toContain("</body>");
      expect(result).toContain("</html>");
    });

    it("does not corrupt HTML when 'lang' appears inside another attribute value", () => {
      const htmlWithLangInValue = `<!DOCTYPE html><html data-note="foo lang = 'en' marker"><head></head><body></body></html>`;
      const result = patchHtmlI18n({ html: htmlWithLangInValue, lang: "ko" });
      // Should add a real lang attribute, not rewrite inside data-note
      expect(result).toMatch(/<html\b[^>]*\slang="ko"/);
      // data-note must remain intact
      expect(result).toContain(`data-note="foo lang = 'en' marker"`);
      // HTML structure must be valid
      expect(result).toContain("</head>");
      expect(result).toContain("</html>");
    });

    it("does not produce duplicate lang when html attr contains >", () => {
      const htmlWithGt = `<!DOCTYPE html><html data-note="a > b" lang="en"><head></head><body></body></html>`;
      const result = patchHtmlI18n({ html: htmlWithGt, lang: "ko" });
      expect(result).toContain('lang="ko"');
      // Must not produce duplicate lang attributes
      expect((result.match(/lang\s*=/g) ?? []).length).toBe(1);
      // data-note must remain intact
      expect(result).toContain('data-note="a > b"');
      expect(result).toContain("</html>");
    });

    it("does not corrupt head injection when head attr contains >", () => {
      const htmlWithGtInHead = `<!DOCTYPE html><html lang="en"><head data-x=">"><title>App</title></head><body></body></html>`;
      const result = patchHtmlI18n({ html: htmlWithGtInHead, lang: "ko" });
      expect(result).toContain('<meta name="spa-guard-i18n"');
      // Meta must be between <head ...> and </head>, not inside an attribute
      const headCloseIdx = result.indexOf("</head>");
      const metaIdx = result.indexOf('<meta name="spa-guard-i18n"');
      expect(metaIdx).toBeGreaterThan(-1);
      expect(metaIdx).toBeLessThan(headCloseIdx);
      // data-x must remain intact
      expect(result).toContain('data-x=">"');
    });

    it("does not produce duplicate lang when xml:lang precedes lang", () => {
      const htmlWithXmlLang = `<!DOCTYPE html><html xml:lang="en" lang="fr"><head></head><body></body></html>`;
      const result = patchHtmlI18n({ html: htmlWithXmlLang, lang: "ko" });
      expect(result).toContain('lang="ko"');
      // Must not produce duplicate lang attributes
      expect((result.match(/(?<!\w[:.-])lang\s*=/g) ?? []).length).toBe(1);
      // xml:lang should remain unchanged
      expect(result).toContain('xml:lang="en"');
      expect(result).toContain("</html>");
    });

    it("does not produce duplicate lang when dotted attribute precedes lang", () => {
      const htmlWithDot = `<!DOCTYPE html><html x-on:click.prevent="foo" lang="en"><head></head><body></body></html>`;
      const result = patchHtmlI18n({ html: htmlWithDot, lang: "ko" });
      expect(result).toContain('lang="ko"');
      // Must not produce duplicate lang attributes
      expect((result.match(/(?<!\w[:.-])lang\s*=/g) ?? []).length).toBe(1);
      // Dotted attribute should remain unchanged
      expect(result).toContain('x-on:click.prevent="foo"');
      expect(result).toContain("</html>");
    });

    it("adds lang when only xml:lang exists (no lang attribute)", () => {
      const htmlXmlLangOnly = `<!DOCTYPE html><html xml:lang="en"><head></head><body></body></html>`;
      const result = patchHtmlI18n({ html: htmlXmlLangOnly, lang: "ko" });
      expect(result).toMatch(/<html\b[^>]*\slang="ko"/);
      expect(result).toContain('xml:lang="en"');
    });

    it("injects meta tag into uppercase HEAD element", () => {
      const htmlUpperHead = `<!DOCTYPE html><html lang="en"><HEAD><title>App</title></HEAD><body></body></html>`;
      const result = patchHtmlI18n({ html: htmlUpperHead, lang: "ko" });
      expect(result).toContain('<meta name="spa-guard-i18n"');
    });

    it("injects meta tag into head with attributes case-insensitively", () => {
      const htmlMixedHead = `<!DOCTYPE html><html lang="en"><Head class="x"><title>App</title></Head><body></body></html>`;
      const result = patchHtmlI18n({ html: htmlMixedHead, lang: "ko" });
      expect(result).toContain('<meta name="spa-guard-i18n"');
    });
  });

  describe("createHtmlCache", () => {
    let cache: HtmlCache;

    describe("multi-language cache", () => {
      it("creates a cache with specified languages", async () => {
        cache = await createHtmlCache({
          html: sampleHtml,
          languages: ["en", "ko", "ja"],
        });
        const response = cache.get({ lang: "ko" });
        expect(response.body).toBeInstanceOf(Buffer);
        expect(response.body.toString()).toContain('lang="ko"');
      });

      it("defaults to all built-in languages when languages not specified", async () => {
        cache = await createHtmlCache({ html: sampleHtml });
        // Should have entries for all built-in translation languages
        const koResponse = cache.get({ lang: "ko" });
        expect(koResponse.body.toString()).toContain('lang="ko"');
        const jaResponse = cache.get({ lang: "ja" });
        expect(jaResponse.body.toString()).toContain('lang="ja"');
      });

      it("includes custom translation languages in defaults", async () => {
        cache = await createHtmlCache({
          html: sampleHtml,
          translations: {
            th: {
              heading: "Error",
              loading: "Loading",
              message: "Msg",
              reload: "Reload",
              retrying: "Retry",
              tryAgain: "Try",
            },
          },
        });
        const response = cache.get({ lang: "th" });
        expect(response.body.toString()).toContain('lang="th"');
      });
    });

    describe("ETag", () => {
      it("uses version from HTML when __SPA_GUARD_VERSION__ is available", async () => {
        cache = await createHtmlCache({
          html: sampleHtmlWithVersion,
          languages: ["en", "ko"],
        });
        const response = cache.get({ lang: "ko" });
        expect(response.headers.ETag).toBe('"1.2.3-ko"');
      });

      it("falls back to sha256 prefix when no version in HTML", async () => {
        cache = await createHtmlCache({
          html: sampleHtml,
          languages: ["en", "ko"],
        });
        const response = cache.get({ lang: "ko" });
        // Should be a quoted string with format "<hash>-<lang>"
        expect(response.headers.ETag).toMatch(/^"[a-f0-9]{16}-ko"$/);
      });

      it("produces different ETags for different languages", async () => {
        cache = await createHtmlCache({
          html: sampleHtmlWithVersion,
          languages: ["en", "ko", "ja"],
        });
        const enEtag = cache.get({ lang: "en" }).headers.ETag;
        const koEtag = cache.get({ lang: "ko" }).headers.ETag;
        const jaEtag = cache.get({ lang: "ja" }).headers.ETag;
        expect(enEtag).not.toBe(koEtag);
        expect(koEtag).not.toBe(jaEtag);
        expect(enEtag).not.toBe(jaEtag);
      });
    });

    describe("compression", () => {
      it("returns valid gzip content that decompresses correctly", async () => {
        cache = await createHtmlCache({
          html: sampleHtml,
          languages: ["ko"],
        });
        const response = cache.get({ acceptEncoding: "gzip", lang: "ko" });
        expect(response.headers["Content-Encoding"]).toBe("gzip");
        const decompressed = gunzipSync(response.body as Buffer).toString();
        expect(decompressed).toContain('lang="ko"');
      });

      it("returns valid brotli content that decompresses correctly", async () => {
        const { brotliDecompressSync } = await import("node:zlib");
        cache = await createHtmlCache({
          html: sampleHtml,
          languages: ["ko"],
        });
        const response = cache.get({ acceptEncoding: "br", lang: "ko" });
        expect(response.headers["Content-Encoding"]).toBe("br");
        const decompressed = brotliDecompressSync(response.body as Buffer).toString();
        expect(decompressed).toContain('lang="ko"');
      });

      it("returns valid zstd content that decompresses correctly", async () => {
        const { zstdDecompress } = await import("node:zlib");
        const { promisify } = await import("node:util");
        const zstdDecompressAsync = promisify(zstdDecompress);
        cache = await createHtmlCache({
          html: sampleHtml,
          languages: ["ko"],
        });
        const response = cache.get({ acceptEncoding: "zstd", lang: "ko" });
        expect(response.headers["Content-Encoding"]).toBe("zstd");
        const decompressedBuf = await zstdDecompressAsync(response.body as Buffer);
        const decompressed = decompressedBuf.toString();
        expect(decompressed).toContain('lang="ko"');
      });
    });

    describe("get() headers", () => {
      it("returns correct Content-Type", async () => {
        cache = await createHtmlCache({
          html: sampleHtml,
          languages: ["en"],
        });
        const response = cache.get({ lang: "en" });
        expect(response.headers["Content-Type"]).toBe("text/html; charset=utf-8");
      });

      it("returns Content-Language matching resolved language", async () => {
        cache = await createHtmlCache({
          html: sampleHtml,
          languages: ["en", "ko"],
        });
        const response = cache.get({ lang: "ko" });
        expect(response.headers["Content-Language"]).toBe("ko");
      });

      it("always includes Vary header", async () => {
        cache = await createHtmlCache({
          html: sampleHtml,
          languages: ["en"],
        });
        const response = cache.get({ lang: "en" });
        expect(response.headers.Vary).toBe("Accept-Language, Accept-Encoding");
      });

      it("omits Content-Encoding for identity (no acceptEncoding)", async () => {
        cache = await createHtmlCache({
          html: sampleHtml,
          languages: ["en"],
        });
        const response = cache.get({ lang: "en" });
        expect(response.headers["Content-Encoding"]).toBeUndefined();
      });

      it("omits Content-Encoding when no encoding matches", async () => {
        cache = await createHtmlCache({
          html: sampleHtml,
          languages: ["en"],
        });
        const response = cache.get({ acceptEncoding: "compress", lang: "en" });
        expect(response.headers["Content-Encoding"]).toBeUndefined();
      });

      it("returns Content-Encoding for gzip", async () => {
        cache = await createHtmlCache({
          html: sampleHtml,
          languages: ["en"],
        });
        const response = cache.get({ acceptEncoding: "gzip, deflate", lang: "en" });
        expect(response.headers["Content-Encoding"]).toBe("gzip");
      });

      it("returns Content-Encoding for br", async () => {
        cache = await createHtmlCache({
          html: sampleHtml,
          languages: ["en"],
        });
        const response = cache.get({ acceptEncoding: "gzip, br", lang: "en" });
        expect(response.headers["Content-Encoding"]).toBe("br");
      });

      it("returns Content-Encoding for zstd", async () => {
        cache = await createHtmlCache({
          html: sampleHtml,
          languages: ["en"],
        });
        const response = cache.get({ acceptEncoding: "zstd, gzip", lang: "en" });
        expect(response.headers["Content-Encoding"]).toBe("zstd");
      });
    });

    describe("language resolution", () => {
      it("resolves language from acceptLanguage header", async () => {
        cache = await createHtmlCache({
          html: sampleHtml,
          languages: ["en", "ko", "ja"],
        });
        const response = cache.get({ acceptLanguage: "ja-JP,ja;q=0.9" });
        expect(response.headers["Content-Language"]).toBe("ja");
      });

      it("lang takes priority over acceptLanguage", async () => {
        cache = await createHtmlCache({
          html: sampleHtml,
          languages: ["en", "ko", "ja"],
        });
        const response = cache.get({ acceptLanguage: "ja-JP", lang: "ko" });
        expect(response.headers["Content-Language"]).toBe("ko");
      });

      it("falls back to en for unrecognized language", async () => {
        cache = await createHtmlCache({
          html: sampleHtml,
          languages: ["en", "ko"],
        });
        const response = cache.get({ lang: "xx" });
        expect(response.headers["Content-Language"]).toBe("en");
      });
    });

    describe("fallback to identity", () => {
      it("returns uncompressed body when acceptEncoding is empty string", async () => {
        cache = await createHtmlCache({
          html: sampleHtml,
          languages: ["en"],
        });
        const response = cache.get({ acceptEncoding: "", lang: "en" });
        expect(response.headers["Content-Encoding"]).toBeUndefined();
        expect(response.body.toString()).toContain("<html");
      });
    });
  });
});
