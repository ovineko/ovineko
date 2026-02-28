import { type FC } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../react", () => ({
  useSpaGuardState: vi.fn(),
}));

vi.mock("@ovineko/spa-guard/_internal", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    handleErrorWithSpaGuard: vi.fn(),
    isChunkError: vi.fn(),
  };
});

import type { SpaGuardState } from "@ovineko/spa-guard/runtime";

import { handleErrorWithSpaGuard, isChunkError } from "@ovineko/spa-guard/_internal";

import { ErrorBoundary, type FallbackProps } from ".";
import { useSpaGuardState } from "../react";

const mockUseSpaGuardState = vi.mocked(useSpaGuardState);
const mockHandleErrorWithSpaGuard = vi.mocked(handleErrorWithSpaGuard);
const mockIsChunkError = vi.mocked(isChunkError);

const defaultSpaGuardState: SpaGuardState = {
  currentAttempt: 0,
  isFallbackShown: false,
  isWaiting: false,
};

const ThrowingComponent: FC<{ error?: Error; shouldThrow?: boolean }> = ({
  error = new Error("Test error"),
  shouldThrow = true,
}) => {
  if (shouldThrow) {
    throw error;
  }
  return <div>Children rendered</div>;
};

const SimpleFallback: FC<FallbackProps> = ({ error, resetError }) => (
  <div>
    <div>Error: {error.message}</div>
    <button onClick={resetError} type="button">
      Reset
    </button>
  </div>
);

// Module-level components to satisfy consistent-function-scoping rule
const MessageFallbackComponent: FC<FallbackProps> = ({ error }) => (
  <div>Fallback Component: {error.message}</div>
);
const StaticFallbackComponent: FC<FallbackProps> = () => <div>Fallback Component</div>;
const staticFallbackRender = (_props: FallbackProps) => <div>Fallback Render</div>;

// Module-level arrays to satisfy react-perf/jsx-no-new-array-as-prop rule
const resetKeysKey1 = ["key1"];
const resetKeysKey2 = ["key2"];
const resetKeysKeyAKeyB = ["keyA", "keyB"];
const resetKeysKeyCKeyB = ["keyC", "keyB"];
const resetKeysStable = [1, "a"];

