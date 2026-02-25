import { name } from "../../package.json";
import { CACHE_BUST_PARAM, RETRY_ATTEMPT_PARAM, RETRY_ID_PARAM } from "./constants";
import { emitEvent, getLogger, isDefaultRetryEnabled } from "./events/internal";
import { showFallbackUI } from "./fallbackRendering";
import { isInFallbackMode, resetFallbackMode, setFallbackMode } from "./fallbackState";
import {
  clearLastReloadTime,
  clearLastRetryResetInfo,
  getLastReloadTime,
  setLastReloadTime,
  setLastRetryResetInfo,
  shouldResetRetryCycle,
} from "./lastReloadTime";
import { getOptions } from "./options";
import { generateRetryId } from "./retryState";
import { sendBeacon } from "./sendBeacon";
import { shouldIgnoreMessages } from "./shouldIgnore";

const retryOrchestratorKey = Symbol.for(`${name}:retry-orchestrator`);

export type RetryPhase = "fallback" | "idle" | "scheduled";

export interface RetrySnapshot {
  attempt: number;
  lastSource?: string;
  lastTriggerTime?: number;
  phase: RetryPhase;
  retryId: null | string;
}

export interface TriggerInput {
  cacheBust?: boolean;
  error?: unknown;
  source?: string;
}

export type TriggerResult =
  | { reason: string; status: "deduped" }
  | { status: "accepted" }
  | { status: "fallback" }
  | { status: "internal-error" }
  | { status: "retry-disabled" };

interface OrchestratorState {
  attempt: number;
  lastSource?: string;
  lastTriggerTime?: number;
  phase: RetryPhase;
  retryId: null | string;
  timer: null | ReturnType<typeof setTimeout>;
}

const createFreshState = (): OrchestratorState => ({
  attempt: 0,
  lastSource: undefined,
  lastTriggerTime: undefined,
  phase: "idle",
  retryId: null,
  timer: null,
});

const getState = (): OrchestratorState => {
  if (globalThis.window === undefined) {
    return createFreshState();
  }
  const w = globalThis.window as any;
  if (!w[retryOrchestratorKey]) {
    w[retryOrchestratorKey] = createFreshState();
  }
  return w[retryOrchestratorKey] as OrchestratorState;
};

const setState = (updates: Partial<OrchestratorState>): void => {
  if (globalThis.window === undefined) {
    return;
  }
  const w = globalThis.window as any;
  if (!w[retryOrchestratorKey]) {
    w[retryOrchestratorKey] = createFreshState();
  }
  Object.assign(w[retryOrchestratorKey], updates);
};

const buildReloadUrl = (
  retryId: string,
  attempt: number,
  cacheBust?: boolean,
  includeRetryId = true,
): string => {
  const url = new URL(globalThis.window.location.href);
  if (includeRetryId) {
    url.searchParams.set(RETRY_ID_PARAM, retryId);
  }
  url.searchParams.set(RETRY_ATTEMPT_PARAM, String(attempt));
  if (cacheBust) {
    url.searchParams.set(CACHE_BUST_PARAM, String(Date.now()));
  }
  return url.toString();
};

