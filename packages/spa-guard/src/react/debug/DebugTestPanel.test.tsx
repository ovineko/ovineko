import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  simulateChunkLoadError,
  simulateFinallyError,
  simulateNetworkTimeout,
  simulateRuntimeError,
} from "./errorSimulators";

vi.mock("./errorSimulators", () => ({
  simulateChunkLoadError: vi.fn(),
  simulateFinallyError: vi.fn(),
  simulateNetworkTimeout: vi.fn(),
  simulateRuntimeError: vi.fn(),
}));

import { DebugTestPanel } from "./index";

const mockSimulateChunkLoadError = vi.mocked(simulateChunkLoadError);
const mockSimulateFinallyError = vi.mocked(simulateFinallyError);
const mockSimulateNetworkTimeout = vi.mocked(simulateNetworkTimeout);
const mockSimulateRuntimeError = vi.mocked(simulateRuntimeError);

describe("DebugTestPanel", () => {
  beforeEach(() => {
    mockSimulateChunkLoadError.mockRejectedValue(new Error("chunk error"));
    mockSimulateFinallyError.mockRejectedValue(new Error("finally error"));
    mockSimulateNetworkTimeout.mockRejectedValue(new Error("timeout error"));
    mockSimulateRuntimeError.mockImplementation(() => {
      throw new Error("runtime error");
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the panel with default props", () => {
      render(<DebugTestPanel />);

      expect(screen.getByTestId("spa-guard-debug-panel")).toBeInTheDocument();
      expect(screen.getByText("spa-guard debug")).toBeInTheDocument();
    });

    it("renders content when defaultOpen is true", () => {
      render(<DebugTestPanel defaultOpen={true} />);

      expect(screen.getByTestId("debug-panel-content")).toBeInTheDocument();
      expect(screen.getByTestId("debug-btn-chunk-load-error")).toBeInTheDocument();
      expect(screen.getByTestId("debug-btn-network-timeout")).toBeInTheDocument();
      expect(screen.getByTestId("debug-btn-runtime-error")).toBeInTheDocument();
      expect(screen.getByTestId("debug-btn-finally-error")).toBeInTheDocument();
    });

    it("hides content when defaultOpen is false", () => {
      render(<DebugTestPanel defaultOpen={false} />);

      expect(screen.queryByTestId("debug-panel-content")).not.toBeInTheDocument();
    });

    it("defaults to open", () => {
      render(<DebugTestPanel />);

      expect(screen.getByTestId("debug-panel-content")).toBeInTheDocument();
    });
  });

  describe("position prop", () => {
    it("renders in bottom-right by default", () => {
      render(<DebugTestPanel />);
      const panel = screen.getByTestId("spa-guard-debug-panel");

      expect(panel.style.bottom).toBe("16px");
      expect(panel.style.right).toBe("16px");
    });

    it("renders in top-left", () => {
      render(<DebugTestPanel position="top-left" />);
      const panel = screen.getByTestId("spa-guard-debug-panel");

      expect(panel.style.top).toBe("16px");
      expect(panel.style.left).toBe("16px");
    });

    it("renders in top-right", () => {
      render(<DebugTestPanel position="top-right" />);
      const panel = screen.getByTestId("spa-guard-debug-panel");

      expect(panel.style.top).toBe("16px");
      expect(panel.style.right).toBe("16px");
    });

    it("renders in bottom-left", () => {
      render(<DebugTestPanel position="bottom-left" />);
      const panel = screen.getByTestId("spa-guard-debug-panel");

      expect(panel.style.bottom).toBe("16px");
      expect(panel.style.left).toBe("16px");
    });
  });

  describe("toggle open/close", () => {
    it("toggles content visibility when header is clicked", () => {
      render(<DebugTestPanel defaultOpen={true} />);

      expect(screen.getByTestId("debug-panel-content")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("debug-panel-header"));
      expect(screen.queryByTestId("debug-panel-content")).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId("debug-panel-header"));
      expect(screen.getByTestId("debug-panel-content")).toBeInTheDocument();
    });

    it("shows up arrow when open, down arrow when closed", () => {
      render(<DebugTestPanel defaultOpen={true} />);
      const header = screen.getByTestId("debug-panel-header");

      expect(header.textContent).toContain("\u25B2");

      fireEvent.click(header);
      expect(header.textContent).toContain("\u25BC");
    });
  });

  describe("buttons call simulators", () => {
    it("calls simulateChunkLoadError when chunk button is clicked", async () => {
      render(<DebugTestPanel />);

      fireEvent.click(screen.getByTestId("debug-btn-chunk-load-error"));

      await waitFor(() => {
        expect(mockSimulateChunkLoadError).toHaveBeenCalledOnce();
      });
    });

    it("calls simulateNetworkTimeout when timeout button is clicked", async () => {
      render(<DebugTestPanel />);

      fireEvent.click(screen.getByTestId("debug-btn-network-timeout"));

      await waitFor(() => {
        expect(mockSimulateNetworkTimeout).toHaveBeenCalledWith(100);
      });
    });

    it("calls simulateRuntimeError when runtime button is clicked", async () => {
      render(<DebugTestPanel />);

      fireEvent.click(screen.getByTestId("debug-btn-runtime-error"));

      await waitFor(() => {
        expect(mockSimulateRuntimeError).toHaveBeenCalledOnce();
      });
    });

    it("calls simulateFinallyError when finally button is clicked", async () => {
      render(<DebugTestPanel />);

      fireEvent.click(screen.getByTestId("debug-btn-finally-error"));

      await waitFor(() => {
        expect(mockSimulateFinallyError).toHaveBeenCalledOnce();
      });
    });
  });

  describe("button visual states", () => {
    it("shows default label initially", () => {
      render(<DebugTestPanel />);

      expect(screen.getByTestId("debug-btn-chunk-load-error").textContent).toBe("ChunkLoadError");
      expect(screen.getByTestId("debug-btn-network-timeout").textContent).toBe("Network Timeout");
      expect(screen.getByTestId("debug-btn-runtime-error").textContent).toBe("Runtime Error");
      expect(screen.getByTestId("debug-btn-finally-error").textContent).toBe("Finally Error");
    });

    it("shows triggered state after error fires", async () => {
      render(<DebugTestPanel />);

      fireEvent.click(screen.getByTestId("debug-btn-chunk-load-error"));

      await waitFor(() => {
        expect(screen.getByTestId("debug-btn-chunk-load-error").textContent).toBe(
          "ChunkLoadError \u2713",
        );
      });
    });
  });

  describe("onErrorTriggered callback", () => {
    it("fires callback with error type and error for async errors", async () => {
      const onErrorTriggered = vi.fn();
      render(<DebugTestPanel onErrorTriggered={onErrorTriggered} />);

      fireEvent.click(screen.getByTestId("debug-btn-chunk-load-error"));

      await waitFor(() => {
        expect(onErrorTriggered).toHaveBeenCalledWith("chunk-load-error", expect.any(Error));
      });
    });

    it("fires callback with error type and error for sync errors", async () => {
      const onErrorTriggered = vi.fn();
      render(<DebugTestPanel onErrorTriggered={onErrorTriggered} />);

      fireEvent.click(screen.getByTestId("debug-btn-runtime-error"));

      await waitFor(() => {
        expect(onErrorTriggered).toHaveBeenCalledWith("runtime-error", expect.any(Error));
      });
    });

    it("does not throw when no callback is provided", async () => {
      render(<DebugTestPanel />);

      fireEvent.click(screen.getByTestId("debug-btn-chunk-load-error"));

      await waitFor(() => {
        expect(screen.getByTestId("debug-btn-chunk-load-error").textContent).toBe(
          "ChunkLoadError \u2713",
        );
      });
    });
  });
});
