import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SpaGuardState } from "../runtime";

import { DefaultErrorFallback } from "./DefaultErrorFallback";
import { defaultErrorFallbackHtml, defaultLoadingFallbackHtml } from "./fallbackHtml.generated";

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
      expect(container.querySelector('[data-spa-guard-content="attempt"]')).not.toBeInTheDocument();
    });

    it("error template has no spinner or animation keyframes", () => {
      expect(defaultErrorFallbackHtml).not.toContain("@keyframes");
      expect(defaultErrorFallbackHtml).not.toContain("animation");
    });

    it("loading template has no spinner or animation keyframes", () => {
      expect(defaultLoadingFallbackHtml).not.toContain("@keyframes");
      expect(defaultLoadingFallbackHtml).not.toContain("animation");
    });

    it("error template has no custom font-family", () => {
      expect(defaultErrorFallbackHtml).not.toContain("font-family");
    });

    it("loading template has no custom font-family", () => {
      expect(defaultLoadingFallbackHtml).not.toContain("font-family");
    });

    it("error template has no custom colors on heading", () => {
      expect(defaultErrorFallbackHtml).not.toContain("color:#e74c3c");
      expect(defaultErrorFallbackHtml).not.toContain("color: #e74c3c");
    });

    it("error template buttons have no background-color or border-radius styling", () => {
      expect(defaultErrorFallbackHtml).not.toContain("background-color");
      expect(defaultErrorFallbackHtml).not.toContain("border-radius");
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

    it("renders the reload button with onclick attribute", () => {
      const { container } = render(
        <DefaultErrorFallback
          error={new Error("test")}
          isChunkError={false}
          isRetrying={false}
          spaGuardState={defaultState}
        />,
      );

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
