import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SPAGuardEvent } from "../../common/events/types";
import type { SpaGuardState } from "../../runtime";

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

vi.mock("../useSPAGuardEvents", () => ({
  useSPAGuardEvents: vi.fn(),
}));

vi.mock("../index", () => ({
  useSpaGuardState: vi.fn(),
}));

import { useSpaGuardState } from "../index";
import { useSPAGuardEvents } from "../useSPAGuardEvents";
import { DebugTestPanel } from "./index";

const mockUseSPAGuardEvents = vi.mocked(useSPAGuardEvents);
const mockUseSpaGuardState = vi.mocked(useSpaGuardState);

const mockSimulateChunkLoadError = vi.mocked(simulateChunkLoadError);
const mockSimulateFinallyError = vi.mocked(simulateFinallyError);
const mockSimulateNetworkTimeout = vi.mocked(simulateNetworkTimeout);
const mockSimulateRuntimeError = vi.mocked(simulateRuntimeError);

const defaultState: SpaGuardState = {
  currentAttempt: 0,
  isFallbackShown: false,
  isWaiting: false,
};

describe("DebugTestPanel", () => {
  let capturedEventCallback: ((event: SPAGuardEvent) => void) | null = null;

  beforeEach(() => {
    capturedEventCallback = null;
    mockUseSPAGuardEvents.mockImplementation((cb) => {
      capturedEventCallback = cb;
    });
    mockUseSpaGuardState.mockReturnValue({ ...defaultState });

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

  describe("state display", () => {
    it("renders the state section", () => {
      render(<DebugTestPanel />);

      expect(screen.getByTestId("debug-state-section")).toBeInTheDocument();
      expect(screen.getByText("State")).toBeInTheDocument();
    });

    it("displays default state values", () => {
      render(<DebugTestPanel />);

      const attemptRow = screen.getByTestId("debug-state-attempt");
      expect(attemptRow.textContent).toContain("attempt");
      expect(attemptRow.textContent).toContain("0");

      const waitingRow = screen.getByTestId("debug-state-waiting");
      expect(waitingRow.textContent).toContain("isWaiting");
      expect(waitingRow.textContent).toContain("false");

      const fallbackRow = screen.getByTestId("debug-state-fallback");
      expect(fallbackRow.textContent).toContain("isFallbackShown");
      expect(fallbackRow.textContent).toContain("false");
    });

    it("reflects updated state values", () => {
      mockUseSpaGuardState.mockReturnValue({
        currentAttempt: 3,
        isFallbackShown: true,
        isWaiting: true,
      });

      render(<DebugTestPanel />);

      const attemptRow = screen.getByTestId("debug-state-attempt");
      expect(attemptRow.textContent).toContain("3");

      const waitingRow = screen.getByTestId("debug-state-waiting");
      expect(waitingRow.textContent).toContain("true");

      const fallbackRow = screen.getByTestId("debug-state-fallback");
      expect(fallbackRow.textContent).toContain("true");
    });
  });

  describe("event history", () => {
    it("renders the event history section", () => {
      render(<DebugTestPanel />);

      expect(screen.getByTestId("debug-events-section")).toBeInTheDocument();
      expect(screen.getByText("Event History (0)")).toBeInTheDocument();
    });

    it("starts with an empty event list", () => {
      render(<DebugTestPanel />);

      expect(screen.queryAllByTestId("debug-event-entry")).toHaveLength(0);
    });

    it("displays events when they are emitted", () => {
      vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

      render(<DebugTestPanel />);

      act(() => {
        capturedEventCallback!({
          error: new Error("test"),
          isRetrying: false,
          name: "chunk-error",
        });
      });

      const entries = screen.getAllByTestId("debug-event-entry");
      expect(entries).toHaveLength(1);
      expect(entries[0].textContent).toContain("chunk-error");
    });

    it("shows timestamps on event entries", () => {
      const fixedTime = 1_700_000_000_000;
      vi.spyOn(Date, "now").mockReturnValue(fixedTime);
      const expectedTime = new Date(fixedTime).toLocaleTimeString();

      render(<DebugTestPanel />);

      act(() => {
        capturedEventCallback!({
          error: new Error("test"),
          isRetrying: false,
          name: "chunk-error",
        });
      });

      const entry = screen.getByTestId("debug-event-entry");
      expect(entry.textContent).toContain(expectedTime);
    });

    it("accumulates multiple events", () => {
      render(<DebugTestPanel />);

      act(() => {
        capturedEventCallback!({
          error: new Error("test"),
          isRetrying: false,
          name: "chunk-error",
        });
      });

      act(() => {
        capturedEventCallback!({
          attempt: 1,
          delay: 1000,
          name: "retry-attempt",
          retryId: "abc",
        });
      });

      const entries = screen.getAllByTestId("debug-event-entry");
      expect(entries).toHaveLength(2);
      expect(entries[0].textContent).toContain("chunk-error");
      expect(entries[1].textContent).toContain("retry-attempt");
    });

    it("updates the event count in the header", () => {
      render(<DebugTestPanel />);

      expect(screen.getByText("Event History (0)")).toBeInTheDocument();

      act(() => {
        capturedEventCallback!({
          error: new Error("test"),
          isRetrying: false,
          name: "chunk-error",
        });
      });

      expect(screen.getByText("Event History (1)")).toBeInTheDocument();

      act(() => {
        capturedEventCallback!({ name: "fallback-ui-shown" });
      });

      expect(screen.getByText("Event History (2)")).toBeInTheDocument();
    });

    it("clears event history when clear button is clicked", () => {
      render(<DebugTestPanel />);

      act(() => {
        capturedEventCallback!({
          error: new Error("test"),
          isRetrying: false,
          name: "chunk-error",
        });
      });

      act(() => {
        capturedEventCallback!({ name: "fallback-ui-shown" });
      });

      expect(screen.getAllByTestId("debug-event-entry")).toHaveLength(2);

      fireEvent.click(screen.getByTestId("debug-clear-history"));

      expect(screen.queryAllByTestId("debug-event-entry")).toHaveLength(0);
      expect(screen.getByText("Event History (0)")).toBeInTheDocument();
    });

    it("renders the clear button", () => {
      render(<DebugTestPanel />);

      expect(screen.getByTestId("debug-clear-history")).toBeInTheDocument();
      expect(screen.getByTestId("debug-clear-history").textContent).toBe("clear");
    });
  });
});
