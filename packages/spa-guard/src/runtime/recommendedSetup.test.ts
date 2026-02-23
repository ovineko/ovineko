import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../common/checkVersion", () => ({
  startVersionCheck: vi.fn(),
  stopVersionCheck: vi.fn(),
}));

import { startVersionCheck, stopVersionCheck } from "../common/checkVersion";
import { recommendedSetup } from "./recommendedSetup";

describe("recommendedSetup", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls startVersionCheck by default", () => {
    recommendedSetup();
    expect(startVersionCheck).toHaveBeenCalledOnce();
  });

  it("calls startVersionCheck when versionCheck is true", () => {
    recommendedSetup({ versionCheck: true });
    expect(startVersionCheck).toHaveBeenCalledOnce();
  });

  it("does not call startVersionCheck when versionCheck is false", () => {
    recommendedSetup({ versionCheck: false });
    expect(startVersionCheck).not.toHaveBeenCalled();
  });

  it("returns a cleanup function", () => {
    const cleanup = recommendedSetup();
    expect(typeof cleanup).toBe("function");
  });

  it("cleanup calls stopVersionCheck", () => {
    const cleanup = recommendedSetup();
    cleanup();
    expect(stopVersionCheck).toHaveBeenCalledOnce();
  });

  it("cleanup calls stopVersionCheck even when versionCheck was false", () => {
    const cleanup = recommendedSetup({ versionCheck: false });
    cleanup();
    expect(stopVersionCheck).toHaveBeenCalledOnce();
  });

  it("accepts empty overrides object", () => {
    recommendedSetup({});
    expect(startVersionCheck).toHaveBeenCalledOnce();
  });

  it("accepts undefined overrides", () => {
    recommendedSetup();
    expect(startVersionCheck).toHaveBeenCalledOnce();
  });
});
