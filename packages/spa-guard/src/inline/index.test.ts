import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockListenInternal = vi.fn();

vi.mock("../common/listen/internal", () => ({
  listenInternal: mockListenInternal,
}));

describe("inline entry point (production)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls listenInternal with a noop serializeError and no logger", async () => {
    await import("./index");

    expect(mockListenInternal).toHaveBeenCalledTimes(1);
    expect(mockListenInternal).toHaveBeenCalledWith(expect.any(Function));

    // Verify only one argument (no logger passed)
    const args = mockListenInternal.mock.calls[0]!;
    expect(args).toHaveLength(1);

    // Verify the serializeError is a noop that returns empty string
    expect(args[0]("anything")).toBe("");
  });
});
