import { Component, type PropsWithChildren, Suspense } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../common/reload", () => ({
  attemptReload: vi.fn(),
}));

vi.mock("../common/options", () => ({
  getOptions: vi.fn(),
}));

import type { SPAGuardEvent } from "../common/events/types";

import { lazyWithRetry } from ".";
import { subscribe } from "../common/events/internal";
import { getOptions } from "../common/options";
import { attemptReload } from "../common/reload";

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

/**
 * Helper to create a mock import function with a controllable sequence of results.
 * Each entry is either a value (resolves) or an Error (rejects).
 * Once exhausted, the last entry is repeated.
 */
const createMockImport = <T,>(sequence: Array<Error | T>): (() => Promise<T>) => {
  let callIndex = 0;
  return vi.fn().mockImplementation(() => {
    const item = sequence[callIndex] ?? sequence.at(-1);
    callIndex++;
    if (item instanceof Error) {
      return Promise.reject(item);
    }
    return Promise.resolve(item as T);
  });
};

const mockGetOptions = (lazyRetry?: { callReloadOnFailure?: boolean; retryDelays?: number[] }) => {
  vi.mocked(getOptions).mockReturnValue({
    lazyRetry: lazyRetry ?? { callReloadOnFailure: true, retryDelays: [1, 2] },
  });
};

const SuccessComponent = () => <div>Success</div>;
const ComponentA = () => <div>Component A</div>;
const ComponentB = () => <div>Component B</div>;
const ComponentAWithTwoRetries = () => <div>Component A</div>;
const LoadedComponent = () => <div>Loaded Component</div>;
const FinallyLoadedComponent = () => <div>Finally Loaded</div>;

describe("integration: lazyWithRetry → attemptReload → URL parameters", () => {
  beforeEach(() => {
    vi.mocked(attemptReload).mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls attemptReload after all lazy retries are exhausted for a chunk error", async () => {
    mockGetOptions({ callReloadOnFailure: true, retryDelays: [1, 2] });

    const chunkError = new Error("Failed to fetch dynamically imported module");
    const mockImportFn = createMockImport([chunkError]);

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const LazyComponent = lazyWithRetry(mockImportFn);

    render(
      <ErrorBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </Suspense>
      </ErrorBoundary>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("error")).toBeInTheDocument();
    });

    expect(attemptReload).toHaveBeenCalledTimes(1);
    expect(attemptReload).toHaveBeenCalledWith(chunkError);

    consoleError.mockRestore();
  });

  it("does not call attemptReload when callReloadOnFailure is false", async () => {
    mockGetOptions({ callReloadOnFailure: false, retryDelays: [1] });

    const chunkError = new Error("Failed to fetch dynamically imported module");
    const mockImportFn = createMockImport([chunkError]);

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const LazyComponent = lazyWithRetry(mockImportFn);

    render(
      <ErrorBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </Suspense>
      </ErrorBoundary>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("error")).toBeInTheDocument();
    });

    expect(attemptReload).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });
});

describe("integration: events emitted in correct order", () => {
  let unsubscribeEvents: (() => void) | undefined;

  beforeEach(() => {
    vi.mocked(attemptReload).mockClear();
  });

  afterEach(() => {
    unsubscribeEvents?.();
    unsubscribeEvents = undefined;
    vi.clearAllMocks();
  });

  it("emits lazy-retry-attempt then lazy-retry-exhausted when all retries fail", async () => {
    mockGetOptions({ callReloadOnFailure: true, retryDelays: [1, 2] });

    const chunkError = new Error("Failed to fetch dynamically imported module");
    const mockImportFn = createMockImport([chunkError]);

    const emittedEvents: SPAGuardEvent[] = [];
    unsubscribeEvents = subscribe((event) => emittedEvents.push(event));

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const LazyComponent = lazyWithRetry(mockImportFn);

    render(
      <ErrorBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </Suspense>
      </ErrorBoundary>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("error")).toBeInTheDocument();
    });

    const lazyEvents = emittedEvents.filter(
      (e) =>
        e.name === "lazy-retry-attempt" ||
        e.name === "lazy-retry-exhausted" ||
        e.name === "lazy-retry-success",
    );

    expect(lazyEvents[0]).toMatchObject({
      attempt: 1,
      delay: 1,
      name: "lazy-retry-attempt",
      totalAttempts: 3,
    });
    expect(lazyEvents[1]).toMatchObject({
      attempt: 2,
      delay: 2,
      name: "lazy-retry-attempt",
      totalAttempts: 3,
    });
    expect(lazyEvents[2]).toMatchObject({
      name: "lazy-retry-exhausted",
      totalAttempts: 3,
      willReload: true,
    });

    consoleError.mockRestore();
  });

  it("emits lazy-retry-attempt then lazy-retry-success when import eventually succeeds", async () => {
    mockGetOptions({ callReloadOnFailure: true, retryDelays: [1, 2] });

    const chunkError = new Error("Failed to fetch dynamically imported module");
    const mockImportFn = createMockImport([chunkError, { default: SuccessComponent }]);

    const emittedEvents: SPAGuardEvent[] = [];
    unsubscribeEvents = subscribe((event) => emittedEvents.push(event));

    const LazyComponent = lazyWithRetry(mockImportFn);

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent />
      </Suspense>,
    );

    await waitFor(() => {
      expect(screen.getByText("Success")).toBeInTheDocument();
    });

    const lazyEvents = emittedEvents.filter(
      (e) =>
        e.name === "lazy-retry-attempt" ||
        e.name === "lazy-retry-exhausted" ||
        e.name === "lazy-retry-success",
    );

    expect(lazyEvents[0]).toMatchObject({ attempt: 1, name: "lazy-retry-attempt" });
    expect(lazyEvents[1]).toMatchObject({ attemptNumber: 2, name: "lazy-retry-success" });
    expect(lazyEvents).toHaveLength(2);
  });
});

