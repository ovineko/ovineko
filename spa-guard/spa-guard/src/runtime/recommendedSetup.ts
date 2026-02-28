import { startVersionCheck, stopVersionCheck } from "../common/checkVersion";
import { getOptions } from "../common/options";
import { getRetrySnapshot, markRetryHealthyBoot } from "../common/retryOrchestrator";
import { getRetryAttemptFromUrl } from "../common/retryState";
import { dismissSpinner } from "../common/spinner";

const AUTO_HEALTHY_BOOT_BUFFER_MS = 1000;
const MIN_HEALTHY_BOOT_GRACE_MS = 5000;
const setupStateWindowKey = "__spa_guard_runtime_recommended_setup_state__";

export interface RecommendedSetupOptions {
  /**
   * Healthy boot handling strategy.
   *
   * - `"auto"` (default): if retry URL params are present, mark healthy boot
   *   after a grace period and only when orchestrator is still idle.
   * - `"manual"`: never auto-mark; call `markRetryHealthyBoot()` yourself.
   * - `"off"` / `false`: disable healthy boot handling.
   */
  healthyBoot?: RecommendedSetupHealthyBoot;
  /**
   * Whether to start version checking.
   * @default true
   */
  versionCheck?: boolean;
}

interface HealthyBootAutoConfig {
  /**
   * Delay before auto-marking healthy boot when retry params are present in URL.
   * @default dynamic:
   * max(5000, max(reloadDelays)+1000, sum(lazyRetry.retryDelays)+1000)
   */
  graceMs?: number;
  /**
   * Explicit mode for object config.
   * @default "auto"
   */
  mode?: "auto";
}

type RecommendedSetupHealthyBoot = "auto" | "manual" | "off" | false | HealthyBootAutoConfig;

interface ResolvedSetupOptions {
  healthyBootGraceMs: number;
  healthyBootMode: "auto" | "manual" | "off";
  versionCheck: boolean;
}

interface SetupState {
  cleanup: () => void;
  initialized: boolean;
  timer: null | ReturnType<typeof setTimeout>;
  versionCheckEnabled: boolean;
}

const createFreshState = (): SetupState => ({
  cleanup: () => {
    // no-op
  },
  initialized: false,
  timer: null,
  versionCheckEnabled: false,
});

const getState = (): SetupState => {
  if (globalThis.window === undefined) {
    return createFreshState();
  }

  const w = globalThis.window as any;
  if (!w[setupStateWindowKey]) {
    w[setupStateWindowKey] = createFreshState();
  }
  return w[setupStateWindowKey] as SetupState;
};

const resolveOptions = (overrides?: RecommendedSetupOptions): ResolvedSetupOptions => {
  const healthyBoot = overrides?.healthyBoot;
  const versionCheck = overrides?.versionCheck ?? true;
  const computedGraceMs = computeAutoHealthyBootGraceMs();

  if (healthyBoot === false || healthyBoot === "off") {
    return {
      healthyBootGraceMs: computedGraceMs,
      healthyBootMode: "off",
      versionCheck,
    };
  }

  if (healthyBoot === "manual") {
    return {
      healthyBootGraceMs: computedGraceMs,
      healthyBootMode: "manual",
      versionCheck,
    };
  }

  if (healthyBoot && typeof healthyBoot === "object") {
    return {
      healthyBootGraceMs: Math.max(computedGraceMs, healthyBoot.graceMs ?? computedGraceMs),
      healthyBootMode: "auto",
      versionCheck,
    };
  }

  return {
    healthyBootGraceMs: computedGraceMs,
    healthyBootMode: "auto",
    versionCheck,
  };
};

const computeAutoHealthyBootGraceMs = (): number => {
  const options = getOptions();
  const reloadDelays = options.reloadDelays ?? [1000, 2000, 5000];
  const lazyRetryDelays = options.lazyRetry?.retryDelays ?? [1000, 2000];

  const maxReloadDelay = Math.max(...reloadDelays, 0);
  const lazyRetryTotalDelay = lazyRetryDelays.reduce((acc, delay) => acc + delay, 0);

  return Math.max(
    MIN_HEALTHY_BOOT_GRACE_MS,
    maxReloadDelay + AUTO_HEALTHY_BOOT_BUFFER_MS,
    lazyRetryTotalDelay + AUTO_HEALTHY_BOOT_BUFFER_MS,
  );
};

const scheduleAutoHealthyBoot = (graceMs: number): null | ReturnType<typeof setTimeout> => {
  if (globalThis.window === undefined) {
    return null;
  }

  if (getRetryAttemptFromUrl() === null) {
    return null;
  }

  return setTimeout(() => {
    if (getRetryAttemptFromUrl() === null) {
      return;
    }

    const snapshot = getRetrySnapshot();
    if (snapshot.phase !== "idle") {
      return;
    }

    markRetryHealthyBoot();
  }, graceMs);
};

/**
 * Enable recommended runtime features with sensible defaults.
 * Returns a cleanup function that tears down all started features.
 */
export const recommendedSetup = (overrides?: RecommendedSetupOptions): (() => void) => {
  const state = getState();
  if (state.initialized) {
    return state.cleanup;
  }

  dismissSpinner();
  const options = resolveOptions(overrides);

  if (options.versionCheck) {
    startVersionCheck();
  }

  const timer =
    options.healthyBootMode === "auto" ? scheduleAutoHealthyBoot(options.healthyBootGraceMs) : null;

  const cleanup = () => {
    const currentState = getState();
    if (!currentState.initialized) {
      return;
    }

    if (currentState.timer !== null) {
      clearTimeout(currentState.timer);
    }

    if (currentState.versionCheckEnabled) {
      stopVersionCheck();
    }

    if (globalThis.window !== undefined) {
      (globalThis.window as any)[setupStateWindowKey] = createFreshState();
    }
  };

  Object.assign(state, {
    cleanup,
    initialized: true,
    timer,
    versionCheckEnabled: options.versionCheck,
  } satisfies Partial<SetupState>);

  return cleanup;
};
