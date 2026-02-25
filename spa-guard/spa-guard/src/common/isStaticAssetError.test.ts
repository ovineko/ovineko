import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getAssetUrl, isLikely404, isStaticAssetError } from "./isStaticAssetError";

const makeScriptErrorEvent = (src: string): Event => {
  const target = document.createElement("script");
  target.src = src;
  const event = new Event("error");
  Object.defineProperty(event, "target", { value: target });
  return event;
};

const makeLinkErrorEvent = (href: string): Event => {
  const target = document.createElement("link");
  target.rel = "stylesheet";
  target.href = href;
  const event = new Event("error");
  Object.defineProperty(event, "target", { value: target });
  return event;
};

describe("isStaticAssetError", () => {
  describe("script element with hashed filename", () => {
    it("returns true for Vite-style hashed JS (dash separator)", () => {
      expect(
        isStaticAssetError(makeScriptErrorEvent("https://example.com/assets/index-Bd0Ef7jk.js")),
      ).toBe(true);
    });

    it("returns true for vendor chunk with hashed filename", () => {
      expect(
        isStaticAssetError(makeScriptErrorEvent("https://example.com/assets/vendor-abc12345.js")),
      ).toBe(true);
    });

    it("returns true for .mjs extension with hash", () => {
      expect(
        isStaticAssetError(makeScriptErrorEvent("https://example.com/assets/chunk-ABCDEF12.mjs")),
      ).toBe(true);
    });

    it("returns true for dot separator (CRA-style)", () => {
      expect(
        isStaticAssetError(makeScriptErrorEvent("https://example.com/static/js/main.abc12345.js")),
      ).toBe(true);
    });
  });

  describe("link element with hashed CSS filename", () => {
    it("returns true for hashed CSS via link element", () => {
      expect(
        isStaticAssetError(makeLinkErrorEvent("https://example.com/assets/vendor-abc12345.css")),
      ).toBe(true);
    });

    it("returns true for index CSS with hash", () => {
      expect(
        isStaticAssetError(makeLinkErrorEvent("https://example.com/assets/index-Bd0Ef7jk.css")),
      ).toBe(true);
    });
  });

  describe("non-hashed filenames (false cases)", () => {
    it("returns false for script without hash (plain main.js)", () => {
      expect(isStaticAssetError(makeScriptErrorEvent("https://example.com/main.js"))).toBe(false);
    });

    it("returns false for script with short hash-like suffix (under 6 chars)", () => {
      expect(
        isStaticAssetError(makeScriptErrorEvent("https://example.com/assets/chunk-abc12.js")),
      ).toBe(false);
    });

    it("returns false for link without hash", () => {
      expect(isStaticAssetError(makeLinkErrorEvent("https://example.com/styles/app.css"))).toBe(
        false,
      );
    });
  });

  describe("non-element targets (API/window errors)", () => {
    it("returns false when event has no target", () => {
      const event = new Event("error");
      expect(isStaticAssetError(event)).toBe(false);
    });

    it("returns false for img element target", () => {
      const target = document.createElement("img");
      const event = new Event("error");
      Object.defineProperty(event, "target", { value: target });
      expect(isStaticAssetError(event)).toBe(false);
    });

    it("returns false for div element target", () => {
      const target = document.createElement("div");
      const event = new Event("error");
      Object.defineProperty(event, "target", { value: target });
      expect(isStaticAssetError(event)).toBe(false);
    });
  });
});

describe("isLikely404 (time-based fallback)", () => {
  it("returns false for a very recent page load (0ms)", () => {
    expect(isLikely404(undefined, 0)).toBe(false);
  });

  it("returns false for a recent page load under 30s", () => {
    expect(isLikely404(undefined, 5000)).toBe(false);
    expect(isLikely404(undefined, 29_999)).toBe(false);
  });

  it("returns false at exactly 30s boundary", () => {
    expect(isLikely404(undefined, 30_000)).toBe(false);
  });

  it("returns true just past the 30s threshold", () => {
    expect(isLikely404(undefined, 30_001)).toBe(true);
  });

  it("returns true for a long-running tab (several minutes)", () => {
    expect(isLikely404(undefined, 300_000)).toBe(true);
    expect(isLikely404(undefined, 3_600_000)).toBe(true);
  });
});

