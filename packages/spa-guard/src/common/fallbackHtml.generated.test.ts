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

    it("contains SVG icon", () => {
      expect(defaultErrorFallbackHtml).toContain("<svg");
      expect(defaultErrorFallbackHtml).toContain("</svg>");
    });

    it("uses system-ui font-family", () => {
      expect(defaultErrorFallbackHtml).toContain("font-family:system-ui");
    });

    it("uses ui-monospace for error ID", () => {
      expect(defaultErrorFallbackHtml).toContain("ui-monospace");
    });

    it("has styled buttons with border-radius", () => {
      expect(defaultErrorFallbackHtml).toContain("border-radius:6px");
    });

    it("has :has() CSS for error ID hiding", () => {
      expect(defaultErrorFallbackHtml).toContain(":has(");
    });

    it("has no spinner or animation", () => {
      expect(defaultErrorFallbackHtml).not.toContain("@keyframes");
      expect(defaultErrorFallbackHtml).not.toContain("animation");
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

    it("contains loading content data attribute", () => {
      expect(defaultLoadingFallbackHtml).toContain('data-spa-guard-content="loading"');
    });

    it("contains retrying content data attribute", () => {
      expect(defaultLoadingFallbackHtml).toContain('data-spa-guard-content="retrying"');
    });

    it("contains spinner placeholder with data attribute", () => {
      expect(defaultLoadingFallbackHtml).toContain("data-spa-guard-spinner");
    });

    it("contains default SVG spinner with animation", () => {
      expect(defaultLoadingFallbackHtml).toContain("@keyframes spa-guard-spin");
      expect(defaultLoadingFallbackHtml).toContain("animation:");
      expect(defaultLoadingFallbackHtml).toContain("<svg");
    });

    it("uses system-ui font-family", () => {
      expect(defaultLoadingFallbackHtml).toContain("font-family:system-ui");
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
