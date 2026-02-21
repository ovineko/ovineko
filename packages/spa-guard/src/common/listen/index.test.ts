import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockListenInternal = vi.fn();
const mockCreateLogger = vi.fn().mockReturnValue({ logEvent: vi.fn() });
const mockSerializeError = vi.fn();

vi.mock("./internal", () => ({
  listenInternal: mockListenInternal,
}));

vi.mock("../logger", () => ({
  createLogger: mockCreateLogger,
}));

vi.mock("../serializeError", () => ({
  serializeError: mockSerializeError,
}));

describe("listen() entry point", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls listenInternal with serializeError and a logger from createLogger()", async () => {
    const fakeLogger = { logEvent: vi.fn() };
    mockCreateLogger.mockReturnValue(fakeLogger);

    const { listen } = await import("./index");
    listen();

    expect(mockCreateLogger).toHaveBeenCalledTimes(1);
    expect(mockListenInternal).toHaveBeenCalledTimes(1);
    expect(mockListenInternal).toHaveBeenCalledWith(mockSerializeError, fakeLogger);
  });

  it("does not call listenInternal when window is undefined", async () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error - testing SSR scenario
    delete globalThis.window;

    const { listen } = await import("./index");
    listen();

    expect(mockListenInternal).not.toHaveBeenCalled();

    globalThis.window = originalWindow;
  });
});
