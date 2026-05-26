import { describe, expect, it } from "vitest";

import { extractVersionFromHtml } from "./parseVersion";

describe("common/parseVersion", () => {
  describe("extractVersionFromHtml", () => {
    it("extracts version from __SPA_GUARD_VERSION__ format", () => {
      const html = '<html><script>window.__SPA_GUARD_VERSION__="1.2.3";</script></html>';
      expect(extractVersionFromHtml(html)).toBe("1.2.3");
    });

    it("extracts version from __SPA_GUARD_OPTIONS__ format (fallback)", () => {
      const html =
        '<html><script>window.__SPA_GUARD_OPTIONS__={"version":"2.0.0","other":"data"};</script></html>';
      expect(extractVersionFromHtml(html)).toBe("2.0.0");
    });

    it("returns null when neither marker is present", () => {
      const html = "<html><head></head><body>Hello</body></html>";
      expect(extractVersionFromHtml(html)).toBeNull();
    });

    it("prefers __SPA_GUARD_VERSION__ over __SPA_GUARD_OPTIONS__", () => {
      const html =
        '<html><script>window.__SPA_GUARD_VERSION__="3.0.0";window.__SPA_GUARD_OPTIONS__={"version":"1.0.0"};</script></html>';
      expect(extractVersionFromHtml(html)).toBe("3.0.0");
    });

    it("handles HTML with newlines from formatters", () => {
      const html =
        '<html>\n<head>\n<script>\nwindow.__SPA_GUARD_VERSION__="4.0.0";\n</script>\n</head>\n</html>';
      expect(extractVersionFromHtml(html)).toBe("4.0.0");
    });

    it("handles __SPA_GUARD_OPTIONS__ with newlines", () => {
      const html =
        '<html>\n<head>\n<script>\nwindow.__SPA_GUARD_OPTIONS__={\n"version":"4.0.0"\n};\n</script>\n</head>\n</html>';
      expect(extractVersionFromHtml(html)).toBe("4.0.0");
    });

    it("handles unquoted keys in __SPA_GUARD_OPTIONS__ (JSDOM behavior)", () => {
      const html =
        '<html><script>window.__SPA_GUARD_OPTIONS__={version:"5.0.0",reloadDelays:[1000]};</script></html>';
      expect(extractVersionFromHtml(html)).toBe("5.0.0");
    });

    it("handles whitespace around = sign", () => {
      const html = '<html><script>window.__SPA_GUARD_VERSION__ = "6.0.0";</script></html>';
      expect(extractVersionFromHtml(html)).toBe("6.0.0");
    });

    it("returns null for empty string", () => {
      expect(extractVersionFromHtml("")).toBeNull();
    });
  });
});
