import { type FC } from "react";

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-router", () => ({
  useRouteError: vi.fn(),
}));

vi.mock("../react", () => ({
  useSpaGuardState: vi.fn(),
}));

vi.mock("../common/handleErrorWithSpaGuard", () => ({
  handleErrorWithSpaGuard: vi.fn(),
}));

vi.mock("../common/isChunkError", () => ({
  isChunkError: vi.fn(),
}));

import { useRouteError } from "react-router";

import type { SpaGuardState } from "../runtime";

import { ErrorBoundaryReactRouter, type RouterFallbackProps } from ".";
import { handleErrorWithSpaGuard } from "../common/handleErrorWithSpaGuard";
import { isChunkError } from "../common/isChunkError";
import { useSpaGuardState } from "../react";

const mockUseRouteError = vi.mocked(useRouteError);
const mockUseSpaGuardState = vi.mocked(useSpaGuardState);
const mockHandleErrorWithSpaGuard = vi.mocked(handleErrorWithSpaGuard);
const mockIsChunkError = vi.mocked(isChunkError);

const defaultSpaGuardState: SpaGuardState = {
  currentAttempt: 0,
  isFallbackShown: false,
  isWaiting: false,
};

const testError = new Error("Route error");

// Module-level components to satisfy consistent-function-scoping rule
const CustomFallbackComponent: FC<RouterFallbackProps> = ({ error }) => (
  <div>Custom fallback: {error instanceof Error ? error.message : String(error)}</div>
);

const CapturingFallback: FC<RouterFallbackProps> & { captured: RouterFallbackProps[] } =
  Object.assign(
    (props: RouterFallbackProps) => {
      CapturingFallback.captured.push(props);
      return <div>captured fallback</div>;
    },
    { captured: [] as RouterFallbackProps[] },
  );

