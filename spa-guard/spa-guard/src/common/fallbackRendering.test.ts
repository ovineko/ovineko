import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./events/internal", () => ({
  emitEvent: vi.fn(),
  getLogger: vi.fn(),
}));

vi.mock("./i18n", () => ({
  applyI18n: vi.fn(),
  getI18n: vi.fn().mockReturnValue(null),
}));

vi.mock("./options", () => ({
  getOptions: vi.fn(),
}));

vi.mock("./retryState", () => ({
  getRetryStateFromUrl: vi.fn().mockReturnValue(null),
}));

// Intentionally NOT mocking fallbackState - showFallbackUI must never call setFallbackMode
import { emitEvent, getLogger } from "./events/internal";
import { showFallbackUI } from "./fallbackRendering";
import { getOptions } from "./options";
import { getRetryStateFromUrl } from "./retryState";

const mockEmitEvent = vi.mocked(emitEvent);
const mockGetLogger = vi.mocked(getLogger);
const mockGetOptions = vi.mocked(getOptions);
const mockGetRetryStateFromUrl = vi.mocked(getRetryStateFromUrl);

const createMockLogger = () => ({
  beaconSendFailed: vi.fn(),
  capturedError: vi.fn(),
  error: vi.fn(),
  fallbackAlreadyShown: vi.fn(),
  fallbackInjectFailed: vi.fn(),
  fallbackTargetNotFound: vi.fn(),
  log: vi.fn(),
  logEvent: vi.fn(),
  noBeaconEndpoint: vi.fn(),
  noFallbackConfigured: vi.fn(),
  reloadAlreadyScheduled: vi.fn(),
  retryCycleStarting: vi.fn(),
  retrySchedulingReload: vi.fn(),
  versionChangeDetected: vi.fn(),
  versionCheckAlreadyRunning: vi.fn(),
  versionCheckDisabled: vi.fn(),
  versionCheckFailed: vi.fn(),
  versionCheckHttpError: vi.fn(),
  versionCheckParseError: vi.fn(),
  versionCheckPaused: vi.fn(),
  versionCheckRequiresEndpoint: vi.fn(),
  versionCheckResumed: vi.fn(),
  versionCheckResumedImmediate: vi.fn(),
  versionCheckStarted: vi.fn(),
  versionCheckStopped: vi.fn(),
  warn: vi.fn(),
});

const defaultOptions = {
  html: {
    fallback: {
      content: "<div>Fallback UI</div>",
      selector: "body",
    },
  },
};

