import { RETRY_ATTEMPT_PARAM, RETRY_ID_PARAM } from "./constants";
import { emitEvent, getLogger, isDefaultRetryEnabled } from "./events/internal";
import {
  clearLastReloadTime,
  getLastReloadTime,
  setLastReloadTime,
  setLastRetryResetInfo,
  shouldResetRetryCycle,
} from "./lastReloadTime";
import { getOptions } from "./options";
import {
  clearRetryAttemptFromUrl,
  clearRetryStateFromUrl,
  generateRetryId,
  getRetryAttemptFromUrl,
  getRetryStateFromUrl,
} from "./retryState";
import { sendBeacon } from "./sendBeacon";
import { shouldIgnoreMessages } from "./shouldIgnore";

const buildReloadUrl = (retryId: string, retryAttempt: number): string => {
  const url = new URL(globalThis.window.location.href);
  url.searchParams.set(RETRY_ID_PARAM, retryId);
  url.searchParams.set(RETRY_ATTEMPT_PARAM, String(retryAttempt));
  return url.toString();
};

const buildReloadUrlAttemptOnly = (retryAttempt: number): string => {
  const url = new URL(globalThis.window.location.href);
  url.searchParams.set(RETRY_ATTEMPT_PARAM, String(retryAttempt));
  return url.toString();
};

let reloadScheduled = false;

/** @internal Reset for testing only */
export const resetReloadScheduled = (): void => {
  reloadScheduled = false;
};

export const attemptReload = (error: unknown): void => {
  if (reloadScheduled) {
    getLogger()?.reloadAlreadyScheduled(error);
    return;
  }
  const options = getOptions();
  const reloadDelays = options.reloadDelays ?? [1000, 2000, 5000];
  const useRetryId = options.useRetryId ?? true;
  const enableRetryReset = options.enableRetryReset ?? true;
  const minTimeBetweenResets = options.minTimeBetweenResets ?? 5000;

  let retryState;
  if (useRetryId) {
    retryState = getRetryStateFromUrl();
  } else {
    const attempt = getRetryAttemptFromUrl();
    retryState = attempt === null ? null : { retryAttempt: attempt, retryId: generateRetryId() };
  }

  let currentAttempt = retryState ? retryState.retryAttempt : 0;
  let retryId = retryState?.retryId ?? generateRetryId();

  getLogger()?.retryCycleStarting(retryId, currentAttempt);

  const retryEnabled = isDefaultRetryEnabled();

  emitEvent({
    error,
    isRetrying: retryEnabled && currentAttempt >= 0 && currentAttempt < reloadDelays.length,
    name: "chunk-error",
  });

  if (!retryEnabled) {
    return;
  }

  if (
    enableRetryReset &&
    retryState &&
    retryState.retryAttempt > 0 &&
    shouldResetRetryCycle(retryState, reloadDelays, minTimeBetweenResets)
  ) {
    const lastReload = getLastReloadTime();
    const timeSinceReload = lastReload ? Date.now() - lastReload.timestamp : 0;

    clearRetryStateFromUrl();
    clearLastReloadTime();
    setLastRetryResetInfo(retryState.retryId);

    const errorMsg = String(error);

    emitEvent(
      {
        name: "retry-reset",
        previousAttempt: retryState.retryAttempt,
        previousRetryId: retryState.retryId,
        timeSinceReload,
      },
      { silent: shouldIgnoreMessages([errorMsg]) },
    );

    currentAttempt = 0;
    retryId = generateRetryId();
  }

  if (currentAttempt === -1) {
    const errorMsg = String(error);
    if (!shouldIgnoreMessages([errorMsg])) {
      getLogger()?.fallbackAlreadyShown(error);
    }
    showFallbackUI();
    return;
  }

  if (currentAttempt >= reloadDelays.length) {
    const errorMsg = String(error);

    emitEvent(
      {
        finalAttempt: currentAttempt,
        name: "retry-exhausted",
        retryId: retryState?.retryId ?? "",
      },
      { silent: shouldIgnoreMessages([errorMsg]) },
    );

    sendBeacon({
      errorMessage: "Exceeded maximum reload attempts",
      eventName: "chunk_error_max_reloads",
      retryAttempt: currentAttempt,
      retryId: retryState?.retryId,
      serialized: JSON.stringify({
        error: String(error),
        retryAttempt: currentAttempt,
        retryId: retryState?.retryId,
      }),
    });

    if (!useRetryId) {
      clearRetryAttemptFromUrl();
    }

    showFallbackUI();
    return;
  }

  const nextAttempt = currentAttempt + 1;
  const delay = reloadDelays[currentAttempt] ?? 1000;

  const errorMsg = String(error);

  emitEvent(
    {
      attempt: nextAttempt,
      delay,
      name: "retry-attempt",
      retryId,
    },
    { silent: shouldIgnoreMessages([errorMsg]) },
  );

  reloadScheduled = true;
  getLogger()?.retrySchedulingReload(retryId, nextAttempt, delay);

  setTimeout(() => {
    if (useRetryId && enableRetryReset) {
      setLastReloadTime(retryId, nextAttempt);
    }

    if (useRetryId) {
      const reloadUrl = buildReloadUrl(retryId, nextAttempt);
      globalThis.window.location.href = reloadUrl;
    } else {
      globalThis.window.location.href = buildReloadUrlAttemptOnly(nextAttempt);
    }
  }, delay);
};

const showFallbackUI = (): void => {
  const options = getOptions();
  const fallbackHtml = options.html?.fallback?.content;
  const selector = options.html?.fallback?.selector ?? "body";

  if (!fallbackHtml) {
    getLogger()?.noFallbackConfigured();
    return;
  }

  try {
    const targetElement = document.querySelector(selector);
    if (!targetElement) {
      getLogger()?.fallbackTargetNotFound(selector);
      return;
    }
    targetElement.innerHTML = fallbackHtml;

    const useRetryId = options.useRetryId ?? true;
    const retryState = getRetryStateFromUrl();
    if (retryState && retryState.retryAttempt === -1) {
      getLogger()?.clearingRetryState();
      clearRetryStateFromUrl();
    } else if (!useRetryId && !retryState) {
      clearRetryAttemptFromUrl();
    }

    if (retryState) {
      const retryIdElements = document.getElementsByClassName("spa-guard-retry-id");
      for (const element of retryIdElements) {
        element.textContent = retryState.retryId;
      }
    }

    emitEvent({
      name: "fallback-ui-shown",
    });
  } catch (error) {
    getLogger()?.fallbackInjectFailed(error);
  }
};
