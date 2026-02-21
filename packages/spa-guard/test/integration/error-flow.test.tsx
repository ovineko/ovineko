/**
 * End-to-end integration tests for the SPA guard error flow.
 *
 * These tests exercise multiple real modules together, mocking only browser
 * APIs (window.location, navigator.sendBeacon) and the options module so tests
 * stay fast with tiny retry delays.
 */
import { Component, type FC, type ReactNode, Suspense } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Only mock options so every test can control delays without changing real logic.
vi.mock("../../src/common/options", () => ({
  getOptions: vi.fn(),
}));

import type { SPAGuardEvent } from "../../src/common/events/types";

import { subscribe } from "../../src/common/events/internal";
import { getOptions } from "../../src/common/options";
import { attemptReload, resetReloadScheduled } from "../../src/common/reload";
import { ErrorBoundary } from "../../src/react-error-boundary";
import { lazyWithRetry } from "../../src/react/lazyWithRetry";

// ---------- Window location mock ----------

let capturedHref = "http://localhost/";

const setupMockLocation = (url = "http://localhost/"): void => {
  capturedHref = url;
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: {
      get href() {
        return capturedHref;
      },
      set href(val: string) {
        capturedHref = val;
      },
      reload: vi.fn(),
      get search() {
        try {
          return new URL(capturedHref).search;
        } catch {
          return "";
        }
      },
    },
    writable: true,
  });
};

// ---------- Shared test options ----------

const makeOptions = (overrides: Record<string, unknown> = {}) => ({
  enableRetryReset: true,
  errors: { forceRetry: [], ignore: [] },
  fallback: {
    html: "<div id='spa-guard-fallback'>Fallback UI</div>",
    selector: "body",
  },
  lazyRetry: {
    callReloadOnFailure: true,
    retryDelays: [1, 2],
  },
  minTimeBetweenResets: 100,
  reloadDelays: [1, 2, 5],
  useRetryId: true,
  ...overrides,
});

// ---------- Component helpers ----------

const ThrowingChild: FC<{ error: Error }> = ({ error }) => {
  throw error;
};

const NoopFallback: FC<any> = ({ error }) => (
  <div data-testid="fallback-rendered">Error: {(error as Error).message}</div>
);

const IsRetryingFallback: FC<any> = ({ isRetrying }: { isRetrying: boolean }) => (
  <div data-testid="fallback-rendered">{isRetrying ? "Retrying..." : "Error occurred"}</div>
);

// ---------- Mock import factory ----------

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

// ---------- Simple test error boundary ----------

/**
 * Minimal error boundary used in lazy component tests where the real
 * `ErrorBoundary` is not needed.
 */
class SimpleErrorBoundary extends Component<
  { children: ReactNode; testId?: string },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; testId?: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return <div data-testid={this.props.testId ?? "simple-error-boundary"}>Error caught</div>;
    }
    return this.props.children;
  }
}

// ---------- Module-level lazy success components ----------

const LoadedComponent: FC = () => <div data-testid="success">Loaded!</div>;
const FinallyLoadedComponent: FC = () => <div data-testid="success">Finally!</div>;

// ---------- Delay helper ----------

const delay = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

// ---------- Common errors ----------

const chunkError = new Error("Failed to fetch dynamically imported module");
const nonChunkError = new Error("Something went wrong unexpectedly");

// ---------- Test setup ----------

let unsubscribeEvents: (() => void) | undefined;

beforeEach(() => {
  setupMockLocation();
  sessionStorage.clear();
  resetReloadScheduled();
  vi.mocked(getOptions).mockReturnValue(makeOptions());
});

