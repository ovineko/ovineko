import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SPAGuardEvent } from "../../common/events/types";
import type { SpaGuardState } from "../state";

vi.mock("../../common/events/internal", () => ({
  subscribe: vi.fn(),
}));

vi.mock("../state", () => ({
  subscribeToState: vi.fn(),
}));

vi.mock("./errorDispatchers", () => ({
  dispatchAsyncRuntimeError: vi.fn(),
  dispatchChunkLoadError: vi.fn(),
  dispatchFinallyError: vi.fn(),
  dispatchNetworkTimeout: vi.fn(),
  dispatchSyncRuntimeError: vi.fn(),
}));

import { subscribe } from "../../common/events/internal";
import { subscribeToState } from "../state";
import {
  dispatchAsyncRuntimeError,
  dispatchChunkLoadError,
  dispatchFinallyError,
  dispatchNetworkTimeout,
  dispatchSyncRuntimeError,
} from "./errorDispatchers";

const mockSubscribe = vi.mocked(subscribe);
const mockSubscribeToState = vi.mocked(subscribeToState);
const mockDispatchChunkLoadError = vi.mocked(dispatchChunkLoadError);
const mockDispatchNetworkTimeout = vi.mocked(dispatchNetworkTimeout);
const mockDispatchSyncRuntimeError = vi.mocked(dispatchSyncRuntimeError);
const mockDispatchAsyncRuntimeError = vi.mocked(dispatchAsyncRuntimeError);
const mockDispatchFinallyError = vi.mocked(dispatchFinallyError);

const defaultState: SpaGuardState = {
  currentAttempt: 0,
  isFallbackShown: false,
  isWaiting: false,
};

function getButton(key: string): HTMLButtonElement | null {
  return document.querySelector(`[data-testid="debug-btn-${key}"]`);
}

function getContent(): HTMLElement | null {
  return document.querySelector('[data-testid="debug-panel-content"]');
}

function getHeader(): HTMLElement | null {
  return document.querySelector('[data-testid="debug-panel-header"]');
}

function getPanel(): HTMLElement | null {
  return document.querySelector('[data-testid="spa-guard-debug-panel"]');
}

let capturedEventCallback: ((event: SPAGuardEvent) => void) | null = null;
let capturedStateCallback: ((state: SpaGuardState) => void) | null = null;

function cleanupDom(): void {
  const panels = document.querySelectorAll('[data-testid="spa-guard-debug-panel"]');
  for (const p of panels) {
    p.remove();
  }
  vi.restoreAllMocks();
  vi.resetModules();
}

function setupMocks(): void {
  capturedEventCallback = null;
  capturedStateCallback = null;

  mockSubscribe.mockImplementation((cb) => {
    capturedEventCallback = cb;
    return () => {};
  });

  mockSubscribeToState.mockImplementation((cb) => {
    capturedStateCallback = cb;
    cb({ ...defaultState });
    return () => {};
  });
}

describe("createDebugger - rendering", () => {
  beforeEach(setupMocks);
  afterEach(cleanupDom);

  it("creates a panel in the DOM", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    expect(getPanel()).not.toBeNull();
    destroy();
  });

  it("appends the panel to document.body", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    expect(document.body.contains(getPanel())).toBe(true);
    destroy();
  });

  it("returns a function", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    expect(typeof destroy).toBe("function");
    destroy();
  });

  it("defaults to open (content visible)", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    expect(getContent()).not.toBeNull();
    destroy();
  });

  it("defaults to bottom-right position", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    const panel = getPanel()!;
    expect(panel.getAttribute("style")).toContain("bottom:16px");
    expect(panel.getAttribute("style")).toContain("right:16px");
    destroy();
  });

  it("hides content when defaultOpen is false", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create({ defaultOpen: false });
    expect(getContent()).toBeNull();
    destroy();
  });
});

describe("createDebugger - position", () => {
  beforeEach(setupMocks);
  afterEach(cleanupDom);

  it("supports top-left", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create({ position: "top-left" });
    const panel = getPanel()!;
    expect(panel.getAttribute("style")).toContain("top:16px");
    expect(panel.getAttribute("style")).toContain("left:16px");
    destroy();
  });

  it("supports top-right", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create({ position: "top-right" });
    const panel = getPanel()!;
    expect(panel.getAttribute("style")).toContain("top:16px");
    expect(panel.getAttribute("style")).toContain("right:16px");
    destroy();
  });

  it("supports bottom-left", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create({ position: "bottom-left" });
    const panel = getPanel()!;
    expect(panel.getAttribute("style")).toContain("bottom:16px");
    expect(panel.getAttribute("style")).toContain("left:16px");
    destroy();
  });
});