describe("ErrorBoundaryReactRouter", () => {
  beforeEach(() => {
    mockUseRouteError.mockReturnValue(testError);
    mockUseSpaGuardState.mockReturnValue({ ...defaultSpaGuardState });
    mockHandleErrorWithSpaGuard.mockReset();
    mockIsChunkError.mockReturnValue(false);
    CapturingFallback.captured = [];
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("useRouteError integration", () => {
    it("renders default fallback when useRouteError returns an Error", () => {
      render(<ErrorBoundaryReactRouter />);

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("calls handleErrorWithSpaGuard on mount with the route error", () => {
      render(<ErrorBoundaryReactRouter />);

      expect(mockHandleErrorWithSpaGuard).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({ eventName: "react-router-error" }),
      );
    });

    it("passes eventName react-router-error to handleErrorWithSpaGuard", () => {
      render(<ErrorBoundaryReactRouter />);

      expect(mockHandleErrorWithSpaGuard).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ eventName: "react-router-error" }),
      );
    });

    it("calls handleErrorWithSpaGuard exactly once on mount", () => {
      render(<ErrorBoundaryReactRouter />);

      expect(mockHandleErrorWithSpaGuard).toHaveBeenCalledTimes(1);
    });

    it("displays the error message from useRouteError in default fallback", () => {
      mockUseRouteError.mockReturnValue(new Error("Specific route error message"));

      render(<ErrorBoundaryReactRouter />);

      expect(screen.getByText("Specific route error message")).toBeInTheDocument();
    });
  });

  describe("chunk error detection in route errors", () => {
    it("passes isChunkError=true to fallback when route error is a chunk error", () => {
      mockIsChunkError.mockReturnValue(true);

      render(
        <ErrorBoundaryReactRouter
          fallback={(props) => {
            CapturingFallback.captured.push(props);
            return <div>fallback</div>;
          }}
        />,
      );

      const lastProps = CapturingFallback.captured.at(-1)!;
      expect(lastProps.isChunkError).toBe(true);
    });

    it("passes isChunkError=false to fallback when route error is not a chunk error", () => {
      mockIsChunkError.mockReturnValue(false);

      render(
        <ErrorBoundaryReactRouter
          fallback={(props) => {
            CapturingFallback.captured.push(props);
            return <div>fallback</div>;
          }}
        />,
      );

      const lastProps = CapturingFallback.captured.at(-1)!;
      expect(lastProps.isChunkError).toBe(false);
    });

    it("calls isChunkError with the route error", () => {
      render(<ErrorBoundaryReactRouter />);

      expect(mockIsChunkError).toHaveBeenCalledWith(testError);
    });

    it("renders chunk error heading in default fallback when isChunkError=true", () => {
      mockIsChunkError.mockReturnValue(true);

      render(<ErrorBoundaryReactRouter />);

      expect(screen.getByText("Failed to load module")).toBeInTheDocument();
    });
  });

  describe("auto-retry on route chunk errors", () => {
    it("passes autoRetryChunkErrors=true by default to handleErrorWithSpaGuard", () => {
      render(<ErrorBoundaryReactRouter />);

      expect(mockHandleErrorWithSpaGuard).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ autoRetryChunkErrors: true }),
      );
    });

    it("passes autoRetryChunkErrors=false when disabled", () => {
      render(<ErrorBoundaryReactRouter autoRetryChunkErrors={false} />);

      expect(mockHandleErrorWithSpaGuard).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ autoRetryChunkErrors: false }),
      );
    });

    it("passes autoRetryChunkErrors=true when explicitly enabled", () => {
      render(<ErrorBoundaryReactRouter autoRetryChunkErrors={true} />);

      expect(mockHandleErrorWithSpaGuard).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ autoRetryChunkErrors: true }),
      );
    });
  });

  describe("custom fallback with route error context", () => {
    it("renders custom Fallback component when fallback prop is provided", () => {
      mockUseRouteError.mockReturnValue(new Error("Custom fallback test"));

      render(<ErrorBoundaryReactRouter fallback={CustomFallbackComponent} />);

      expect(screen.getByText("Custom fallback: Custom fallback test")).toBeInTheDocument();
    });

    it("does not render default fallback when custom fallback is provided", () => {
      render(<ErrorBoundaryReactRouter fallback={CustomFallbackComponent} />);

      expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    });

    it("passes all RouterFallbackProps to custom fallback", () => {
      const spaGuardState: SpaGuardState = {
        currentAttempt: 1,
        isFallbackShown: false,
        isWaiting: true,
      };
      mockUseSpaGuardState.mockReturnValue(spaGuardState);
      mockIsChunkError.mockReturnValue(true);

      render(
        <ErrorBoundaryReactRouter
          fallback={(props) => {
            CapturingFallback.captured.push(props);
            return <div>fallback</div>;
          }}
        />,
      );

      const lastProps = CapturingFallback.captured.at(-1)!;
      expect(lastProps.error).toBe(testError);
      expect(lastProps.isChunkError).toBe(true);
      expect(typeof lastProps.isRetrying).toBe("boolean");
      expect(lastProps.spaGuardState).toEqual(spaGuardState);
    });

    it("accepts fallback as a render function", () => {
      render(
        <ErrorBoundaryReactRouter
          fallback={({ error }) => <div>Render fn: {String(error)}</div>}
        />,
      );

      expect(screen.getByText(`Render fn: ${String(testError)}`)).toBeInTheDocument();
    });
  });

  describe("resetError navigation behavior", () => {
    it("renders Reload page button in default fallback", () => {
      render(<ErrorBoundaryReactRouter />);

      expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument();
    });

    it("does not render Try again button in default fallback (no resetError in RouterFallbackProps)", () => {
      render(<ErrorBoundaryReactRouter />);

      expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("renders with undefined route error (useRouteError returns undefined)", () => {
      mockUseRouteError.mockReturnValue(null);
      mockIsChunkError.mockReturnValue(false);

      expect(() => render(<ErrorBoundaryReactRouter />)).not.toThrow();
    });

    it("renders with non-Error object route error (string)", () => {
      mockUseRouteError.mockReturnValue("string route error");
      mockIsChunkError.mockReturnValue(false);

      render(<ErrorBoundaryReactRouter />);

      expect(screen.getByText("string route error")).toBeInTheDocument();
    });

    it("renders with non-Error object route error (plain object)", () => {
      const routeError = { message: "plain object error", status: 404 };
      mockUseRouteError.mockReturnValue(routeError);
      mockIsChunkError.mockReturnValue(false);

      expect(() => render(<ErrorBoundaryReactRouter />)).not.toThrow();
    });

    it("passes sendBeaconOnError=true by default to handleErrorWithSpaGuard", () => {
      render(<ErrorBoundaryReactRouter />);

      expect(mockHandleErrorWithSpaGuard).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ sendBeaconOnError: true }),
      );
    });

    it("passes sendBeaconOnError=false when disabled", () => {
      render(<ErrorBoundaryReactRouter sendBeacon={false} />);

      expect(mockHandleErrorWithSpaGuard).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ sendBeaconOnError: false }),
      );
    });

    it("passes onError to handleErrorWithSpaGuard", () => {
      const onError = vi.fn();

      render(<ErrorBoundaryReactRouter onError={onError} />);

      expect(mockHandleErrorWithSpaGuard).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ onError }),
      );
    });

    it("computes isRetrying=true when isWaiting=true and currentAttempt>0", () => {
      mockUseSpaGuardState.mockReturnValue({
        currentAttempt: 2,
        isFallbackShown: false,
        isWaiting: true,
      });

      render(
        <ErrorBoundaryReactRouter
          fallback={(props) => {
            CapturingFallback.captured.push(props);
            return <div>fallback</div>;
          }}
        />,
      );

      const lastProps = CapturingFallback.captured.at(-1)!;
      expect(lastProps.isRetrying).toBe(true);
    });

    it("computes isRetrying=false when isWaiting=false even with currentAttempt>0", () => {
      mockUseSpaGuardState.mockReturnValue({
        currentAttempt: 3,
        isFallbackShown: false,
        isWaiting: false,
      });

      render(
        <ErrorBoundaryReactRouter
          fallback={(props) => {
            CapturingFallback.captured.push(props);
            return <div>fallback</div>;
          }}
        />,
      );

      const lastProps = CapturingFallback.captured.at(-1)!;
      expect(lastProps.isRetrying).toBe(false);
    });

    it("computes isRetrying=false when currentAttempt=0 even if isWaiting=true", () => {
      mockUseSpaGuardState.mockReturnValue({
        currentAttempt: 0,
        isFallbackShown: false,
        isWaiting: true,
      });

      render(
        <ErrorBoundaryReactRouter
          fallback={(props) => {
            CapturingFallback.captured.push(props);
            return <div>fallback</div>;
          }}
        />,
      );

      const lastProps = CapturingFallback.captured.at(-1)!;
      expect(lastProps.isRetrying).toBe(false);
    });

    it("shows retry state in default fallback when isRetrying=true", () => {
      mockUseSpaGuardState.mockReturnValue({
        currentAttempt: 1,
        isFallbackShown: false,
        isWaiting: true,
      });

      render(<ErrorBoundaryReactRouter />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
      expect(screen.getByText("Retry attempt")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });
});