describe("ErrorBoundary", () => {
  beforeEach(() => {
    mockUseSpaGuardState.mockReturnValue({ ...defaultSpaGuardState });
    mockHandleErrorWithSpaGuard.mockReset();
    mockIsChunkError.mockReturnValue(false);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("basic error catching", () => {
    it("renders children when no error occurs", () => {
      render(
        <ErrorBoundary fallback={SimpleFallback}>
          <div>Normal content</div>
        </ErrorBoundary>,
      );

      expect(screen.getByText("Normal content")).toBeInTheDocument();
    });

    it("renders fallback when child throws", () => {
      render(
        <ErrorBoundary fallback={SimpleFallback}>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Error: Test error")).toBeInTheDocument();
    });

    it("does not render children when error is caught", () => {
      render(
        <ErrorBoundary fallback={SimpleFallback}>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      expect(screen.queryByText("Children rendered")).not.toBeInTheDocument();
    });

    it("calls handleErrorWithSpaGuard when child throws", () => {
      const error = new Error("Test error");

      render(
        <ErrorBoundary fallback={SimpleFallback}>
          <ThrowingComponent error={error} />
        </ErrorBoundary>,
      );

      expect(mockHandleErrorWithSpaGuard).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ eventName: "react-error-boundary" }),
      );
    });

    it("renders default fallback when no fallback prop provided", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent error={new Error("Something broke")} />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("does not call handleErrorWithSpaGuard when no error occurs", () => {
      render(
        <ErrorBoundary fallback={SimpleFallback}>
          <div>No error here</div>
        </ErrorBoundary>,
      );

      expect(mockHandleErrorWithSpaGuard).not.toHaveBeenCalled();
    });
  });

  describe("chunk error detection", () => {
    it("passes isChunkError=true to fallback when error is a chunk error", () => {
      mockIsChunkError.mockReturnValue(true);
      const capturedProps: FallbackProps[] = [];

      render(
        <ErrorBoundary
          fallbackRender={(props) => {
            capturedProps.push(props);
            return <div>chunk fallback</div>;
          }}
        >
          <ThrowingComponent error={new Error("Failed to fetch dynamically imported module")} />
        </ErrorBoundary>,
      );

      const lastProps = capturedProps.at(-1)!;
      expect(lastProps.isChunkError).toBe(true);
    });

    it("passes isChunkError=false to fallback when error is not a chunk error", () => {
      mockIsChunkError.mockReturnValue(false);
      const capturedProps: FallbackProps[] = [];

      render(
        <ErrorBoundary
          fallbackRender={(props) => {
            capturedProps.push(props);
            return <div>non-chunk fallback</div>;
          }}
        >
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      const lastProps = capturedProps.at(-1)!;
      expect(lastProps.isChunkError).toBe(false);
    });

    it("calls isChunkError with the caught error", () => {
      const error = new Error("some error");

      render(
        <ErrorBoundary fallback={SimpleFallback}>
          <ThrowingComponent error={error} />
        </ErrorBoundary>,
      );

      expect(mockIsChunkError).toHaveBeenCalledWith(error);
    });

    it("renders DefaultFallback with chunk error heading when isChunkError=true", () => {
      mockIsChunkError.mockReturnValue(true);

      render(
        <ErrorBoundary>
          <ThrowingComponent error={new Error("Failed to fetch dynamically imported module")} />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Failed to load module")).toBeInTheDocument();
    });
  });

  describe("autoRetryChunkErrors option", () => {
    it("passes autoRetryChunkErrors=undefined by default", () => {
      render(
        <ErrorBoundary fallback={SimpleFallback}>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      expect(mockHandleErrorWithSpaGuard).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ autoRetryChunkErrors: undefined }),
      );
    });

    it("passes autoRetryChunkErrors=false to handleErrorWithSpaGuard when disabled", () => {
      render(
        <ErrorBoundary autoRetryChunkErrors={false} fallback={SimpleFallback}>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      expect(mockHandleErrorWithSpaGuard).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ autoRetryChunkErrors: false }),
      );
    });

    it("passes autoRetryChunkErrors=true to handleErrorWithSpaGuard when enabled", () => {
      render(
        <ErrorBoundary autoRetryChunkErrors fallback={SimpleFallback}>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      expect(mockHandleErrorWithSpaGuard).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ autoRetryChunkErrors: true }),
      );
    });
  });

  describe("resetError functionality", () => {
    it("resets error state and re-renders children when resetError is called", () => {
      let shouldThrow = true;
      const ControllableComponent = () => {
        if (shouldThrow) {
          throw new Error("Recoverable error");
        }
        return <div>Recovered</div>;
      };

      render(
        <ErrorBoundary
          fallbackRender={({ resetError }) => (
            <button onClick={resetError} type="button">
              Reset
            </button>
          )}
        >
          <ControllableComponent />
        </ErrorBoundary>,
      );

      expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();

      shouldThrow = false;
      fireEvent.click(screen.getByRole("button", { name: "Reset" }));

      expect(screen.getByText("Recovered")).toBeInTheDocument();
    });

    it("re-catches error if child still throws after resetError is called", () => {
      render(
        <ErrorBoundary
          fallbackRender={({ resetError }) => (
            <button onClick={resetError} type="button">
              Reset
            </button>
          )}
        >
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      fireEvent.click(screen.getByRole("button", { name: "Reset" }));

      // Should still show fallback (re-caught after reset)
      expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
      // handleErrorWithSpaGuard should be called twice: initial error + re-catch after reset
      expect(mockHandleErrorWithSpaGuard).toHaveBeenCalledTimes(2);
    });

    it("shows children again after resetError if children no longer throw", () => {
      let shouldThrow = true;
      const ControllableComponent = () => {
        if (shouldThrow) {
          throw new Error("test");
        }
        return <div>Back to normal</div>;
      };

      render(
        <ErrorBoundary
          fallback={({ resetError }) => (
            <button onClick={resetError} type="button">
              Try again
            </button>
          )}
        >
          <ControllableComponent />
        </ErrorBoundary>,
      );

      shouldThrow = false;
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));

      expect(screen.getByText("Back to normal")).toBeInTheDocument();
    });
  });

  describe("resetKeys triggering reset", () => {
    it("resets error when resetKeys values change", () => {
      let shouldThrow = true;
      const ControllableComponent = () => {
        if (shouldThrow) {
          throw new Error("test");
        }
        return <div>Recovered via resetKey</div>;
      };

      const { rerender } = render(
        <ErrorBoundary fallback={SimpleFallback} resetKeys={resetKeysKey1}>
          <ControllableComponent />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Error: test")).toBeInTheDocument();

      shouldThrow = false;
      rerender(
        <ErrorBoundary fallback={SimpleFallback} resetKeys={resetKeysKey2}>
          <ControllableComponent />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Recovered via resetKey")).toBeInTheDocument();
    });

    it("does not reset when resetKeys remain the same", () => {
      const { rerender } = render(
        <ErrorBoundary fallback={SimpleFallback} resetKeys={resetKeysKey1}>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Error: Test error")).toBeInTheDocument();

      rerender(
        <ErrorBoundary fallback={SimpleFallback} resetKeys={resetKeysKey1}>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      // Fallback still shown, no reset occurred
      expect(screen.getByText("Error: Test error")).toBeInTheDocument();
      // handleErrorWithSpaGuard called only once (initial error)
      expect(mockHandleErrorWithSpaGuard).toHaveBeenCalledTimes(1);
    });

    it("resets when first element of resetKeys changes", () => {
      let shouldThrow = true;
      const ControllableComponent = () => {
        if (shouldThrow) {
          throw new Error("test");
        }
        return <div>Key 0 changed</div>;
      };

      const { rerender } = render(
        <ErrorBoundary fallback={SimpleFallback} resetKeys={resetKeysKeyAKeyB}>
          <ControllableComponent />
        </ErrorBoundary>,
      );

      shouldThrow = false;
      rerender(
        <ErrorBoundary fallback={SimpleFallback} resetKeys={resetKeysKeyCKeyB}>
          <ControllableComponent />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Key 0 changed")).toBeInTheDocument();
    });

    it("does not reset when resetKeys values are identical on re-render", () => {
      const { rerender } = render(
        <ErrorBoundary fallback={SimpleFallback} resetKeys={resetKeysStable}>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      rerender(
        <ErrorBoundary fallback={SimpleFallback} resetKeys={resetKeysStable}>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      // Called only once (initial error, no re-catch from reset)
      expect(mockHandleErrorWithSpaGuard).toHaveBeenCalledTimes(1);
    });
  });

  describe("custom fallback components", () => {
    it("renders fallbackRender function result with error message", () => {
      render(
        <ErrorBoundary fallbackRender={({ error }) => <div>Custom render: {error.message}</div>}>
          <ThrowingComponent error={new Error("custom fallback test")} />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Custom render: custom fallback test")).toBeInTheDocument();
    });

    it("renders fallback component with error message", () => {
      render(
        <ErrorBoundary fallback={MessageFallbackComponent}>
          <ThrowingComponent error={new Error("component fallback test")} />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Fallback Component: component fallback test")).toBeInTheDocument();
    });

    it("prefers fallbackRender over fallback when both are provided", () => {
      render(
        <ErrorBoundary fallback={StaticFallbackComponent} fallbackRender={staticFallbackRender}>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Fallback Render")).toBeInTheDocument();
      expect(screen.queryByText("Fallback Component")).not.toBeInTheDocument();
    });

    it("renders DefaultFallback showing retry state when isRetrying=true", () => {
      mockUseSpaGuardState.mockReturnValue({
        currentAttempt: 1,
        isFallbackShown: false,
        isWaiting: true,
      });

      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Loading...")).toBeInTheDocument();
      expect(screen.getByText("Retry attempt")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("renders DefaultFallback with error message when not retrying", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent error={new Error("Something went wrong detail")} />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText("Something went wrong detail")).toBeInTheDocument();
    });
  });

  describe("onError callback invocation", () => {
    it("passes onError wrapper function to handleErrorWithSpaGuard", () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary fallback={SimpleFallback} onError={onError}>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      expect(mockHandleErrorWithSpaGuard).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ onError: expect.any(Function) }),
      );
    });

    it("invokes onError callback with the error and errorInfo when the wrapper is called", () => {
      const onError = vi.fn();
      const error = new Error("callback test error");

      // Simulate handleErrorWithSpaGuard calling its onError option
      mockHandleErrorWithSpaGuard.mockImplementation((_err, opts) => {
        opts.onError?.(_err);
      });

      render(
        <ErrorBoundary fallback={SimpleFallback} onError={onError}>
          <ThrowingComponent error={error} />
        </ErrorBoundary>,
      );

      expect(onError).toHaveBeenCalledWith(error, expect.any(Object));
    });

    it("does not throw when onError prop is not provided", () => {
      expect(() => {
        render(
          <ErrorBoundary fallback={SimpleFallback}>
            <ThrowingComponent />
          </ErrorBoundary>,
        );
      }).not.toThrow();
    });
  });

  describe("sendBeaconOnError integration", () => {
    it("passes sendBeaconOnError=true to handleErrorWithSpaGuard when enabled", () => {
      render(
        <ErrorBoundary fallback={SimpleFallback} sendBeaconOnError>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      expect(mockHandleErrorWithSpaGuard).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ sendBeaconOnError: true }),
      );
    });

    it("passes sendBeaconOnError=false to handleErrorWithSpaGuard when disabled", () => {
      render(
        <ErrorBoundary fallback={SimpleFallback} sendBeaconOnError={false}>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      expect(mockHandleErrorWithSpaGuard).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ sendBeaconOnError: false }),
      );
    });

    it("passes sendBeaconOnError=undefined when not specified", () => {
      render(
        <ErrorBoundary fallback={SimpleFallback}>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      expect(mockHandleErrorWithSpaGuard).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ sendBeaconOnError: undefined }),
      );
    });
  });

  describe("FallbackProps passed to fallbackRender", () => {
    it("provides all required FallbackProps fields", () => {
      const capturedProps: FallbackProps[] = [];
      const error = new Error("prop test error");

      render(
        <ErrorBoundary
          fallbackRender={(props) => {
            capturedProps.push(props);
            return <div>fallback</div>;
          }}
        >
          <ThrowingComponent error={error} />
        </ErrorBoundary>,
      );

      expect(capturedProps.length).toBeGreaterThan(0);
      const lastProps = capturedProps.at(-1)!;
      expect(lastProps.error).toBe(error);
      expect(typeof lastProps.isChunkError).toBe("boolean");
      expect(typeof lastProps.isRetrying).toBe("boolean");
      expect(typeof lastProps.resetError).toBe("function");
      expect(lastProps.spaGuardState).toBeDefined();
    });

    it("provides correct spaGuardState in FallbackProps", () => {
      const spaGuardState: SpaGuardState = {
        currentAttempt: 2,
        isFallbackShown: false,
        isWaiting: true,
      };
      mockUseSpaGuardState.mockReturnValue(spaGuardState);
      const capturedProps: FallbackProps[] = [];

      render(
        <ErrorBoundary
          fallbackRender={(props) => {
            capturedProps.push(props);
            return <div>fallback</div>;
          }}
        >
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      const lastProps = capturedProps.at(-1)!;
      expect(lastProps.spaGuardState).toEqual(spaGuardState);
    });

    it("computes isRetrying=true when isWaiting=true and currentAttempt>0", () => {
      mockUseSpaGuardState.mockReturnValue({
        currentAttempt: 1,
        isFallbackShown: false,
        isWaiting: true,
      });
      const capturedProps: FallbackProps[] = [];

      render(
        <ErrorBoundary
          fallbackRender={(props) => {
            capturedProps.push(props);
            return <div>retrying</div>;
          }}
        >
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      const lastProps = capturedProps.at(-1)!;
      expect(lastProps.isRetrying).toBe(true);
    });

    it("computes isRetrying=false when isWaiting=false even with currentAttempt>0", () => {
      mockUseSpaGuardState.mockReturnValue({
        currentAttempt: 2,
        isFallbackShown: false,
        isWaiting: false,
      });
      const capturedProps: FallbackProps[] = [];

      render(
        <ErrorBoundary
          fallbackRender={(props) => {
            capturedProps.push(props);
            return <div>not retrying</div>;
          }}
        >
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      const lastProps = capturedProps.at(-1)!;
      expect(lastProps.isRetrying).toBe(false);
    });

    it("computes isRetrying=false when currentAttempt=0 even if isWaiting=true", () => {
      mockUseSpaGuardState.mockReturnValue({
        currentAttempt: 0,
        isFallbackShown: false,
        isWaiting: true,
      });
      const capturedProps: FallbackProps[] = [];

      render(
        <ErrorBoundary
          fallbackRender={(props) => {
            capturedProps.push(props);
            return <div>not retrying</div>;
          }}
        >
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      const lastProps = capturedProps.at(-1)!;
      expect(lastProps.isRetrying).toBe(false);
    });

    it("provides errorInfo with componentStack after componentDidCatch", () => {
      const capturedProps: FallbackProps[] = [];

      render(
        <ErrorBoundary
          fallbackRender={(props) => {
            capturedProps.push(props);
            return <div>fallback</div>;
          }}
        >
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      // After componentDidCatch runs, errorInfo should be set with componentStack
      const propsWithErrorInfo = capturedProps.filter((p) => p.errorInfo !== null);
      expect(propsWithErrorInfo.length).toBeGreaterThan(0);
      expect(propsWithErrorInfo[0]?.errorInfo).toHaveProperty("componentStack");
    });
  });

  describe("edge cases", () => {
    it("passes eventName 'react-error-boundary' to handleErrorWithSpaGuard", () => {
      render(
        <ErrorBoundary fallback={SimpleFallback}>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      expect(mockHandleErrorWithSpaGuard).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ eventName: "react-error-boundary" }),
      );
    });

    it("passes errorInfo to handleErrorWithSpaGuard", () => {
      render(
        <ErrorBoundary fallback={SimpleFallback}>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      expect(mockHandleErrorWithSpaGuard).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ errorInfo: expect.any(Object) }),
      );
    });

    it("renders without crashing when children is a text node", () => {
      expect(() => {
        render(<ErrorBoundary fallback={SimpleFallback}>Just text</ErrorBoundary>);
      }).not.toThrow();

      expect(screen.getByText("Just text")).toBeInTheDocument();
    });

    it("handles error caught regardless of message content", () => {
      const emptyMessageError = new Error("x");
      emptyMessageError.message = "";

      render(
        <ErrorBoundary fallback={SimpleFallback}>
          <ThrowingComponent error={emptyMessageError} />
        </ErrorBoundary>,
      );

      expect(mockHandleErrorWithSpaGuard).toHaveBeenCalledWith(
        emptyMessageError,
        expect.any(Object),
      );
    });

    it("renders multiple children when no error occurs", () => {
      render(
        <ErrorBoundary fallback={SimpleFallback}>
          <div>Child 1</div>
          <div>Child 2</div>
        </ErrorBoundary>,
      );

      expect(screen.getByText("Child 1")).toBeInTheDocument();
      expect(screen.getByText("Child 2")).toBeInTheDocument();
    });

    it("uses updated spaGuardState from hook in render", () => {
      mockUseSpaGuardState.mockReturnValue({
        currentAttempt: 3,
        isFallbackShown: true,
        isWaiting: false,
      });
      const capturedProps: FallbackProps[] = [];

      render(
        <ErrorBoundary
          fallbackRender={(props) => {
            capturedProps.push(props);
            return <div>fallback</div>;
          }}
        >
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      const lastProps = capturedProps.at(-1)!;
      expect(lastProps.spaGuardState.currentAttempt).toBe(3);
      expect(lastProps.spaGuardState.isFallbackShown).toBe(true);
    });

    it("calls handleErrorWithSpaGuard once per caught error", () => {
      render(
        <ErrorBoundary fallback={SimpleFallback}>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      expect(mockHandleErrorWithSpaGuard).toHaveBeenCalledTimes(1);
    });
  });
});
