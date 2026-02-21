import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SpaGuardState } from "../runtime";

import { DefaultErrorFallback } from "./DefaultErrorFallback";
import { defaultFallbackHtml } from "./fallbackHtml.generated";

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

describe("DefaultErrorFallback", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("uses shared fallbackHtml template", () => {
    it("renders the defaultFallbackHtml template via dangerouslySetInnerHTML", () => {
      const { container } = render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={false}
          spaGuardState={defaultState}
        />,
      );

      // The template's data attributes should be present in the rendered DOM
      expect(container.querySelector('[data-spa-guard-section="retrying"]')).toBeInTheDocument();
      expect(container.querySelector('[data-spa-guard-section="error"]')).toBeInTheDocument();
      expect(container.querySelector('[data-spa-guard-content="heading"]')).toBeInTheDocument();
      expect(container.querySelector('[data-spa-guard-content="message"]')).toBeInTheDocument();
      expect(container.querySelector('[data-spa-guard-action="reload"]')).toBeInTheDocument();
    });

    it("retrying section is hidden by default in the template", () => {
      // Verify the static template has retrying hidden
      expect(defaultFallbackHtml).toContain(
        'data-spa-guard-section="retrying" style="display:none;',
      );
    });

    it("template contains both retrying and error sections", () => {
      expect(defaultFallbackHtml).toContain('data-spa-guard-section="retrying"');
      expect(defaultFallbackHtml).toContain('data-spa-guard-section="error"');
    });

    it("template contains spinner animation keyframes", () => {
      expect(defaultFallbackHtml).toContain("@keyframes spa-guard-spin");
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

    it("hides retrying section when not retrying", () => {
      const { container } = render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={false}
          spaGuardState={defaultState}
        />,
      );

      const retryingSection = container.querySelector(
        '[data-spa-guard-section="retrying"]',
      ) as HTMLElement;
      expect(retryingSection.style.display).toBe("none");
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
      render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={true}
          spaGuardState={retryingStateAttempt2}
        />,
      );

      expect(screen.getByText("Retry attempt 2")).toBeInTheDocument();
    });

    it("hides error section when retrying", () => {
      const { container } = render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={true}
          spaGuardState={retryingStateAttempt1}
        />,
      );

      const errorSection = container.querySelector(
        '[data-spa-guard-section="error"]',
      ) as HTMLElement;
      expect(errorSection.style.display).toBe("none");
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
      expect(retryingSection.style.display).toBe("flex");
    });
  });

  describe("HTML structure consistency", () => {
    it("non-React fallback and React fallback share the same base template", () => {
      const { container } = render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={false}
          spaGuardState={defaultState}
        />,
      );

      // Both paths should use the same data attribute markers
      const markers = [
        '[data-spa-guard-section="retrying"]',
        '[data-spa-guard-section="error"]',
        '[data-spa-guard-content="heading"]',
        '[data-spa-guard-action="reload"]',
        ".spa-guard-retry-id",
      ];

      for (const marker of markers) {
        expect(container.querySelector(marker)).toBeInTheDocument();
      }
    });

    it("renders the same button structure as the non-React fallback template", () => {
      const { container } = render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={false}
          spaGuardState={defaultState}
        />,
      );

      // The reload button from the template should have the onclick attribute
      const reloadBtn = container.querySelector('[data-spa-guard-action="reload"]');
      expect(reloadBtn).toHaveAttribute("onclick", "location.reload()");
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
});