describe("isLikely404 (Resource Timing API path)", () => {
  const TEST_URL = "https://example.com/assets/index-Bd0Ef7jk.js";

  beforeEach(() => {
    vi.spyOn(performance, "getEntriesByName");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when no resource timing entry found (Safari / failed load)", () => {
    vi.mocked(performance.getEntriesByName).mockReturnValue([]);
    expect(isLikely404(TEST_URL)).toBe(true);
    expect(performance.getEntriesByName).toHaveBeenCalledWith(TEST_URL, "resource");
  });

  it("returns true when responseStatus >= 400", () => {
    vi.mocked(performance.getEntriesByName).mockReturnValue([
      { decodedBodySize: 0, responseStatus: 404, transferSize: 0 } as any,
    ]);
    expect(isLikely404(TEST_URL)).toBe(true);
    expect(performance.getEntriesByName).toHaveBeenCalledWith(TEST_URL, "resource");
  });

  it("returns true when responseStatus is exactly 400", () => {
    vi.mocked(performance.getEntriesByName).mockReturnValue([
      { decodedBodySize: 1234, responseStatus: 400, transferSize: 500 } as any,
    ]);
    expect(isLikely404(TEST_URL)).toBe(true);
    expect(performance.getEntriesByName).toHaveBeenCalledWith(TEST_URL, "resource");
  });

  it("returns true when transferSize and decodedBodySize are both 0 (blocked/failed)", () => {
    vi.mocked(performance.getEntriesByName).mockReturnValue([
      { decodedBodySize: 0, responseStatus: 0, transferSize: 0 } as any,
    ]);
    expect(isLikely404(TEST_URL)).toBe(true);
    expect(performance.getEntriesByName).toHaveBeenCalledWith(TEST_URL, "resource");
  });

  it("returns false for a successful load (responseStatus 200, non-zero body)", () => {
    vi.mocked(performance.getEntriesByName).mockReturnValue([
      { decodedBodySize: 5678, responseStatus: 200, transferSize: 1234 } as any,
    ]);
    expect(isLikely404(TEST_URL)).toBe(false);
    expect(performance.getEntriesByName).toHaveBeenCalledWith(TEST_URL, "resource");
  });

  it("returns false for a cached resource (transferSize 0 but decodedBodySize non-zero)", () => {
    vi.mocked(performance.getEntriesByName).mockReturnValue([
      { decodedBodySize: 5678, responseStatus: 200, transferSize: 0 } as any,
    ]);
    expect(isLikely404(TEST_URL)).toBe(false);
    expect(performance.getEntriesByName).toHaveBeenCalledWith(TEST_URL, "resource");
  });

  it("uses the last entry when multiple entries exist", () => {
    vi.mocked(performance.getEntriesByName).mockReturnValue([
      { decodedBodySize: 5678, responseStatus: 200, transferSize: 1234 } as any,
      { decodedBodySize: 0, responseStatus: 404, transferSize: 0 } as any,
    ]);
    expect(isLikely404(TEST_URL)).toBe(true);
    expect(performance.getEntriesByName).toHaveBeenCalledWith(TEST_URL, "resource");
  });
});

describe("getAssetUrl", () => {
  it("returns src from script element", () => {
    const event = makeScriptErrorEvent("https://example.com/assets/index-Bd0Ef7jk.js");
    expect(getAssetUrl(event)).toBe("https://example.com/assets/index-Bd0Ef7jk.js");
  });

  it("returns href from link element", () => {
    const event = makeLinkErrorEvent("https://example.com/assets/vendor-abc12345.css");
    expect(getAssetUrl(event)).toBe("https://example.com/assets/vendor-abc12345.css");
  });

  it("returns empty string for non-script/link element", () => {
    const event = new Event("error");
    expect(getAssetUrl(event)).toBe("");
  });
});