describe("showFallbackUI", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockGetLogger.mockReturnValue(mockLogger);
    mockGetOptions.mockReturnValue(defaultOptions);
    mockGetRetryStateFromUrl.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("successful rendering", () => {
    it("injects fallback HTML into the target element", () => {
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue(
        [] as unknown as HTMLCollectionOf<Element>,
      );

      showFallbackUI();

      expect(mockEl.innerHTML).toBe("<div>Fallback UI</div>");
    });

    it("queries the target element using the configured selector", () => {
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue(
        [] as unknown as HTMLCollectionOf<Element>,
      );

      showFallbackUI();

      expect(document.querySelector).toHaveBeenCalledWith("body");
    });

    it("uses custom selector from fallback options", () => {
      mockGetOptions.mockReturnValue({
        html: { fallback: { content: "<div>Custom</div>", selector: "#app" } },
      });
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue(
        [] as unknown as HTMLCollectionOf<Element>,
      );

      showFallbackUI();

      expect(document.querySelector).toHaveBeenCalledWith("#app");
      expect(mockEl.innerHTML).toBe("<div>Custom</div>");
    });

    it("defaults to body selector when none is configured", () => {
      mockGetOptions.mockReturnValue({
        html: { fallback: { content: "<div>Content</div>" } },
      });
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue(
        [] as unknown as HTMLCollectionOf<Element>,
      );

      showFallbackUI();

      expect(document.querySelector).toHaveBeenCalledWith("body");
    });

    it("emits fallback-ui-shown event after successful injection", () => {
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue(
        [] as unknown as HTMLCollectionOf<Element>,
      );

      showFallbackUI();

      expect(mockEmitEvent).toHaveBeenCalledWith({ name: "fallback-ui-shown" });
    });

    it("populates spa-guard-retry-id elements when retryState is available", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "test-retry-id" });
      const retryIdEl = { textContent: "" };
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue([
        retryIdEl,
      ] as unknown as HTMLCollectionOf<Element>);

      showFallbackUI();

      expect(retryIdEl.textContent).toBe("test-retry-id");
    });

    it("does not throw when getElementsByClassName returns empty collection", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue(
        [] as unknown as HTMLCollectionOf<Element>,
      );

      expect(() => showFallbackUI()).not.toThrow();
    });

    it("attaches reload button click handler", () => {
      const reloadBtn = { addEventListener: vi.fn() };
      const mockEl = {
        innerHTML: "",
        querySelector: vi.fn().mockReturnValue(reloadBtn),
      };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue(
        [] as unknown as HTMLCollectionOf<Element>,
      );

      showFallbackUI();

      expect(mockEl.querySelector).toHaveBeenCalledWith('[data-spa-guard-action="reload"]');
      expect(reloadBtn.addEventListener).toHaveBeenCalledWith("click", expect.any(Function));
    });
  });

  describe("lifecycle isolation - no side effects on state", () => {
    it("does not import or call setFallbackMode (pure renderer with no lifecycle mutations)", async () => {
      // Verify that fallbackState is not in the import chain of fallbackRendering
      // by checking the module does not call window fallback mode key
      const fallbackModeKey = Symbol.for("@ovineko/spa-guard:fallback-mode");
      const initialValue = (globalThis.window as any)[fallbackModeKey];

      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue(
        [] as unknown as HTMLCollectionOf<Element>,
      );

      showFallbackUI();

      // The fallback mode window property should be unchanged
      expect((globalThis.window as any)[fallbackModeKey]).toBe(initialValue);
    });

    it("renders even when called multiple times (no internal guard)", () => {
      const mockEl = { innerHTML: "" as string, querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue(
        [] as unknown as HTMLCollectionOf<Element>,
      );

      showFallbackUI();
      showFallbackUI();

      // Called twice - the renderer has no internal state guard
      expect(mockEmitEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe("fail safely - no HTML configured", () => {
    it("does not throw when fallback HTML is not configured", () => {
      mockGetOptions.mockReturnValue({
        html: { fallback: { selector: "body" } },
      });

      expect(() => showFallbackUI()).not.toThrow();
    });

    it("does not query the DOM when fallback HTML is not configured", () => {
      mockGetOptions.mockReturnValue({
        html: { fallback: { selector: "body" } },
      });
      vi.spyOn(document, "querySelector");

      showFallbackUI();

      expect(document.querySelector).not.toHaveBeenCalled();
    });

    it("does not emit fallback-ui-shown when fallback HTML is not configured", () => {
      mockGetOptions.mockReturnValue({
        html: { fallback: { selector: "body" } },
      });

      showFallbackUI();

      expect(mockEmitEvent).not.toHaveBeenCalledWith({ name: "fallback-ui-shown" });
    });

    it("calls noFallbackConfigured logger when HTML is missing", () => {
      mockGetOptions.mockReturnValue({
        html: { fallback: { selector: "body" } },
      });

      showFallbackUI();

      expect(mockLogger.noFallbackConfigured).toHaveBeenCalledTimes(1);
    });

    it("emits fallback-ui-not-rendered with reason no-html-configured when HTML is missing", () => {
      mockGetOptions.mockReturnValue({
        html: { fallback: { selector: "body" } },
      });

      showFallbackUI();

      expect(mockEmitEvent).toHaveBeenCalledWith({
        name: "fallback-ui-not-rendered",
        reason: "no-html-configured",
      });
    });

    it("does not emit fallback-ui-shown when HTML is missing", () => {
      mockGetOptions.mockReturnValue({
        html: { fallback: { selector: "body" } },
      });

      showFallbackUI();

      expect(mockEmitEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ name: "fallback-ui-shown" }),
      );
    });
  });

  describe("fail safely - target element not found", () => {
    it("does not throw when target element is not found", () => {
      vi.spyOn(document, "querySelector").mockReturnValue(null);

      expect(() => showFallbackUI()).not.toThrow();
    });

    it("does not emit fallback-ui-shown when target element is not found", () => {
      vi.spyOn(document, "querySelector").mockReturnValue(null);

      showFallbackUI();

      expect(mockEmitEvent).not.toHaveBeenCalledWith({ name: "fallback-ui-shown" });
    });

    it("calls fallbackTargetNotFound logger when element is not found", () => {
      vi.spyOn(document, "querySelector").mockReturnValue(null);

      showFallbackUI();

      expect(mockLogger.fallbackTargetNotFound).toHaveBeenCalledWith("body");
    });

    it("calls fallbackTargetNotFound with custom selector when element is not found", () => {
      mockGetOptions.mockReturnValue({
        html: { fallback: { content: "<div>Fallback</div>", selector: "#app" } },
      });
      vi.spyOn(document, "querySelector").mockReturnValue(null);

      showFallbackUI();

      expect(mockLogger.fallbackTargetNotFound).toHaveBeenCalledWith("#app");
    });

    it("emits fallback-ui-not-rendered with reason target-not-found when element is missing", () => {
      vi.spyOn(document, "querySelector").mockReturnValue(null);

      showFallbackUI();

      expect(mockEmitEvent).toHaveBeenCalledWith({
        name: "fallback-ui-not-rendered",
        reason: "target-not-found",
        selector: "body",
      });
    });

    it("emits fallback-ui-not-rendered with the configured selector when element is missing", () => {
      mockGetOptions.mockReturnValue({
        html: { fallback: { content: "<div>Fallback</div>", selector: "#app" } },
      });
      vi.spyOn(document, "querySelector").mockReturnValue(null);

      showFallbackUI();

      expect(mockEmitEvent).toHaveBeenCalledWith({
        name: "fallback-ui-not-rendered",
        reason: "target-not-found",
        selector: "#app",
      });
    });
  });

  describe("fail safely - rendering throws", () => {
    it("does not throw when querySelector throws", () => {
      vi.spyOn(document, "querySelector").mockImplementation(() => {
        throw new Error("querySelector failed");
      });

      expect(() => showFallbackUI()).not.toThrow();
    });

    it("calls fallbackInjectFailed logger when rendering throws", () => {
      const querySelectorError = new Error("querySelector failed");
      vi.spyOn(document, "querySelector").mockImplementation(() => {
        throw querySelectorError;
      });

      showFallbackUI();

      expect(mockLogger.fallbackInjectFailed).toHaveBeenCalledWith(querySelectorError);
    });

    it("does not emit fallback-ui-shown when rendering throws", () => {
      vi.spyOn(document, "querySelector").mockImplementation(() => {
        throw new Error("querySelector failed");
      });

      showFallbackUI();

      expect(mockEmitEvent).not.toHaveBeenCalledWith({ name: "fallback-ui-shown" });
    });
  });

  describe("logger edge cases", () => {
    it("does not throw when no logger is set", () => {
      mockGetLogger.mockReturnValue(undefined as any);
      mockGetOptions.mockReturnValue({
        html: { fallback: { selector: "body" } },
      });

      expect(() => showFallbackUI()).not.toThrow();
    });

    it("does not throw when no logger and rendering fails", () => {
      mockGetLogger.mockReturnValue(undefined as any);
      vi.spyOn(document, "querySelector").mockReturnValue(null);

      expect(() => showFallbackUI()).not.toThrow();
    });
  });
});
