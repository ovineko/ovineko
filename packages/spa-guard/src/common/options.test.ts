import { afterEach, describe, expect, it } from "vitest";

import { optionsWindowKey } from "./constants";
import { defaultErrorFallbackHtml, defaultLoadingFallbackHtml } from "./fallbackHtml.generated";
import { getOptions } from "./options";

const setWindowOptions = (options: Record<string, unknown>): void => {
  (globalThis.window as any)[optionsWindowKey] = options;
};

const clearWindowOptions = (): void => {
  delete (globalThis.window as any)[optionsWindowKey];
};

afterEach(() => {
  clearWindowOptions();
});

describe("getOptions", () => {
  it("returns all defaults when no window options are set", () => {
    const result = getOptions();

    expect(result.html).toEqual({
      fallback: {
        content: defaultErrorFallbackHtml,
        selector: "body",
      },
      loading: {
        content: defaultLoadingFallbackHtml,
      },
    });
    expect(result.checkVersion).toEqual({
      interval: 300_000,
      mode: "html",
      onUpdate: "reload",
    });
    expect(result.reloadDelays).toEqual([1000, 2000, 5000]);
    expect(result.enableRetryReset).toBe(true);
  });

  describe("html namespace merge", () => {
    it("retains fallback.selector default when only fallback.content is overridden", () => {
      setWindowOptions({
        html: { fallback: { content: "<div>Custom</div>" } },
      });

      const result = getOptions();

      expect(result.html?.fallback?.content).toBe("<div>Custom</div>");
      expect(result.html?.fallback?.selector).toBe("body");
    });

    it("retains fallback defaults when only loading.content is overridden", () => {
      setWindowOptions({
        html: { loading: { content: "<div>Custom loading</div>" } },
      });

      const result = getOptions();

      expect(result.html?.fallback?.content).toBe(defaultErrorFallbackHtml);
      expect(result.html?.fallback?.selector).toBe("body");
      expect(result.html?.loading?.content).toBe("<div>Custom loading</div>");
    });

    it("retains loading default when only fallback.selector is overridden", () => {
      setWindowOptions({
        html: { fallback: { selector: "#app" } },
      });

      const result = getOptions();

      expect(result.html?.fallback?.content).toBe(defaultErrorFallbackHtml);
      expect(result.html?.fallback?.selector).toBe("#app");
      expect(result.html?.loading?.content).toBe(defaultLoadingFallbackHtml);
    });

    it("merges both fallback and loading overrides independently", () => {
      setWindowOptions({
        html: {
          fallback: { content: "<div>Error</div>", selector: "#root" },
          loading: { content: "<div>Wait</div>" },
        },
      });

      const result = getOptions();

      expect(result.html).toEqual({
        fallback: { content: "<div>Error</div>", selector: "#root" },
        loading: { content: "<div>Wait</div>" },
      });
    });

    it("retains all html defaults when html is empty object", () => {
      setWindowOptions({ html: {} });

      const result = getOptions();

      expect(result.html).toEqual({
        fallback: {
          content: defaultErrorFallbackHtml,
          selector: "body",
        },
        loading: {
          content: defaultLoadingFallbackHtml,
        },
      });
    });
  });

  describe("other namespace merges", () => {
    it("merges errors overrides while retaining defaults", () => {
      setWindowOptions({
        errors: { forceRetry: ["ChunkLoadError"] },
      });

      const result = getOptions();

      expect(result.errors?.forceRetry).toEqual(["ChunkLoadError"]);
      expect(result.errors?.ignore).toEqual([]);
    });

    it("merges top-level scalar overrides", () => {
      setWindowOptions({
        enableRetryReset: false,
        reloadDelays: [500],
      });

      const result = getOptions();

      expect(result.enableRetryReset).toBe(false);
      expect(result.reloadDelays).toEqual([500]);
      expect(result.html?.fallback?.content).toBe(defaultErrorFallbackHtml);
    });
  });
});
