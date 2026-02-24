import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@ovineko/spa-guard/_internal", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getOptions: vi.fn().mockReturnValue({}),
  };
});

import type { SpaGuardState } from "@ovineko/spa-guard/runtime";

import {
  defaultErrorFallbackHtml,
  defaultLoadingFallbackHtml,
  getOptions,
} from "@ovineko/spa-guard/_internal";

import { DefaultErrorFallback } from "./DefaultErrorFallback";

const defaultState: SpaGuardState = {
  currentAttempt: 0,
  isFallbackShown: false,
  isWaiting: false,
};

const retryingStateAttempt1: SpaGuardState = {
  currentAttempt: 1,
  isFallbackShown: false,
  isWaiting: true,
};

const retryingStateAttempt2: SpaGuardState = {
  currentAttempt: 2,
  isFallbackShown: false,
  isWaiting: true,
};

const retryingStateAttempt5: SpaGuardState = {
  currentAttempt: 5,
  isFallbackShown: false,
  isWaiting: true,
};

describe("DefaultErrorFallback", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("uses separate error and loading templates", () => {
    it("renders error template data attributes when not retrying", () => {
      const { container } = render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={false}
          spaGuardState={defaultState}
        />,
      );

      expect(container.querySelector('[data-spa-guard-content="heading"]')).toBeInTheDocument();
      expect(container.querySelector('[data-spa-guard-content="message"]')).toBeInTheDocument();
      expect(container.querySelector('[data-spa-guard-action="reload"]')).toBeInTheDocument();
    });

    it("renders loading template data attributes when retrying", () => {
      const { container } = render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={true}
          spaGuardState={retryingStateAttempt1}
        />,
      );

      expect(container.querySelector('[data-spa-guard-section="retrying"]')).toBeInTheDocument();
      expect(container.querySelector('[data-spa-guard-content="loading"]')).toBeInTheDocument();
      expect(container.querySelector("data-spa-guard-spinner")).not.toBeInTheDocument();
    });

    it("error template has SVG icon", () => {
      expect(defaultErrorFallbackHtml).toContain("<svg");
    });

    it("loading template has empty spinner container (injected from options)", () => {
      expect(defaultLoadingFallbackHtml).not.toContain("@keyframes spa-guard-spin");
      expect(defaultLoadingFallbackHtml).not.toContain("<svg");
      expect(defaultLoadingFallbackHtml).toContain("data-spa-guard-spinner");
    });
  });

  describe("error state (not retrying)", () => {
    it("shows error heading for non-chunk errors", () => {
      render(
        <DefaultErrorFallback
          error={new Error("test error")}
          isChunkError={false}
          isRetrying={false}
          spaGuardState={defaultState}
        />,
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("shows chunk error heading when isChunkError is true", () => {
      render(
        <DefaultErrorFallback
          error={new Error("chunk error")}
          isChunkError={true}
          isRetrying={false}
          spaGuardState={defaultState}
        />,
      );

      expect(screen.getByText("Failed to load module")).toBeInTheDocument();
    });

    it("shows the error message", () => {
      render(
        <DefaultErrorFallback
          error={new Error("Specific error detail")}
          isChunkError={false}
          isRetrying={false}
          spaGuardState={defaultState}
        />,
      );

      expect(screen.getByText("Specific error detail")).toBeInTheDocument();
    });

    it("shows string error when error is not an Error instance", () => {
      render(
        <DefaultErrorFallback
          error="plain string error"
          isChunkError={false}
          isRetrying={false}
          spaGuardState={defaultState}
        />,
      );

      expect(screen.getByText("plain string error")).toBeInTheDocument();
    });

    it("escapes HTML in error messages", () => {
      const { container } = render(
        <DefaultErrorFallback
          error={new Error('<script>alert("xss")</script>')}
          isChunkError={false}
          isRetrying={false}
          spaGuardState={defaultState}
        />,
      );

      // Should show escaped text, not execute script
      const messageEl = container.querySelector('[data-spa-guard-content="message"]');
      expect(messageEl?.textContent).toBe('<script>alert("xss")</script>');
      expect(container.querySelector("script")).toBeNull();
    });

    it("shows Reload page button", () => {
      render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={false}
          spaGuardState={defaultState}
        />,
      );

      expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument();
    });

    it("hides Try again button when onReset is not provided", () => {
      render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={false}
          spaGuardState={defaultState}
        />,
      );

      expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    });

    it("shows Try again button when onReset is provided", () => {
      render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={false}
          onReset={() => {}}
          spaGuardState={defaultState}
        />,
      );

      expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    });

    it("calls onReset when Try again button is clicked", () => {
      const onReset = vi.fn();

      render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={false}
          onReset={onReset}
          spaGuardState={defaultState}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });

  describe("retrying state", () => {
    it("shows Loading... heading when retrying", () => {
      render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={true}
          spaGuardState={retryingStateAttempt1}
        />,
      );

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("shows retry attempt number", () => {
      const { container } = render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={true}
          spaGuardState={retryingStateAttempt2}
        />,
      );

      const attemptEl = container.querySelector('[data-spa-guard-content="attempt"]');
      expect(attemptEl?.textContent).toBe("2");
    });

    it("shows retrying section when retrying", () => {
      const { container } = render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={true}
          spaGuardState={retryingStateAttempt1}
        />,
      );

      const retryingSection = container.querySelector(
        '[data-spa-guard-section="retrying"]',
      ) as HTMLElement;
      expect(retryingSection.style.display).toBe("block");
    });

    it("contains retrying label text", () => {
      const { container } = render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={true}
          spaGuardState={retryingStateAttempt1}
        />,
      );

      const retryingLabel = container.querySelector('[data-spa-guard-content="retrying"]');
      expect(retryingLabel?.textContent).toBe("Retry attempt");
    });
  });

  describe("HTML structure consistency", () => {
    it("error template renders action buttons and Error ID span", () => {
      const { container } = render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={false}
          spaGuardState={defaultState}
        />,
      );

      const markers = [
        '[data-spa-guard-content="heading"]',
        '[data-spa-guard-action="reload"]',
        ".spa-guard-retry-id",
      ];

      for (const marker of markers) {
        expect(container.querySelector(marker)).toBeInTheDocument();
      }
    });

    it("renders the reload button without inline onclick (CSP-safe)", () => {
      const { container } = render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={false}
          spaGuardState={defaultState}
        />,
      );

      const reloadBtn = container.querySelector('[data-spa-guard-action="reload"]');
      expect(reloadBtn).toBeInTheDocument();
      expect(reloadBtn).not.toHaveAttribute("onclick");
    });

    it("includes Error ID span with spa-guard-retry-id class", () => {
      const { container } = render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={false}
          spaGuardState={defaultState}
        />,
      );

      expect(container.querySelector(".spa-guard-retry-id")).toBeInTheDocument();
    });
  });

  describe("virtual container data attribute approach", () => {
    it("patches heading via data-spa-guard-content attribute", () => {
      const { container } = render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={true}
          isRetrying={false}
          spaGuardState={defaultState}
        />,
      );

      const heading = container.querySelector('[data-spa-guard-content="heading"]');
      expect(heading?.textContent).toBe("Failed to load module");
    });

    it("patches message via data-spa-guard-content attribute", () => {
      const { container } = render(
        <DefaultErrorFallback
          error={new Error("Custom message")}
          isChunkError={false}
          isRetrying={false}
          spaGuardState={defaultState}
        />,
      );

      const message = container.querySelector('[data-spa-guard-content="message"]');
      expect(message?.textContent).toBe("Custom message");
    });

    it("toggles try-again button visibility via data-spa-guard-action attribute", () => {
      const { container: withReset } = render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={false}
          onReset={() => {}}
          spaGuardState={defaultState}
        />,
      );

      const tryAgainBtn = withReset.querySelector(
        '[data-spa-guard-action="try-again"]',
      ) as HTMLElement;
      expect(tryAgainBtn.style.display).toBe("inline-block");
    });

    it("toggles retrying section visibility via data-spa-guard-section attribute", () => {
      const { container: notRetrying } = render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={false}
          spaGuardState={defaultState}
        />,
      );

      // Error template doesn't have the retrying section
      expect(
        notRetrying.querySelector('[data-spa-guard-section="retrying"]'),
      ).not.toBeInTheDocument();

      const { container: retrying } = render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={true}
          spaGuardState={retryingStateAttempt1}
        />,
      );

      const section = retrying.querySelector('[data-spa-guard-section="retrying"]') as HTMLElement;
      expect(section.style.display).toBe("block");
    });

    it("patches attempt number via data-spa-guard-content attribute", () => {
      const { container } = render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={true}
          spaGuardState={retryingStateAttempt5}
        />,
      );

      const attemptEl = container.querySelector('[data-spa-guard-content="attempt"]');
      expect(attemptEl?.textContent).toBe("5");
    });
  });

  describe("custom HTML from options", () => {
    it("uses custom error fallback HTML from options when configured", () => {
      const customErrorHtml =
        '<div><h1 data-spa-guard-content="heading">Placeholder</h1><p data-spa-guard-content="message">Placeholder</p><button data-spa-guard-action="reload" type="button">Custom Reload</button></div>';
      vi.mocked(getOptions).mockReturnValue({
        html: {
          fallback: { content: customErrorHtml },
        },
      });

      const { container } = render(
        <DefaultErrorFallback
          error={new Error("custom test error")}
          isChunkError={false}
          isRetrying={false}
          spaGuardState={defaultState}
        />,
      );

      const heading = container.querySelector('[data-spa-guard-content="heading"]');
      expect(heading?.textContent).toBe("Something went wrong");
      const message = container.querySelector('[data-spa-guard-content="message"]');
      expect(message?.textContent).toBe("custom test error");
      expect(container.querySelector("button")?.textContent).toBe("Custom Reload");
    });

    it("uses custom loading HTML from options when configured", () => {
      const customLoadingHtml =
        '<div><div data-spa-guard-spinner></div><h2 data-spa-guard-content="loading">Custom Loading</h2><p data-spa-guard-section="retrying" style="display:none"><span data-spa-guard-content="retrying">Custom Retry</span> <span data-spa-guard-content="attempt"></span></p></div>';
      vi.mocked(getOptions).mockReturnValue({
        html: {
          loading: { content: customLoadingHtml },
        },
      });

      const { container } = render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={true}
          spaGuardState={retryingStateAttempt2}
        />,
      );

      const loadingHeading = container.querySelector('[data-spa-guard-content="loading"]');
      expect(loadingHeading?.textContent).toBe("Custom Loading");
      const retryLabel = container.querySelector('[data-spa-guard-content="retrying"]');
      expect(retryLabel?.textContent).toBe("Custom Retry");
      const attemptEl = container.querySelector('[data-spa-guard-content="attempt"]');
      expect(attemptEl?.textContent).toBe("2");
    });

    it("falls back to default templates when options do not provide HTML", () => {
      vi.mocked(getOptions).mockReturnValue({});

      const { container: errorContainer } = render(
        <DefaultErrorFallback
          error={new Error("fallback test")}
          isChunkError={false}
          isRetrying={false}
          spaGuardState={defaultState}
        />,
      );

      expect(
        errorContainer.querySelector('[data-spa-guard-content="heading"]'),
      ).toBeInTheDocument();
      expect(errorContainer.querySelector('[data-spa-guard-content="message"]')?.textContent).toBe(
        "fallback test",
      );

      const { container: loadingContainer } = render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={true}
          spaGuardState={retryingStateAttempt1}
        />,
      );

      expect(
        loadingContainer.querySelector('[data-spa-guard-content="loading"]'),
      ).toBeInTheDocument();
    });
  });

  describe("spinner injection in loading template", () => {
    it("injects custom spinner content into data-spa-guard-spinner element", () => {
      vi.mocked(getOptions).mockReturnValue({
        spinner: { content: "<div>Custom Spinner</div>", disabled: false },
      });

      const { container } = render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={true}
          spaGuardState={retryingStateAttempt1}
        />,
      );

      const spinnerEl = container.querySelector("[data-spa-guard-spinner]");
      expect(spinnerEl).toBeInTheDocument();
      expect(spinnerEl?.innerHTML).toContain("Custom Spinner");
    });

    it("keeps default spinner when no custom content in options", () => {
      vi.mocked(getOptions).mockReturnValue({});

      const { container } = render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={true}
          spaGuardState={retryingStateAttempt1}
        />,
      );

      const spinnerEl = container.querySelector("[data-spa-guard-spinner]");
      expect(spinnerEl).toBeInTheDocument();
      // Spinner container is empty in template (SVG injected from options)
      expect(spinnerEl?.querySelector("svg")).not.toBeInTheDocument();
    });

    it("does not inject spinner when spinner is disabled", () => {
      vi.mocked(getOptions).mockReturnValue({
        spinner: { disabled: true },
      });

      const { container } = render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={true}
          spaGuardState={retryingStateAttempt1}
        />,
      );

      // Default template spinner should remain (disabled only affects content injection)
      const spinnerEl = container.querySelector("[data-spa-guard-spinner]");
      expect(spinnerEl).toBeInTheDocument();
    });
  });
});