describe("createDebugger - toggle", () => {
  beforeEach(setupMocks);
  afterEach(cleanupDom);

  it("toggles content visibility when header is clicked", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create({ defaultOpen: true });

    expect(getContent()).not.toBeNull();
    getHeader()!.click();
    expect(getContent()).toBeNull();
    getHeader()!.click();
    expect(getContent()).not.toBeNull();

    destroy();
  });

  it("shows up arrow when open, down arrow when closed", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create({ defaultOpen: true });

    expect(getHeader()!.textContent).toContain("\u25B2");
    getHeader()!.click();
    expect(getHeader()!.textContent).toContain("\u25BC");

    destroy();
  });

  it("opens content when toggling from closed state", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create({ defaultOpen: false });

    expect(getContent()).toBeNull();
    getHeader()!.click();
    expect(getContent()).not.toBeNull();

    destroy();
  });
});

describe("createDebugger - buttons", () => {
  beforeEach(setupMocks);
  afterEach(cleanupDom);

  it("renders all 5 error buttons", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    expect(getButton("chunk-load-error")).not.toBeNull();
    expect(getButton("network-timeout")).not.toBeNull();
    expect(getButton("sync-runtime-error")).not.toBeNull();
    expect(getButton("async-runtime-error")).not.toBeNull();
    expect(getButton("finally-error")).not.toBeNull();
    destroy();
  });

  it("calls dispatchChunkLoadError when chunk button is clicked", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    getButton("chunk-load-error")!.click();
    expect(mockDispatchChunkLoadError).toHaveBeenCalledOnce();
    destroy();
  });

  it("calls dispatchNetworkTimeout when timeout button is clicked", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    getButton("network-timeout")!.click();
    expect(mockDispatchNetworkTimeout).toHaveBeenCalledWith(100);
    destroy();
  });

  it("calls dispatchSyncRuntimeError when sync runtime button is clicked", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    getButton("sync-runtime-error")!.click();
    expect(mockDispatchSyncRuntimeError).toHaveBeenCalledOnce();
    destroy();
  });

  it("calls dispatchAsyncRuntimeError when async runtime button is clicked", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    getButton("async-runtime-error")!.click();
    expect(mockDispatchAsyncRuntimeError).toHaveBeenCalledOnce();
    destroy();
  });

  it("calls dispatchFinallyError when finally button is clicked", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    getButton("finally-error")!.click();
    expect(mockDispatchFinallyError).toHaveBeenCalledOnce();
    destroy();
  });

  it("shows default labels initially", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    expect(getButton("chunk-load-error")!.textContent).toBe("ChunkLoadError");
    expect(getButton("network-timeout")!.textContent).toBe("Network Timeout");
    expect(getButton("sync-runtime-error")!.textContent).toBe("Sync Runtime Error");
    expect(getButton("async-runtime-error")!.textContent).toBe("Async Runtime Error");
    expect(getButton("finally-error")!.textContent).toBe("Finally Error");
    destroy();
  });

  it("shows loading state synchronously on click", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    const btn = getButton("chunk-load-error")!;
    btn.click();
    expect(btn.textContent).toBe("ChunkLoadError...");
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute("style")).toContain("opacity:0.7");
    await Promise.resolve();
    destroy();
  });

  it("transitions to triggered state after microtask", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    getButton("chunk-load-error")!.click();
    await Promise.resolve();
    expect(getButton("chunk-load-error")!.textContent).toBe("ChunkLoadError \u2713");
    destroy();
  });

  it("re-enables button after triggered state", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    const btn = getButton("chunk-load-error")!;
    btn.click();
    expect(btn.disabled).toBe(true);
    await Promise.resolve();
    expect(btn.disabled).toBe(false);
    destroy();
  });
});

describe("createDebugger - state display", () => {
  beforeEach(setupMocks);
  afterEach(cleanupDom);

  it("renders the state section", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    expect(document.querySelector('[data-testid="debug-state-section"]')).not.toBeNull();
    expect(document.body.textContent).toContain("State");
    destroy();
  });

  it("displays default state values", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();

    expect(document.querySelector('[data-testid="debug-state-attempt"]')!.textContent).toContain(
      "0",
    );
    expect(document.querySelector('[data-testid="debug-state-waiting"]')!.textContent).toContain(
      "false",
    );
    expect(document.querySelector('[data-testid="debug-state-fallback"]')!.textContent).toContain(
      "false",
    );

    destroy();
  });

  it("updates state values when state changes", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();

    capturedStateCallback!({
      currentAttempt: 3,
      isFallbackShown: true,
      isWaiting: true,
    });

    expect(document.querySelector('[data-testid="debug-state-attempt"]')!.textContent).toContain(
      "3",
    );
    expect(document.querySelector('[data-testid="debug-state-waiting"]')!.textContent).toContain(
      "true",
    );
    expect(document.querySelector('[data-testid="debug-state-fallback"]')!.textContent).toContain(
      "true",
    );

    destroy();
  });
});