afterEach(() => {
  unsubscribeEvents?.();
  unsubscribeEvents = undefined;
  resetReloadScheduled();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// =============================================================================
// 1. Chunk error in lazy component → retry → success
// =============================================================================

describe("chunk error in lazy component → retry → success", () => {
  it("renders the component after a single chunk error retry", async () => {
    vi.mocked(getOptions).mockReturnValue(
      makeOptions({ lazyRetry: { callReloadOnFailure: false, retryDelays: [1] } }),
    );

    const mockImport = createMockImport([chunkError, { default: LoadedComponent }]);
    const LazyComp = lazyWithRetry(mockImport);

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComp />
      </Suspense>,
    );

    await waitFor(() => expect(screen.getByTestId("success")).toBeInTheDocument());
    expect(mockImport).toHaveBeenCalledTimes(2);
  });

  it("emits lazy-retry-attempt then lazy-retry-success events in order", async () => {
    vi.mocked(getOptions).mockReturnValue(
      makeOptions({ lazyRetry: { callReloadOnFailure: false, retryDelays: [1] } }),
    );

    const mockImport = createMockImport([chunkError, { default: LoadedComponent }]);

    const emittedEvents: SPAGuardEvent[] = [];
    unsubscribeEvents = subscribe((event) => emittedEvents.push(event));

    const LazyComp = lazyWithRetry(mockImport);
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComp />
      </Suspense>,
    );

    await waitFor(() => expect(screen.getByTestId("success")).toBeInTheDocument());

    const lazyEvents = emittedEvents.filter(
      (e) =>
        e.name === "lazy-retry-attempt" ||
        e.name === "lazy-retry-success" ||
        e.name === "lazy-retry-exhausted",
    );
    expect(lazyEvents[0]).toMatchObject({ attempt: 1, name: "lazy-retry-attempt" });
    expect(lazyEvents[1]).toMatchObject({ attempt: 1, name: "lazy-retry-success" });
    expect(lazyEvents).toHaveLength(2);
  });

  it("succeeds after multiple retries when only the last attempt succeeds", async () => {
    vi.mocked(getOptions).mockReturnValue(
      makeOptions({ lazyRetry: { callReloadOnFailure: false, retryDelays: [1, 1] } }),
    );

    const mockImport = createMockImport([
      chunkError,
      chunkError,
      { default: FinallyLoadedComponent },
    ]);
    const LazyComp = lazyWithRetry(mockImport);

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComp />
      </Suspense>,
    );

    await waitFor(() => expect(screen.getByTestId("success")).toBeInTheDocument());
    expect(mockImport).toHaveBeenCalledTimes(3);
  });
});

// =============================================================================
// 2. Chunk error in lazy component → retry exhausted → reload
// =============================================================================

describe("chunk error in lazy component → retry exhausted → reload", () => {
  it("triggers window navigation when all lazy retries fail with callReloadOnFailure=true", async () => {
    vi.mocked(getOptions).mockReturnValue(
      makeOptions({
        enableRetryReset: false,
        lazyRetry: { callReloadOnFailure: true, retryDelays: [1] },
        reloadDelays: [1],
      }),
    );

    const mockImport = createMockImport([chunkError]);
    const LazyComp = lazyWithRetry(mockImport);

    render(
      <SimpleErrorBoundary testId="error-caught">
        <Suspense fallback={<div>Loading...</div>}>
          <LazyComp />
        </Suspense>
      </SimpleErrorBoundary>,
    );

    // After retries exhaust, attemptReload is called which sets href after delay
    await waitFor(
      () => {
        expect(capturedHref).toContain("spaGuardRetryAttempt=1");
      },
      { timeout: 5000 },
    );

    expect(capturedHref).toContain("spaGuardRetryId");
  });

  it("emits lazy-retry-exhausted event with willReload=true when retries fail", async () => {
    vi.mocked(getOptions).mockReturnValue(
      makeOptions({
        enableRetryReset: false,
        lazyRetry: { callReloadOnFailure: true, retryDelays: [1] },
        reloadDelays: [1],
      }),
    );

    const mockImport = createMockImport([chunkError]);
    const emittedEvents: SPAGuardEvent[] = [];
    unsubscribeEvents = subscribe((event) => emittedEvents.push(event));

    const LazyComp = lazyWithRetry(mockImport);

    render(
      <SimpleErrorBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <LazyComp />
        </Suspense>
      </SimpleErrorBoundary>,
    );

    await waitFor(() => {
      const exhausted = emittedEvents.find((e) => e.name === "lazy-retry-exhausted");
      expect(exhausted).toBeDefined();
    });

    const exhaustedEvent = emittedEvents.find((e) => e.name === "lazy-retry-exhausted");
    expect(exhaustedEvent).toMatchObject({
      name: "lazy-retry-exhausted",
      willReload: true,
    });
  });

  it("does NOT trigger reload when callReloadOnFailure=false", async () => {
    vi.mocked(getOptions).mockReturnValue(
      makeOptions({ lazyRetry: { callReloadOnFailure: false, retryDelays: [1] } }),
    );

    const mockImport = createMockImport([chunkError]);
    const LazyComp = lazyWithRetry(mockImport);

    render(
      <SimpleErrorBoundary testId="error">
        <Suspense fallback={<div>Loading...</div>}>
          <LazyComp />
        </Suspense>
      </SimpleErrorBoundary>,
    );

    await waitFor(() => expect(screen.getByTestId("error")).toBeInTheDocument());

    // Brief wait to confirm no navigation occurred
    await delay(30);
    expect(capturedHref).toBe("http://localhost/");
  });
});

