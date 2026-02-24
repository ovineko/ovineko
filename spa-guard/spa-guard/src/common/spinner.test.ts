import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./options", () => ({
  getOptions: vi.fn(),
}));

import { getOptions } from "./options";
import {
  defaultSpinnerSvg,
  dismissSpinner,
  getSpinnerHtml,
  showSpinner,
  SPINNER_ID,
} from "./spinner";

const mockGetOptions = vi.mocked(getOptions);

const defaultSpinnerOptions = {
  html: {
    spinner: {
      background: "#fff",
      disabled: false,
    },
  },
};

describe("spinner", () => {
  beforeEach(() => {
    mockGetOptions.mockReturnValue(defaultSpinnerOptions);
    document.body.innerHTML = "";
    document.body.style.overflow = "";
  });

  afterEach(() => {
    dismissSpinner();
    vi.clearAllMocks();
    document.body.innerHTML = "";
    document.body.style.overflow = "";
  });

  describe("constants", () => {
    it("exports SPINNER_ID", () => {
      expect(SPINNER_ID).toBe("__spa-guard-spinner");
    });

    it("exports defaultSpinnerSvg containing SVG and keyframes", () => {
      expect(defaultSpinnerSvg).toContain("<svg");
      expect(defaultSpinnerSvg).toContain("@keyframes spa-guard-spin");
    });
  });

  describe("getSpinnerHtml", () => {
    it("returns HTML with the spinner ID", () => {
      const html = getSpinnerHtml();
      expect(html).toContain(`id="${SPINNER_ID}"`);
    });

    it("returns HTML with default SVG spinner content", () => {
      const html = getSpinnerHtml();
      expect(html).toContain(defaultSpinnerSvg);
    });

    it("returns HTML with fixed positioning and max z-index", () => {
      const html = getSpinnerHtml();
      expect(html).toContain("position:fixed");
      expect(html).toContain("inset:0");
      expect(html).toContain("z-index:2147483647");
    });

    it("uses default #fff background when no override", () => {
      const html = getSpinnerHtml();
      expect(html).toContain("var(--spa-guard-spinner-bg,#fff)");
    });

    it("uses background override when provided", () => {
      const html = getSpinnerHtml("#000");
      expect(html).toContain("var(--spa-guard-spinner-bg,#000)");
    });

    it("uses background from options when no override", () => {
      mockGetOptions.mockReturnValue({
        html: { spinner: { background: "rgba(0,0,0,0.5)", disabled: false } },
      });
      const html = getSpinnerHtml();
      expect(html).toContain("var(--spa-guard-spinner-bg,rgba(0,0,0,0.5))");
    });

    it("uses custom spinner content from options", () => {
      mockGetOptions.mockReturnValue({
        html: { spinner: { content: "<div>Custom Spinner</div>", disabled: false } },
      });
      const html = getSpinnerHtml();
      expect(html).toContain("<div>Custom Spinner</div>");
      expect(html).not.toContain(defaultSpinnerSvg);
    });

    it("returns empty string when spinner is disabled", () => {
      mockGetOptions.mockReturnValue({
        html: { spinner: { disabled: true } },
      });
      const html = getSpinnerHtml();
      expect(html).toBe("");
    });

    it("returns empty string when spinner disabled even with override", () => {
      mockGetOptions.mockReturnValue({
        html: { spinner: { disabled: true } },
      });
      const html = getSpinnerHtml("#000");
      expect(html).toBe("");
    });
  });

  describe("showSpinner", () => {
    it("appends spinner overlay to document.body", () => {
      showSpinner();
      const overlay = document.getElementById(SPINNER_ID);
      expect(overlay).not.toBeNull();
      expect(overlay?.parentElement).toBe(document.body);
    });

    it("sets body overflow to hidden", () => {
      showSpinner();
      expect(document.body.style.overflow).toBe("hidden");
    });

    it("returns a cleanup function", () => {
      const cleanup = showSpinner();
      expect(typeof cleanup).toBe("function");
    });

    it("cleanup function removes the spinner", () => {
      const cleanup = showSpinner();
      expect(document.getElementById(SPINNER_ID)).not.toBeNull();
      cleanup();
      expect(document.getElementById(SPINNER_ID)).toBeNull();
    });

    it("cleanup function restores body overflow", () => {
      const cleanup = showSpinner();
      expect(document.body.style.overflow).toBe("hidden");
      cleanup();
      expect(document.body.style.overflow).toBe("");
    });

    it("restores previous overflow value instead of clearing to empty", () => {
      document.body.style.overflow = "scroll";
      const cleanup = showSpinner();
      expect(document.body.style.overflow).toBe("hidden");
      cleanup();
      expect(document.body.style.overflow).toBe("scroll");
    });

    it("removes existing spinner before adding new one", () => {
      showSpinner();
      showSpinner();
      const spinners = document.querySelectorAll(`#${SPINNER_ID}`);
      expect(spinners.length).toBe(1);
    });

    it("preserves original overflow when called twice", () => {
      document.body.style.overflow = "auto";
      showSpinner();
      showSpinner();
      dismissSpinner();
      expect(document.body.style.overflow).toBe("auto");
    });

    it("uses custom background from options parameter", () => {
      showSpinner({ background: "#333" });
      const overlay = document.getElementById(SPINNER_ID);
      expect(overlay?.style.background).toContain("#333");
    });

    it("returns no-op function when spinner is disabled", () => {
      mockGetOptions.mockReturnValue({
        html: { spinner: { disabled: true } },
      });
      const cleanup = showSpinner();
      expect(document.getElementById(SPINNER_ID)).toBeNull();
      expect(document.body.style.overflow).toBe("");
      cleanup(); // Should not throw
    });

    it("returns no-op function when getSpinnerHtml returns empty", () => {
      mockGetOptions.mockReturnValue({
        html: { spinner: { disabled: true } },
      });
      const cleanup = showSpinner();
      expect(typeof cleanup).toBe("function");
      cleanup();
    });
  });

  describe("dismissSpinner", () => {
    it("removes spinner element from DOM", () => {
      showSpinner();
      expect(document.getElementById(SPINNER_ID)).not.toBeNull();
      dismissSpinner();
      expect(document.getElementById(SPINNER_ID)).toBeNull();
    });

    it("restores body overflow", () => {
      showSpinner();
      expect(document.body.style.overflow).toBe("hidden");
      dismissSpinner();
      expect(document.body.style.overflow).toBe("");
    });

    it("does not throw when no spinner exists", () => {
      expect(() => dismissSpinner()).not.toThrow();
    });

    it("does not touch body overflow when no spinner element exists", () => {
      document.body.style.overflow = "hidden";
      dismissSpinner();
      expect(document.body.style.overflow).toBe("hidden");
    });

    it("restores overflow for vite-injected spinner (element exists, no savedOverflow)", () => {
      // Simulate vite-injected spinner: element in DOM but showSpinner() was never called
      const el = document.createElement("div");
      el.id = SPINNER_ID;
      document.body.append(el);
      document.body.style.overflow = "hidden";
      dismissSpinner();
      expect(document.getElementById(SPINNER_ID)).toBeNull();
      expect(document.body.style.overflow).toBe("");
    });
  });
});