describe("createDebugger - event history", () => {
  beforeEach(setupMocks);
  afterEach(cleanupDom);

  it("renders the event history section", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    expect(document.querySelector('[data-testid="debug-events-section"]')).not.toBeNull();
    expect(document.body.textContent).toContain("Event History (0)");
    destroy();
  });

  it("starts with empty event list", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    expect(document.querySelectorAll('[data-testid="debug-event-entry"]')).toHaveLength(0);
    destroy();
  });

  it("displays events when emitted", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    capturedEventCallback!({ error: new Error("test"), isRetrying: false, name: "chunk-error" });
    const entries = document.querySelectorAll('[data-testid="debug-event-entry"]');
    expect(entries).toHaveLength(1);
    expect(entries[0].textContent).toContain("chunk-error");
    destroy();
  });

  it("shows timestamps on event entries", async () => {
    const fixedTime = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(fixedTime);

    const { createDebugger: create } = await import("./index");
    const destroy = create();
    capturedEventCallback!({ error: new Error("test"), isRetrying: false, name: "chunk-error" });
    expect(document.querySelector('[data-testid="debug-event-entry"]')!.textContent).toContain(
      new Date(fixedTime).toLocaleTimeString(),
    );
    destroy();
  });

  it("accumulates multiple events", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    capturedEventCallback!({ error: new Error("test"), isRetrying: false, name: "chunk-error" });
    capturedEventCallback!({ attempt: 1, delay: 1000, name: "retry-attempt", retryId: "abc" });
    const entries = document.querySelectorAll('[data-testid="debug-event-entry"]');
    expect(entries).toHaveLength(2);
    expect(entries[0].textContent).toContain("chunk-error");
    expect(entries[1].textContent).toContain("retry-attempt");
    destroy();
  });

  it("updates the event count", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    expect(document.body.textContent).toContain("Event History (0)");
    capturedEventCallback!({ error: new Error("test"), isRetrying: false, name: "chunk-error" });
    expect(document.body.textContent).toContain("Event History (1)");
    capturedEventCallback!({ name: "fallback-ui-shown" });
    expect(document.body.textContent).toContain("Event History (2)");
    destroy();
  });

  it("clears event history when clear button is clicked", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    capturedEventCallback!({ error: new Error("test"), isRetrying: false, name: "chunk-error" });
    capturedEventCallback!({ name: "fallback-ui-shown" });
    expect(document.querySelectorAll('[data-testid="debug-event-entry"]')).toHaveLength(2);
    document.querySelector<HTMLButtonElement>('[data-testid="debug-clear-history"]')!.click();
    expect(document.querySelectorAll('[data-testid="debug-event-entry"]')).toHaveLength(0);
    expect(document.body.textContent).toContain("Event History (0)");
    destroy();
  });

  it("caps event history at 100 entries", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    for (let i = 0; i < 105; i++) {
      capturedEventCallback!({ name: "fallback-ui-shown" });
    }
    expect(document.querySelectorAll('[data-testid="debug-event-entry"]')).toHaveLength(100);
    destroy();
  });
});

describe("createDebugger - destroy and dedup", () => {
  beforeEach(setupMocks);
  afterEach(cleanupDom);

  it("removes the panel from the DOM on destroy", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    expect(getPanel()).not.toBeNull();
    destroy();
    expect(getPanel()).toBeNull();
  });

  it("calls unsubscribe functions on destroy", async () => {
    const unsubState = vi.fn();
    const unsubEvents = vi.fn();
    mockSubscribeToState.mockImplementation((cb) => {
      capturedStateCallback = cb;
      cb({ ...defaultState });
      return unsubState;
    });
    mockSubscribe.mockImplementation((cb) => {
      capturedEventCallback = cb;
      return unsubEvents;
    });

    const { createDebugger: create } = await import("./index");
    const destroy = create();
    destroy();
    expect(unsubState).toHaveBeenCalledOnce();
    expect(unsubEvents).toHaveBeenCalledOnce();
  });

  it("returns the same destroy function on duplicate call", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy1 = create();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const destroy2 = create();
    expect(destroy1).toBe(destroy2);
    destroy1();
  });

  it("logs a warning on duplicate call", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    create();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Debug panel already exists"));
    destroy();
  });

  it("only creates one panel in the DOM", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    create();
    expect(document.querySelectorAll('[data-testid="spa-guard-debug-panel"]')).toHaveLength(1);
    destroy();
  });

  it("allows creating a new panel after destroy", async () => {
    const { createDebugger: create } = await import("./index");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const destroy1 = create();
    destroy1();
    const destroy2 = create();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(getPanel()).not.toBeNull();
    expect(destroy2).not.toBe(destroy1);
    destroy2();
  });

  it("does not throw when destroy is called twice", async () => {
    const { createDebugger: create } = await import("./index");
    const destroy = create();
    destroy();
    expect(() => destroy()).not.toThrow();
  });
});