describe("integration: multiple parallel lazy imports with different retry delays", () => {
  beforeEach(() => {
    vi.mocked(attemptReload).mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("handles multiple concurrent lazy imports independently", async () => {
    mockGetOptions({ callReloadOnFailure: false, retryDelays: [1] });

    const chunkError = new Error("Failed to fetch dynamically imported module");

    const mockImportA = createMockImport([chunkError, { default: ComponentA }]);
    const mockImportB = createMockImport([chunkError, { default: ComponentB }]);

    const LazyA = lazyWithRetry(mockImportA, { retryDelays: [1] });
    const LazyB = lazyWithRetry(mockImportB, { retryDelays: [2] });

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyA />
        <LazyB />
      </Suspense>,
    );

    await waitFor(() => {
      expect(screen.getByText("Component A")).toBeInTheDocument();
      expect(screen.getByText("Component B")).toBeInTheDocument();
    });

    expect(mockImportA).toHaveBeenCalledTimes(2);
    expect(mockImportB).toHaveBeenCalledTimes(2);
  });

  it("each parallel import respects its own per-import retry delays", async () => {
    mockGetOptions({ callReloadOnFailure: false, retryDelays: [1000] });

    const chunkError = new Error("Failed to fetch dynamically imported module");

    // A fails twice then succeeds; B always fails
    const mockImportA = createMockImport([
      chunkError,
      chunkError,
      { default: ComponentAWithTwoRetries },
    ]);
    const mockImportB = createMockImport([chunkError]);

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    // A uses 2 retries (tiny delays), B uses 1 retry (tiny delay)
    const LazyA = lazyWithRetry(mockImportA, { retryDelays: [1, 2] });
    const LazyB = lazyWithRetry(mockImportB, { retryDelays: [1] });

    render(
      <>
        <Suspense fallback={<div>Loading A...</div>}>
          <LazyA />
        </Suspense>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading B...</div>}>
            <LazyB />
          </Suspense>
        </ErrorBoundary>
      </>,
    );

    await waitFor(() => {
      expect(screen.getAllByText("Component A")[0]).toBeInTheDocument();
      expect(screen.getByTestId("error")).toBeInTheDocument();
    });

    expect(mockImportA).toHaveBeenCalledTimes(3);
    expect(mockImportB).toHaveBeenCalledTimes(2);

    consoleError.mockRestore();
  });
});

describe("integration: edge cases - CSP violations and network transitions", () => {
  beforeEach(() => {
    vi.mocked(attemptReload).mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not trigger attemptReload for a CSP SecurityError (not a chunk error)", async () => {
    mockGetOptions({ callReloadOnFailure: true, retryDelays: [] });

    const cspError = new Error(
      "Refused to load the script because it violates the Content Security Policy",
    );
    cspError.name = "SecurityError";
    const mockImportFn = createMockImport([cspError]);

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const LazyComponent = lazyWithRetry(mockImportFn);

    render(
      <ErrorBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </Suspense>
      </ErrorBoundary>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("error")).toBeInTheDocument();
    });

    // CSP error is NOT a chunk error, so no reload should be triggered
    expect(attemptReload).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it("retries and recovers from a network error (offline → online transition)", async () => {
    mockGetOptions({ callReloadOnFailure: false, retryDelays: [1] });

    const networkError = new TypeError("Failed to fetch");
    const mockImportFn = createMockImport([networkError, { default: LoadedComponent }]);

    const LazyComponent = lazyWithRetry(mockImportFn);

    render(
      <Suspense fallback={<div data-testid="suspense-fallback">Loading...</div>}>
        <LazyComponent />
      </Suspense>,
    );

    await waitFor(() => {
      expect(screen.getByText("Loaded Component")).toBeInTheDocument();
    });

    expect(mockImportFn).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
  });
});

describe("integration: React Suspense fallback during retry", () => {
  beforeEach(() => {
    vi.mocked(attemptReload).mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows Suspense fallback while retrying and then displays the component", async () => {
    mockGetOptions({ callReloadOnFailure: false, retryDelays: [1] });

    const chunkError = new Error("Failed to fetch dynamically imported module");
    const mockImportFn = createMockImport([chunkError, { default: LoadedComponent }]);

    const LazyComponent = lazyWithRetry(mockImportFn);

    render(
      <Suspense fallback={<div data-testid="suspense-fallback">Loading...</div>}>
        <LazyComponent />
      </Suspense>,
    );

    expect(screen.getByTestId("suspense-fallback")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Loaded Component")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
  });

  it("keeps showing Suspense fallback during all retry attempts before success", async () => {
    mockGetOptions({ callReloadOnFailure: false, retryDelays: [1, 2] });

    const chunkError = new Error("Failed to fetch dynamically imported module");
    const mockImportFn = createMockImport([
      chunkError,
      chunkError,
      { default: FinallyLoadedComponent },
    ]);

    const LazyComponent = lazyWithRetry(mockImportFn);

    render(
      <Suspense fallback={<div data-testid="suspense-fallback">Loading...</div>}>
        <LazyComponent />
      </Suspense>,
    );

    expect(screen.getByTestId("suspense-fallback")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Finally Loaded")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
    expect(mockImportFn).toHaveBeenCalledTimes(3);
  });
});
