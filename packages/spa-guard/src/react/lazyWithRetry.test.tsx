import { Component, type PropsWithChildren, Suspense } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../common/options", () => ({
  getOptions: vi.fn(),
}));

vi.mock("../common/retryImport", () => ({
  retryImport: vi.fn(),
}));

import { getOptions } from "../common/options";
import { retryImport } from "../common/retryImport";
import { lazyWithRetry } from "./lazyWithRetry";

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

const LoadedSuccessfullyComponent = () => <div>Loaded Successfully</div>;
const LoadedAfterRetryComponent = () => <div>Loaded After Retry</div>;
const GenericComponent = () => <div>Component</div>;

const mockGetOptions = (lazyRetry?: { callReloadOnFailure?: boolean; retryDelays?: number[] }) => {
  vi.mocked(getOptions).mockReturnValue({
    lazyRetry: lazyRetry ?? { callReloadOnFailure: true, retryDelays: [1000, 2000] },
  });
};

describe("lazyWithRetry", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the component successfully on first load without retry", async () => {
    mockGetOptions();
    vi.mocked(retryImport).mockResolvedValue({ default: LoadedSuccessfullyComponent });

    const mockImportFn = vi.fn().mockResolvedValue({ default: LoadedSuccessfullyComponent });
    const LazyComponent = lazyWithRetry(mockImportFn);

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent />
      </Suspense>,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Loaded Successfully")).toBeInTheDocument();
    });
  });

  it("renders the component after a retry attempt", async () => {
    mockGetOptions();
    vi.mocked(retryImport).mockResolvedValue({ default: LoadedAfterRetryComponent });

    const mockImportFn = vi.fn();
    const LazyComponent = lazyWithRetry(mockImportFn, { retryDelays: [100] });

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent />
      </Suspense>,
    );

    await waitFor(() => {
      expect(screen.getByText("Loaded After Retry")).toBeInTheDocument();
    });
  });

  it("passes global options to retryImport when no per-import options are provided", async () => {
    mockGetOptions({ callReloadOnFailure: false, retryDelays: [500, 1500] });
    vi.mocked(retryImport).mockResolvedValue({ default: GenericComponent });

    const mockImportFn = vi.fn();
    const LazyComponent = lazyWithRetry(mockImportFn);

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent />
      </Suspense>,
    );

    await waitFor(() => {
      expect(retryImport).toHaveBeenCalledWith(mockImportFn, [500, 1500], {
        callReloadOnFailure: false,
      });
    });
  });

  it("per-import retryDelays override global retryDelays", async () => {
    mockGetOptions({ callReloadOnFailure: true, retryDelays: [1000, 2000] });
    vi.mocked(retryImport).mockResolvedValue({ default: GenericComponent });

    const mockImportFn = vi.fn();
    const LazyComponent = lazyWithRetry(mockImportFn, {
      retryDelays: [100, 200, 300],
    });

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent />
      </Suspense>,
    );

    await waitFor(() => {
      expect(retryImport).toHaveBeenCalledWith(mockImportFn, [100, 200, 300], {
        callReloadOnFailure: true,
      });
    });
  });

  it("per-import callReloadOnFailure overrides global callReloadOnFailure", async () => {
    mockGetOptions({ callReloadOnFailure: true, retryDelays: [1000, 2000] });
    vi.mocked(retryImport).mockResolvedValue({ default: GenericComponent });

    const mockImportFn = vi.fn();
    const LazyComponent = lazyWithRetry(mockImportFn, {
      callReloadOnFailure: false,
    });

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent />
      </Suspense>,
    );

    await waitFor(() => {
      expect(retryImport).toHaveBeenCalledWith(mockImportFn, [1000, 2000], {
        callReloadOnFailure: false,
      });
    });
  });

  it("per-import options fully override global options when both are provided", async () => {
    mockGetOptions({ callReloadOnFailure: true, retryDelays: [1000, 2000] });
    vi.mocked(retryImport).mockResolvedValue({ default: GenericComponent });

    const mockImportFn = vi.fn();
    const LazyComponent = lazyWithRetry(mockImportFn, {
      callReloadOnFailure: false,
      retryDelays: [100, 200, 300],
    });

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent />
      </Suspense>,
    );

    await waitFor(() => {
      expect(retryImport).toHaveBeenCalledWith(mockImportFn, [100, 200, 300], {
        callReloadOnFailure: false,
      });
    });
  });

  it("uses hardcoded default retryDelays and callReloadOnFailure when lazyRetry is not in global options", async () => {
    vi.mocked(getOptions).mockReturnValue({});
    vi.mocked(retryImport).mockResolvedValue({ default: GenericComponent });

    const mockImportFn = vi.fn();
    const LazyComponent = lazyWithRetry(mockImportFn);

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent />
      </Suspense>,
    );

    await waitFor(() => {
      expect(retryImport).toHaveBeenCalledWith(mockImportFn, [1000, 2000], {
        callReloadOnFailure: true,
      });
    });
  });

  it("uses hardcoded default retryDelays when global lazyRetry.retryDelays is not set", async () => {
    vi.mocked(getOptions).mockReturnValue({ lazyRetry: { callReloadOnFailure: false } });
    vi.mocked(retryImport).mockResolvedValue({ default: GenericComponent });

    const mockImportFn = vi.fn();
    const LazyComponent = lazyWithRetry(mockImportFn);

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent />
      </Suspense>,
    );

    await waitFor(() => {
      expect(retryImport).toHaveBeenCalledWith(mockImportFn, [1000, 2000], {
        callReloadOnFailure: false,
      });
    });
  });

  it("uses hardcoded default callReloadOnFailure when global lazyRetry.callReloadOnFailure is not set", async () => {
    vi.mocked(getOptions).mockReturnValue({ lazyRetry: { retryDelays: [500] } });
    vi.mocked(retryImport).mockResolvedValue({ default: GenericComponent });

    const mockImportFn = vi.fn();
    const LazyComponent = lazyWithRetry(mockImportFn);

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent />
      </Suspense>,
    );

    await waitFor(() => {
      expect(retryImport).toHaveBeenCalledWith(mockImportFn, [500], {
        callReloadOnFailure: true,
      });
    });
  });

  it("passes signal from per-import options to retryImport", async () => {
    mockGetOptions();
    vi.mocked(retryImport).mockResolvedValue({ default: GenericComponent });

    const controller = new AbortController();
    const mockImportFn = vi.fn();
    const LazyComponent = lazyWithRetry(mockImportFn, { signal: controller.signal });

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent />
      </Suspense>,
    );

    await waitFor(() => {
      expect(retryImport).toHaveBeenCalledWith(
        mockImportFn,
        expect.any(Array),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  it("triggers error boundary when lazy component fails to load after all retries", async () => {
    mockGetOptions();
    const loadError = new Error("Failed to fetch dynamically imported module");
    vi.mocked(retryImport).mockRejectedValue(loadError);

    const mockImportFn = vi.fn();
    const onError = vi.fn();

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const LazyComponent = lazyWithRetry(mockImportFn);

    render(
      <ErrorBoundary onError={onError}>
        <Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </Suspense>
      </ErrorBoundary>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("error")).toBeInTheDocument();
    });

    expect(screen.getByTestId("error")).toHaveTextContent(
      "Failed to fetch dynamically imported module",
    );
    expect(onError).toHaveBeenCalledWith(loadError);

    consoleError.mockRestore();
  });
});
