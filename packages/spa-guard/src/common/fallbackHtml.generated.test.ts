import { describe, expect, it } from "vitest";

import { defaultErrorFallbackHtml, defaultLoadingFallbackHtml } from "./fallbackHtml.generated";

describe("fallbackHtml.generated", () => {
  describe("defaultErrorFallbackHtml", () => {
    it("is a non-empty string", () => {
      expect(typeof defaultErrorFallbackHtml).toBe("string");
      expect(defaultErrorFallbackHtml.length).toBeGreaterThan(0);
    });

    it("contains the default heading text", () => {
      expect(defaultErrorFallbackHtml).toContain("Something went wrong");
    });

    it("contains the default message text", () => {
      expect(defaultErrorFallbackHtml).toContain("Please refresh the page to continue.");
    });

    it("contains heading data attribute", () => {
      expect(defaultErrorFallbackHtml).toContain('data-spa-guard-content="heading"');
    });

    it("contains message data attribute", () => {
      expect(defaultErrorFallbackHtml).toContain('data-spa-guard-content="message"');
    });

    it("contains try-again button (hidden by default)", () => {
      expect(defaultErrorFallbackHtml).toContain('data-spa-guard-action="try-again"');
      expect(defaultErrorFallbackHtml).toContain("display:none");
    });

    it("contains reload button without inline onclick (CSP-safe)", () => {
      expect(defaultErrorFallbackHtml).toContain('data-spa-guard-action="reload"');
      expect(defaultErrorFallbackHtml).not.toContain("onclick");
    });

    it("contains Error ID span", () => {
      expect(defaultErrorFallbackHtml).toContain("spa-guard-retry-id");
    });

    it("has no custom font-family", () => {
      expect(defaultErrorFallbackHtml).not.toContain("font-family");
    });

    it("has no spinner or animation", () => {
      expect(defaultErrorFallbackHtml).not.toContain("@keyframes");
      expect(defaultErrorFallbackHtml).not.toContain("animation");
    });

    it("has no custom colors on heading", () => {
      expect(defaultErrorFallbackHtml).not.toContain("#e74c3c");
    });

    it("has no background-color or border-radius on buttons", () => {
      expect(defaultErrorFallbackHtml).not.toContain("background-color");
      expect(defaultErrorFallbackHtml).not.toContain("border-radius");
    });

    it("is minified (no newlines)", () => {
      expect(defaultErrorFallbackHtml).not.toContain("\n");
    });
  });

  describe("defaultLoadingFallbackHtml", () => {
    it("is a non-empty string", () => {
      expect(typeof defaultLoadingFallbackHtml).toBe("string");
      expect(defaultLoadingFallbackHtml.length).toBeGreaterThan(0);
    });

    it("contains Loading... text", () => {
      expect(defaultLoadingFallbackHtml).toContain("Loading...");
    });

    it("contains retry attempt span with data attribute", () => {
      expect(defaultLoadingFallbackHtml).toContain('data-spa-guard-content="attempt"');
    });

    it("contains retrying section (hidden by default)", () => {
      expect(defaultLoadingFallbackHtml).toContain('data-spa-guard-section="retrying"');
      expect(defaultLoadingFallbackHtml).toContain("display:none");
    });

    it("has no custom font-family", () => {
      expect(defaultLoadingFallbackHtml).not.toContain("font-family");
    });

    it("has no spinner or animation", () => {
      expect(defaultLoadingFallbackHtml).not.toContain("@keyframes");
      expect(defaultLoadingFallbackHtml).not.toContain("animation");
    });

    it("is minified (no newlines)", () => {
      expect(defaultLoadingFallbackHtml).not.toContain("\n");
    });
  });

  describe("both templates", () => {
    it("error template is larger than loading template", () => {
      expect(defaultErrorFallbackHtml.length).toBeGreaterThan(defaultLoadingFallbackHtml.length);
    });
  });
});