// =============================================================================
// 3. Chunk error in ErrorBoundary → auto-retry
// =============================================================================

describe("chunk error in ErrorBoundary → auto-retry", () => {
  it("initiates page reload (retry-attempt event) when ErrorBoundary catches chunk error with autoRetryChunkErrors=true", async () => {
    vi.mocked(getOptions).mockReturnValue(
      makeOptions({ enableRetryReset: false, reloadDelays: [1] }),
    );

    const emittedEvents: SPAGuardEvent[] = [];
    unsubscribeEvents = subscribe((event) => emittedEvents.push(event));

    render(
      <ErrorBoundary autoRetryChunkErrors={true} fallback={NoopFallback} sendBeaconOnError={false}>
        <ThrowingChild error={chunkError} />
      </ErrorBoundary>,
    );

    // Wait for the retry-attempt event from attemptReload
    await waitFor(() => {
      const retryEvent = emittedEvents.find((e) => e.name === "retry-attempt");
      expect(retryEvent).toBeDefined();
    });

    const retryEvent = emittedEvents.find((e) => e.name === "retry-attempt");
    expect(retryEvent).toMatchObject({ attempt: 1, name: "retry-attempt" });
  });

  it("does NOT initiate reload when autoRetryChunkErrors=false", async () => {
    vi.mocked(getOptions).mockReturnValue(makeOptions());

    const emittedEvents: SPAGuardEvent[] = [];
    unsubscribeEvents = subscribe((event) => emittedEvents.push(event));

    render(
      <ErrorBoundary autoRetryChunkErrors={false} fallback={NoopFallback} sendBeaconOnError={false}>
        <ThrowingChild error={chunkError} />
      </ErrorBoundary>,
    );

    await waitFor(() => expect(screen.getByTestId("fallback-rendered")).toBeInTheDocument());

    // Brief pause to ensure no delayed events arrive
    await delay(30);

    const retryEvent = emittedEvents.find((e) => e.name === "retry-attempt");
    expect(retryEvent).toBeUndefined();
  });

  it("renders fallback with isRetrying=true after retry-attempt event fires", async () => {
    vi.mocked(getOptions).mockReturnValue(
      makeOptions({ enableRetryReset: false, reloadDelays: [1] }),
    );

    const emittedEvents: SPAGuardEvent[] = [];
    unsubscribeEvents = subscribe((event) => emittedEvents.push(event));

    render(
      <ErrorBoundary
        autoRetryChunkErrors={true}
        fallback={IsRetryingFallback}
        sendBeaconOnError={false}
      >
        <ThrowingChild error={chunkError} />
      </ErrorBoundary>,
    );

    // Wait for retry-attempt event which updates state → isRetrying=true
    await waitFor(() => {
      const retryEvent = emittedEvents.find((e) => e.name === "retry-attempt");
      expect(retryEvent).toBeDefined();
    });

    // The state update should re-render the fallback with isRetrying=true
    await waitFor(() => {
      expect(screen.getByTestId("fallback-rendered")).toHaveTextContent("Retrying...");
    });
  });
});

