import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockListenInternal = vi.fn();
const mockCreateLogger = vi.fn().mockReturnValue({ logEvent: vi.fn() });
const mockSerializeError = vi.fn();

vi.mock("../common/listen/internal", () => ({
  listenInternal: mockListenInternal,
}));

vi.mock("../common/logger", () => ({
  createLogger: mockCreateLogger,
}));

vi.mock("../common/serializeError", () => ({
  serializeError: mockSerializeError,
}));

describe("inline-trace entry point", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls listenInternal with serializeError and a logger from createLogger()", async () => {
    const fakeLogger = { logEvent: vi.fn() };
    mockCreateLogger.mockReturnValue(fakeLogger);

    await import("./index");

    expect(mockCreateLogger).toHaveBeenCalledTimes(1);
    expect(mockListenInternal).toHaveBeenCalledTimes(1);
    expect(mockListenInternal).toHaveBeenCalledWith(mockSerializeError, fakeLogger);
  });
});
