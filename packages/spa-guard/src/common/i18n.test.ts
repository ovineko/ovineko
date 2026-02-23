import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { SpaGuardTranslations } from "../i18n";

import { applyI18n, getI18n } from "./i18n";

const koTranslations: SpaGuardTranslations = {
  heading: "문제가 발생했습니다",
  loading: "로딩 중...",
  message: "페이지를 새로고침해 주세요.",
  reload: "새로고침",
  retrying: "재시도",
  tryAgain: "다시 시도",
};

const arTranslations: SpaGuardTranslations = {
  heading: "حدث خطأ ما",
  loading: "...جارٍ التحميل",
  message: "يرجى تحديث الصفحة للمتابعة.",
  reload: "إعادة تحميل",
  retrying: "محاولة إعادة",
  rtl: true,
  tryAgain: "حاول مرة أخرى",
};

describe("common/i18n", () => {
  describe("getI18n", () => {
    beforeEach(() => {
      document.head.innerHTML = "";
    });

    afterEach(() => {
      document.head.innerHTML = "";
    });

    it("returns null when no meta tag exists", () => {
      expect(getI18n()).toBeNull();
    });

    it("returns parsed translations when meta tag exists", () => {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "spa-guard-i18n");
      meta.setAttribute("content", JSON.stringify(koTranslations));
      document.head.append(meta);

      const result = getI18n();
      expect(result).toEqual(koTranslations);
    });

    it("returns null for malformed JSON in meta content", () => {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "spa-guard-i18n");
      meta.setAttribute("content", "not-valid-json{");
      document.head.append(meta);

      expect(getI18n()).toBeNull();
    });

    it("returns null when meta has empty content", () => {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "spa-guard-i18n");
      meta.setAttribute("content", "");
      document.head.append(meta);

      expect(getI18n()).toBeNull();
    });

    it("returns null when meta has no content attribute", () => {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "spa-guard-i18n");
      document.head.append(meta);

      expect(getI18n()).toBeNull();
    });
  });

  describe("applyI18n", () => {
    it("patches data-spa-guard-content elements", () => {
      const container = document.createElement("div");
      container.innerHTML = `<h1 data-spa-guard-content="heading">Something went wrong</h1><p data-spa-guard-content="message">Please refresh.</p>`;

      applyI18n(container, koTranslations);

      expect(container.querySelector('[data-spa-guard-content="heading"]')?.textContent).toBe(
        "문제가 발생했습니다",
      );
      expect(container.querySelector('[data-spa-guard-content="message"]')?.textContent).toBe(
        "페이지를 새로고침해 주세요.",
      );
    });

    it("patches data-spa-guard-action elements", () => {
      const container = document.createElement("div");
      container.innerHTML = `<button data-spa-guard-action="reload">Reload page</button><button data-spa-guard-action="try-again">Try again</button>`;

      applyI18n(container, koTranslations);

      expect(container.querySelector('[data-spa-guard-action="reload"]')?.textContent).toBe(
        "새로고침",
      );
      expect(container.querySelector('[data-spa-guard-action="try-again"]')?.textContent).toBe(
        "다시 시도",
      );
    });

    it("maps try-again action to tryAgain translation key", () => {
      const container = document.createElement("div");
      container.innerHTML = `<button data-spa-guard-action="try-again">Try again</button>`;

      applyI18n(container, koTranslations);

      expect(container.querySelector('[data-spa-guard-action="try-again"]')?.textContent).toBe(
        "다시 시도",
      );
    });

    it("applies RTL direction when rtl flag is set", () => {
      const container = document.createElement("div");
      container.innerHTML = `<div><h1 data-spa-guard-content="heading">Heading</h1></div>`;

      applyI18n(container, arTranslations);

      const firstChild = container.firstElementChild as HTMLElement;
      expect(firstChild.style.direction).toBe("rtl");
    });

    it("applies RTL to content div, not style element, when style comes first", () => {
      const container = document.createElement("div");
      container.innerHTML = `<style>.test{}</style><div><h1 data-spa-guard-content="heading">Heading</h1></div>`;

      applyI18n(container, arTranslations);

      const styleEl = container.querySelector("style") as HTMLElement;
      const divEl = container.querySelector("div") as HTMLElement;
      expect(styleEl.style.direction).toBe("");
      expect(divEl.style.direction).toBe("rtl");
    });

    it("does not apply direction when rtl is not set", () => {
      const container = document.createElement("div");
      container.innerHTML = `<div><h1 data-spa-guard-content="heading">Heading</h1></div>`;

      applyI18n(container, koTranslations);

      const firstChild = container.firstElementChild as HTMLElement;
      expect(firstChild.style.direction).toBe("");
    });

    it("skips elements with unknown content keys", () => {
      const container = document.createElement("div");
      container.innerHTML = `<span data-spa-guard-content="unknown">Original</span>`;

      applyI18n(container, koTranslations);

      expect(container.querySelector('[data-spa-guard-content="unknown"]')?.textContent).toBe(
        "Original",
      );
    });

    it("patches loading content in loading template", () => {
      const container = document.createElement("div");
      container.innerHTML = `<h2 data-spa-guard-content="loading">Loading...</h2><p><span data-spa-guard-content="retrying">Retry attempt</span> <span data-spa-guard-content="attempt">1</span></p>`;

      applyI18n(container, koTranslations);

      expect(container.querySelector('[data-spa-guard-content="loading"]')?.textContent).toBe(
        "로딩 중...",
      );
      expect(container.querySelector('[data-spa-guard-content="retrying"]')?.textContent).toBe(
        "재시도",
      );
    });

    it("does not patch attempt number (not a string translation)", () => {
      const container = document.createElement("div");
      container.innerHTML = `<span data-spa-guard-content="attempt">3</span>`;

      applyI18n(container, koTranslations);

      // "attempt" is not in translation keys, so should remain
      expect(container.querySelector('[data-spa-guard-content="attempt"]')?.textContent).toBe("3");
    });
  });
});
