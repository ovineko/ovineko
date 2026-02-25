import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../common/checkVersion", () => ({
  startVersionCheck: vi.fn(),
  stopVersionCheck: vi.fn(),
}));

vi.mock("../common/options", () => ({
  getOptions: vi.fn(() => ({
    lazyRetry: { retryDelays: [1000, 2000] },
    reloadDelays: [1000, 2000, 5000],
  })),
}));

vi.mock("../common/spinner", () => ({
  dismissSpinner: vi.fn(),
}));

vi.mock("../common/retryOrchestrator", () => ({
  getRetrySnapshot: vi.fn(() => ({ phase: "idle" })),
  markRetryHealthyBoot: vi.fn(),
}));

vi.mock("../common/retryState", () => ({
  getRetryAttemptFromUrl: vi.fn(() => null),
}));

import { startVersionCheck, stopVersionCheck } from "../common/checkVersion";
import { getOptions } from "../common/options";
import { getRetrySnapshot, markRetryHealthyBoot } from "../common/retryOrchestrator";
import { getRetryAttemptFromUrl } from "../common/retryState";
import { dismissSpinner } from "../common/spinner";
import { recommendedSetup } from "./recommendedSetup";

const setupStateWindowKey = "__spa_guard_runtime_recommended_setup_state__";

describe("recommendedSetup", () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    if (globalThis.window !== undefined) {
      delete (globalThis.window as any)[setupStateWindowKey];
    }
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("calls startVersionCheck by default", () => {
    cleanup = recommendedSetup();
    expect(startVersionCheck).toHaveBeenCalledOnce();
  });

  it("does not call startVersionCheck when versionCheck is false", () => {
    cleanup = recommendedSetup({ versionCheck: false });
    expect(startVersionCheck).not.toHaveBeenCalled();
  });

  it("calls dismissSpinner at setup", () => {
    cleanup = recommendedSetup();
    expect(dismissSpinner).toHaveBeenCalledOnce();
  });

  it("is idempotent: repeated setup does not re-run side effects", () => {
    const cleanup1 = recommendedSetup();
    const cleanup2 = recommendedSetup();
    cleanup = cleanup1;

    expect(cleanup2).toBe(cleanup1);
    expect(dismissSpinner).toHaveBeenCalledOnce();
    expect(startVersionCheck).toHaveBeenCalledOnce();
  });

  it("cleanup calls stopVersionCheck once", () => {
    cleanup = recommendedSetup();
    cleanup();
    cleanup = undefined;

    expect(stopVersionCheck).toHaveBeenCalledOnce();
  });

  it("cleanup is idempotent", () => {
    cleanup = recommendedSetup();
    cleanup();
    cleanup();
    cleanup = undefined;

    expect(stopVersionCheck).toHaveBeenCalledOnce();
  });

  it("supports re-initialization after cleanup", () => {
    cleanup = recommendedSetup();
    cleanup();

    cleanup = recommendedSetup();
    expect(startVersionCheck).toHaveBeenCalledTimes(2);
  });

  it("does not schedule auto healthy boot when retry params are absent", () => {
    vi.useFakeTimers();
    vi.mocked(getRetryAttemptFromUrl).mockReturnValue(null);

    cleanup = recommendedSetup();
    vi.advanceTimersByTime(60_000);

    expect(markRetryHealthyBoot).not.toHaveBeenCalled();
  });

  it("auto-marks healthy boot by default when retry params exist and phase is idle", () => {
    vi.useFakeTimers();
    vi.mocked(getRetryAttemptFromUrl).mockReturnValue(2);
    vi.mocked(getRetrySnapshot).mockReturnValue({
      attempt: 0,
      lastSource: undefined,
      lastTriggerTime: undefined,
      phase: "idle",
      retryId: "rid",
    });

    cleanup = recommendedSetup();
    vi.advanceTimersByTime(5999);
    expect(markRetryHealthyBoot).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(markRetryHealthyBoot).toHaveBeenCalledOnce();
  });

  it("does not auto-mark when orchestrator phase is scheduled", () => {
    vi.useFakeTimers();
    vi.mocked(getRetryAttemptFromUrl).mockReturnValue(2);
    vi.mocked(getRetrySnapshot).mockReturnValue({
      attempt: 1,
      lastSource: "chunk-error",
      lastTriggerTime: Date.now(),
      phase: "scheduled",
      retryId: "rid",
    });

    cleanup = recommendedSetup();
    vi.advanceTimersByTime(6000);

    expect(markRetryHealthyBoot).not.toHaveBeenCalled();
  });

  it("does not auto-mark when healthyBoot is manual", () => {
    vi.useFakeTimers();
    vi.mocked(getRetryAttemptFromUrl).mockReturnValue(2);

    cleanup = recommendedSetup({ healthyBoot: "manual" });
    vi.advanceTimersByTime(60_000);

    expect(markRetryHealthyBoot).not.toHaveBeenCalled();
  });

  it("does not auto-mark when healthyBoot is off", () => {
    vi.useFakeTimers();
    vi.mocked(getRetryAttemptFromUrl).mockReturnValue(2);

    cleanup = recommendedSetup({ healthyBoot: "off" });
    vi.advanceTimersByTime(60_000);

    expect(markRetryHealthyBoot).not.toHaveBeenCalled();
  });

  it("supports custom auto healthy boot graceMs", () => {
    vi.useFakeTimers();
    vi.mocked(getRetryAttemptFromUrl).mockReturnValue(1);
    vi.mocked(getRetrySnapshot).mockReturnValue({
      attempt: 0,
      lastSource: undefined,
      lastTriggerTime: undefined,
      phase: "idle",
      retryId: "rid",
    });

    cleanup = recommendedSetup({ healthyBoot: { graceMs: 250 } });

    vi.advanceTimersByTime(5999);
    expect(markRetryHealthyBoot).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(markRetryHealthyBoot).toHaveBeenCalledOnce();
  });

  it("uses max(reloadDelays)+buffer when reload delay is larger than minimum", () => {
    vi.useFakeTimers();
    vi.mocked(getRetryAttemptFromUrl).mockReturnValue(1);
    vi.mocked(getOptions).mockReturnValue({
      lazyRetry: { retryDelays: [1000, 2000] },
      reloadDelays: [1000, 2000, 7000],
    } as ReturnType<typeof getOptions>);

    cleanup = recommendedSetup();
    vi.advanceTimersByTime(7999);
    expect(markRetryHealthyBoot).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(markRetryHealthyBoot).toHaveBeenCalledOnce();
  });

  it("uses sum(lazyRetry.retryDelays)+buffer when lazy retry total is larger", () => {
    vi.useFakeTimers();
    vi.mocked(getRetryAttemptFromUrl).mockReturnValue(1);
    vi.mocked(getOptions).mockReturnValue({
      lazyRetry: { retryDelays: [3000, 3000, 3000] },
      reloadDelays: [1000, 2000, 5000],
    } as ReturnType<typeof getOptions>);

    cleanup = recommendedSetup();
    vi.advanceTimersByTime(9999);
    expect(markRetryHealthyBoot).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(markRetryHealthyBoot).toHaveBeenCalledOnce();
  });

  it("cleanup cancels pending auto healthy boot timer", () => {
    vi.useFakeTimers();
    vi.mocked(getRetryAttemptFromUrl).mockReturnValue(1);

    cleanup = recommendedSetup();
    cleanup();
    cleanup = undefined;
    vi.advanceTimersByTime(60_000);

    expect(markRetryHealthyBoot).not.toHaveBeenCalled();
  });
});
