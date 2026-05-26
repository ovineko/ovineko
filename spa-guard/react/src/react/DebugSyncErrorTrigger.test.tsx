import { Component, type PropsWithChildren } from "react";

import { debugSyncErrorEventType, dispatchSyncRuntimeError } from "@ovineko/spa-guard/_internal";
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DebugSyncErrorTrigger } from "./DebugSyncErrorTrigger";

interface ErrorBoundaryState {
  error: Error | null;
  hasError: boolean;
}

class ErrorBoundary extends Component<
  PropsWithChildren<{ onError?: (error: Error) => void }>,
  ErrorBoundaryState
> {
  constructor(props: PropsWithChildren<{ onError?: (error: Error) => void }>) {
    super(props);
    this.state = { error: null, hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error, hasError: true };
  }

  componentDidCatch(error: Error): void {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return <div data-testid="error">{this.state.error?.message}</div>;
    }
    return this.props.children;
  }
}

describe("DebugSyncErrorTrigger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders nothing when no error has been dispatched", () => {
    const { container } = render(
      <ErrorBoundary>
        <DebugSyncErrorTrigger />
        <div data-testid="app">App Content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByTestId("app")).toBeInTheDocument();
    expect(screen.queryByTestId("error")).not.toBeInTheDocument();
    // DebugSyncErrorTrigger returns null, so it adds no DOM nodes
    expect(container.querySelector("[data-testid='app']")).toBeInTheDocument();
  });

  it("throws the error during render when a sync error event is dispatched", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <DebugSyncErrorTrigger />
        <div data-testid="app">App Content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByTestId("app")).toBeInTheDocument();

    act(() => {
      dispatchSyncRuntimeError();
    });

    expect(screen.getByTestId("error")).toBeInTheDocument();
    expect(screen.getByTestId("error").textContent).toBe(
      "Simulated sync runtime error from spa-guard debug panel",
    );
    expect(screen.queryByTestId("app")).not.toBeInTheDocument();

    consoleError.mockRestore();
  });

  it("ErrorBoundary catches the thrown error via componentDidCatch", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <DebugSyncErrorTrigger />
      </ErrorBoundary>,
    );

    act(() => {
      dispatchSyncRuntimeError();
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Simulated sync runtime error from spa-guard debug panel",
      }),
    );

    consoleError.mockRestore();
  });

  it("responds to a raw CustomEvent with an arbitrary error", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const customError = new Error("custom test error");

    render(
      <ErrorBoundary>
        <DebugSyncErrorTrigger />
      </ErrorBoundary>,
    );

    act(() => {
      globalThis.dispatchEvent(
        new CustomEvent(debugSyncErrorEventType, { detail: { error: customError } }),
      );
    });

    expect(screen.getByTestId("error")).toBeInTheDocument();
    expect(screen.getByTestId("error").textContent).toBe("custom test error");

    consoleError.mockRestore();
  });

  it("removes the event listener on unmount", () => {
    const removeSpy = vi.spyOn(globalThis, "removeEventListener");

    const { unmount } = render(
      <ErrorBoundary>
        <DebugSyncErrorTrigger />
      </ErrorBoundary>,
    );

    unmount();

    expect(removeSpy).toHaveBeenCalledWith(debugSyncErrorEventType, expect.any(Function));
  });

  it("does not throw after unmount when event is dispatched", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const { unmount } = render(
      <ErrorBoundary>
        <DebugSyncErrorTrigger />
        <div data-testid="app">App Content</div>
      </ErrorBoundary>,
    );

    unmount();

    // Should not throw or cause issues after unmount
    expect(() => {
      dispatchSyncRuntimeError();
    }).not.toThrow();

    consoleError.mockRestore();
  });
});