const parseAttemptFromUrl = (): null | number => {
  try {
    const params = new URLSearchParams(globalThis.window.location.search);
    const raw = params.get(RETRY_ATTEMPT_PARAM);
    if (!raw) {
      return null;
    }
    // Strict parse: only accept non-negative integers (no sentinel -1)
    if (!/^\d+$/.test(raw)) {
      return null;
    }
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed) || !Number.isFinite(parsed) || parsed < 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const parseRetryIdFromUrl = (): null | string => {
  try {
    const params = new URLSearchParams(globalThis.window.location.search);
    return params.get(RETRY_ID_PARAM);
  } catch {
    return null;
  }
};

const clearRetryFromUrl = (): void => {
  try {
    const url = new URL(globalThis.window.location.href);
    url.searchParams.delete(RETRY_ID_PARAM);
    url.searchParams.delete(RETRY_ATTEMPT_PARAM);
    url.searchParams.delete(CACHE_BUST_PARAM);
    globalThis.window.history.replaceState(null, "", url.toString());
  } catch (error) {
    getLogger()?.error("clearRetryFromUrl failed", error);
  }
};

export const triggerRetry = (input: TriggerInput = {}): TriggerResult => {
  const state = getState();

  if (state.phase === "fallback" || isInFallbackMode()) {
    getLogger()?.fallbackAlreadyShown(input.error);
    return { status: "fallback" };
  }

  if (state.phase === "scheduled") {
    getLogger()?.reloadAlreadyScheduled(input.error);
    return { reason: "already-scheduled", status: "deduped" };
  }

  if (!isDefaultRetryEnabled()) {
    return { status: "retry-disabled" };
  }

  // Set phase early to prevent re-entrant triggers
  setState({ lastSource: input.source, lastTriggerTime: Date.now(), phase: "scheduled" });

  try {
    const options = getOptions();
    const reloadDelays = options.reloadDelays ?? [1000, 2000, 5000];
    const useRetryId = options.useRetryId ?? true;
    const enableRetryReset = options.enableRetryReset ?? true;
    const minTimeBetweenResets = options.minTimeBetweenResets ?? 5000;

    // Read URL state to restore attempt count after a reload
    const urlAttempt = parseAttemptFromUrl();
    const urlRetryId = parseRetryIdFromUrl();

    let currentAttempt = urlAttempt ?? 0;
    let retryId = useRetryId && urlRetryId ? urlRetryId : generateRetryId();

    getLogger()?.retryCycleStarting(retryId, currentAttempt);

    // Check whether the retry cycle should be reset due to enough time passing
    if (enableRetryReset && urlRetryId && urlAttempt !== null && urlAttempt > 0) {
      const retryStateForReset = { retryAttempt: urlAttempt, retryId: urlRetryId };
      if (shouldResetRetryCycle(retryStateForReset, reloadDelays, minTimeBetweenResets)) {
        const lastReload = getLastReloadTime();
        const timeSinceReload = lastReload ? Date.now() - lastReload.timestamp : 0;

        clearRetryFromUrl();
        clearLastReloadTime();
        setLastRetryResetInfo(urlRetryId);

        const errorMsg = String(input.error);
        emitEvent(
          {
            name: "retry-reset",
            previousAttempt: urlAttempt,
            previousRetryId: urlRetryId,
            timeSinceReload,
          },
          { silent: shouldIgnoreMessages([errorMsg]) },
        );

        currentAttempt = 0;
        retryId = generateRetryId();
      }
    }

    // Emit chunk-error after reset resolution so isRetrying reflects the final attempt count
    emitEvent({
      error: input.error,
      isRetrying: currentAttempt < reloadDelays.length,
      name: "chunk-error",
    });

    // Attempts exhausted — transition to fallback
    if (currentAttempt >= reloadDelays.length) {
      const errorMsg = String(input.error);
      emitEvent(
        {
          finalAttempt: currentAttempt,
          name: "retry-exhausted",
          retryId,
        },
        { silent: shouldIgnoreMessages([errorMsg]) },
      );

      sendBeacon({
        errorMessage: "Exceeded maximum reload attempts",
        eventName: "chunk_error_max_reloads",
        retryAttempt: currentAttempt,
        retryId,
        serialized: JSON.stringify({
          error: String(input.error),
          retryAttempt: currentAttempt,
          retryId,
        }),
      });

      setState({ attempt: currentAttempt, phase: "fallback", retryId });
      setFallbackMode();
      clearRetryFromUrl();
      showFallbackUI({ retryId });
      return { status: "fallback" };
    }

    const nextAttempt = currentAttempt + 1;
    const delay = reloadDelays[currentAttempt] ?? 1000;
    const errorMsg = String(input.error);

    emitEvent(
      {
        attempt: nextAttempt,
        delay,
        name: "retry-attempt",
        retryId,
      },
      { silent: shouldIgnoreMessages([errorMsg]) },
    );

    getLogger()?.retrySchedulingReload(retryId, nextAttempt, delay);

    setState({ attempt: nextAttempt, retryId });

    const timer = setTimeout(() => {
      try {
        if (useRetryId && enableRetryReset) {
          setLastReloadTime(retryId, nextAttempt);
        }
        const reloadUrl = buildReloadUrl(retryId, nextAttempt, input.cacheBust, useRetryId);
        globalThis.window.location.href = reloadUrl;
      } catch (navError) {
        getLogger()?.error("triggerRetry navigation failed", navError);
        setState({ phase: "idle" });
      }
    }, delay);

    setState({ timer });

    return { status: "accepted" };
  } catch (error) {
    getLogger()?.error("triggerRetry internal error", error);
    setState({ lastSource: undefined, lastTriggerTime: undefined, phase: "idle" });
    return { status: "internal-error" };
  }
};

export const markRetryHealthyBoot = (): void => {
  const state = getState();
  if (state.timer !== null) {
    clearTimeout(state.timer);
  }
  clearRetryFromUrl();
  clearLastReloadTime();
  clearLastRetryResetInfo();
  setState(createFreshState());
  resetFallbackMode();
};

export const getRetrySnapshot = (): RetrySnapshot => {
  const state = getState();
  return {
    attempt: state.attempt,
    lastSource: state.lastSource,
    lastTriggerTime: state.lastTriggerTime,
    phase: state.phase,
    retryId: state.retryId,
  };
};

/**
 * Sets orchestrator state to fallback and renders the fallback UI.
 * For use in debug/simulation contexts only — bypasses retry scheduling
 * while keeping the orchestrator snapshot consistent with fallback mode.
 */
export const setFallbackStateForDebug = (): void => {
  const state = getState();
  if (state.timer !== null) {
    clearTimeout(state.timer);
  }
  setState({ phase: "fallback", timer: null });
  setFallbackMode();
  showFallbackUI({ retryId: state.retryId ?? undefined });
};

export const resetRetryOrchestratorForTests = (): void => {
  const state = getState();
  if (state.timer !== null) {
    clearTimeout(state.timer);
  }
  if (globalThis.window !== undefined) {
    (globalThis.window as any)[retryOrchestratorKey] = createFreshState();
  }
  resetFallbackMode();
};