// =============================================================================
// 4. Non-chunk error → beacon sent
// =============================================================================

describe("non-chunk error → beacon sent", () => {
  it("calls navigator.sendBeacon with error info when a non-chunk error is caught", async () => {
    const mockSendBeacon = vi.spyOn(navigator, "sendBeacon").mockReturnValue(true);

    vi.mocked(getOptions).mockReturnValue(
      makeOptions({ reportBeacon: { endpoint: "http://test.example.com/beacon" } }),
    );

    render(
      <ErrorBoundary autoRetryChunkErrors={true} fallback={NoopFallback} sendBeaconOnError={true}>
        <ThrowingChild error={nonChunkError} />
      </ErrorBoundary>,
    );

    await waitFor(() => {
      expect(mockSendBeacon).toHaveBeenCalled();
    });

    const [calledUrl, calledBody] = mockSendBeacon.mock.calls[0]!;
    expect(calledUrl).toBe("http://test.example.com/beacon");

    const payload = JSON.parse(calledBody as string);
    expect(payload.errorMessage).toBe("Something went wrong unexpectedly");
    expect(payload.eventName).toBe("react-error-boundary");
  });

  it("does not trigger reload when a non-chunk error is caught", async () => {
    vi.spyOn(navigator, "sendBeacon").mockReturnValue(true);

    vi.mocked(getOptions).mockReturnValue(
      makeOptions({ reportBeacon: { endpoint: "http://test.example.com/beacon" } }),
    );

    const originalHref = capturedHref;

    render(
      <ErrorBoundary autoRetryChunkErrors={true} fallback={NoopFallback} sendBeaconOnError={true}>
        <ThrowingChild error={nonChunkError} />
      </ErrorBoundary>,
    );

    await waitFor(() => expect(screen.getByTestId("fallback-rendered")).toBeInTheDocument());

    // Brief wait to confirm no navigation occurred
    await delay(30);
    expect(capturedHref).toBe(originalHref);
  });

  it("uses fetch fallback when navigator.sendBeacon is not available", async () => {
    // Remove sendBeacon to simulate absence
    const originalSendBeacon = navigator.sendBeacon;
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: undefined,
    });

    const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());

    vi.mocked(getOptions).mockReturnValue(
      makeOptions({ reportBeacon: { endpoint: "http://test.example.com/beacon" } }),
    );

    render(
      <ErrorBoundary autoRetryChunkErrors={true} fallback={NoopFallback} sendBeaconOnError={true}>
        <ThrowingChild error={nonChunkError} />
      </ErrorBoundary>,
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Restore
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: originalSendBeacon,
    });
  });
});

// =============================================================================
// 5. Max retries → fallback UI shown
// =============================================================================

describe("max retries → fallback UI shown", () => {
  it("injects fallback HTML into the DOM when all reload attempts are exhausted", () => {
    // Simulate being on the 3rd attempt (reloadDelays has 3 entries → attempt 3 = exhausted)
    setupMockLocation(
      "http://localhost/?spaGuardRetryId=exhausted-retry-id&spaGuardRetryAttempt=3",
    );

    vi.mocked(getOptions).mockReturnValue(
      makeOptions({
        enableRetryReset: false,
        fallback: {
          html: "<div id='spa-guard-fallback'>Fallback UI</div>",
          selector: "body",
        },
        reloadDelays: [1000, 2000, 5000],
        useRetryId: true,
      }),
    );

    const error = new Error("ChunkLoadError: Loading chunk failed");

    attemptReload(error);

    expect(document.body.innerHTML).toContain("Fallback UI");
  });

  it("emits retry-exhausted then fallback-ui-shown events in sequence", () => {
    setupMockLocation(
      "http://localhost/?spaGuardRetryId=exhausted-retry-id&spaGuardRetryAttempt=3",
    );

    vi.mocked(getOptions).mockReturnValue(
      makeOptions({
        enableRetryReset: false,
        fallback: {
          html: "<div id='spa-guard-fallback'>Fallback UI</div>",
          selector: "body",
        },
        reloadDelays: [1000, 2000, 5000],
        useRetryId: true,
      }),
    );

    const emittedEvents: SPAGuardEvent[] = [];
    unsubscribeEvents = subscribe((event) => emittedEvents.push(event));

    const error = new Error("ChunkLoadError: Loading chunk failed");
    attemptReload(error);

    const retryExhaustedEvent = emittedEvents.find((e) => e.name === "retry-exhausted");
    expect(retryExhaustedEvent).toBeDefined();
    expect(retryExhaustedEvent).toMatchObject({
      finalAttempt: 3,
      name: "retry-exhausted",
      retryId: "exhausted-retry-id",
    });

    const fallbackEvent = emittedEvents.find((e) => e.name === "fallback-ui-shown");
    expect(fallbackEvent).toBeDefined();
    expect(fallbackEvent).toMatchObject({ name: "fallback-ui-shown" });

    // Verify event order: retry-exhausted before fallback-ui-shown
    const exhaustedIdx = emittedEvents.findIndex((e) => e.name === "retry-exhausted");
    const fallbackIdx = emittedEvents.findIndex((e) => e.name === "fallback-ui-shown");
    expect(exhaustedIdx).toBeLessThan(fallbackIdx);
  });

  it("sends a beacon when max retries are exceeded", () => {
    setupMockLocation(
      "http://localhost/?spaGuardRetryId=exhausted-retry-id&spaGuardRetryAttempt=3",
    );

    const mockSendBeacon = vi.spyOn(navigator, "sendBeacon").mockReturnValue(true);

    vi.mocked(getOptions).mockReturnValue(
      makeOptions({
        enableRetryReset: false,
        fallback: {
          html: "<div id='spa-guard-fallback'>Fallback UI</div>",
          selector: "body",
        },
        reloadDelays: [1000, 2000, 5000],
        reportBeacon: { endpoint: "http://test.example.com/beacon" },
        useRetryId: true,
      }),
    );

    const error = new Error("ChunkLoadError: Loading chunk failed");
    attemptReload(error);

    expect(mockSendBeacon).toHaveBeenCalledWith(
      "http://test.example.com/beacon",
      expect.stringContaining("chunk_error_max_reloads"),
    );
  });
});

// =============================================================================
// 6. Retry reset after minTimeBetweenResets
// =============================================================================

describe("retry reset after minTimeBetweenResets", () => {
  it("emits retry-reset event when enough time has passed since last reload", () => {
    // URL has attempt=1 for retry ID "old-retry-id"
    setupMockLocation("http://localhost/?spaGuardRetryId=old-retry-id&spaGuardRetryAttempt=1");

    // Last reload was 40 seconds ago — exceeds delay + page load buffer (1000 + 30000 = 31000ms)
    const pastTimestamp = Date.now() - 40_000;
    sessionStorage.setItem(
      "__spa_guard_last_reload_timestamp__",
      JSON.stringify({
        attemptNumber: 1,
        retryId: "old-retry-id",
        timestamp: pastTimestamp,
      }),
    );

    vi.mocked(getOptions).mockReturnValue(
      makeOptions({
        enableRetryReset: true,
        fallback: { html: "<div>Fallback</div>", selector: "body" },
        minTimeBetweenResets: 100, // only 100ms minimum between resets
        reloadDelays: [1000, 2000, 5000],
        useRetryId: true,
      }),
    );

    const emittedEvents: SPAGuardEvent[] = [];
    unsubscribeEvents = subscribe((event) => emittedEvents.push(event));

    const error = new Error("ChunkLoadError: Failed to load chunk");
    attemptReload(error);

    const resetEvent = emittedEvents.find((e) => e.name === "retry-reset");
    expect(resetEvent).toBeDefined();
    expect(resetEvent).toMatchObject({
      name: "retry-reset",
      previousAttempt: 1,
      previousRetryId: "old-retry-id",
    });
  });

  it("starts a fresh retry cycle after reset (retry-attempt with attempt=1)", () => {
    setupMockLocation("http://localhost/?spaGuardRetryId=old-retry-id&spaGuardRetryAttempt=1");

    const pastTimestamp = Date.now() - 40_000;
    sessionStorage.setItem(
      "__spa_guard_last_reload_timestamp__",
      JSON.stringify({
        attemptNumber: 1,
        retryId: "old-retry-id",
        timestamp: pastTimestamp,
      }),
    );

    vi.mocked(getOptions).mockReturnValue(
      makeOptions({
        enableRetryReset: true,
        fallback: { html: "<div>Fallback</div>", selector: "body" },
        minTimeBetweenResets: 100,
        reloadDelays: [1, 2, 5], // tiny delays so setTimeout fires quickly
        useRetryId: true,
      }),
    );

    const emittedEvents: SPAGuardEvent[] = [];
    unsubscribeEvents = subscribe((event) => emittedEvents.push(event));

    const error = new Error("ChunkLoadError: Failed to load chunk");
    attemptReload(error);

    // After reset, a new retry cycle should start with attempt=1
    const retryEvent = emittedEvents.find((e) => e.name === "retry-attempt");
    expect(retryEvent).toBeDefined();
    expect(retryEvent).toMatchObject({ attempt: 1, name: "retry-attempt" });

    // The new retry ID should differ from the old one
    if (retryEvent && "retryId" in retryEvent) {
      expect((retryEvent as { retryId: string }).retryId).not.toBe("old-retry-id");
    }
  });

  it("does NOT reset when not enough time has passed since last reload", () => {
    setupMockLocation("http://localhost/?spaGuardRetryId=recent-retry-id&spaGuardRetryAttempt=1");

    // Last reload was only 100ms ago, reloadDelays[0]=1000ms → not enough time
    const recentTimestamp = Date.now() - 100;
    sessionStorage.setItem(
      "__spa_guard_last_reload_timestamp__",
      JSON.stringify({
        attemptNumber: 1,
        retryId: "recent-retry-id",
        timestamp: recentTimestamp,
      }),
    );

    vi.mocked(getOptions).mockReturnValue(
      makeOptions({
        enableRetryReset: true,
        fallback: { html: "<div>Fallback</div>", selector: "body" },
        minTimeBetweenResets: 100,
        reloadDelays: [1000, 2000, 5000], // delay=1000ms, elapsed=100ms → no reset
        useRetryId: true,
      }),
    );

    const emittedEvents: SPAGuardEvent[] = [];
    unsubscribeEvents = subscribe((event) => emittedEvents.push(event));

    const error = new Error("ChunkLoadError: Failed to load chunk");
    attemptReload(error);

    // No retry-reset event should be emitted
    const resetEvent = emittedEvents.find((e) => e.name === "retry-reset");
    expect(resetEvent).toBeUndefined();

    // Should instead emit normal retry-attempt (attempt=2, continuing from attempt=1)
    const retryEvent = emittedEvents.find((e) => e.name === "retry-attempt");
    expect(retryEvent).toMatchObject({ attempt: 2, name: "retry-attempt" });
  });
});
