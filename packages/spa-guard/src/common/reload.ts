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
  clearRetryStateFromUrl,
  generateRetryId,
  getRetryStateFromUrl,
  updateRetryStateInUrl,
} from "./retryState";
import { sendBeacon } from "./sendBeacon";
import { shouldIgnoreMessages } from "./shouldIgnore";

const buildReloadUrl = (retryId: string, retryAttempt: number): string => {
  const url = new URL(globalThis.window.location.href);
  url.searchParams.set(RETRY_ID_PARAM, retryId);
  url.searchParams.set(RETRY_ATTEMPT_PARAM, String(retryAttempt));
  return url.toString();
};

export const attemptReload = (error: unknown): void => {
  const options = getOptions();
  const reloadDelays = options.reloadDelays ?? [1000, 2000, 5000];
  const useRetryId = options.useRetryId ?? true;
  const enableRetryReset = options.enableRetryReset ?? true;
  const minTimeBetweenResets = options.minTimeBetweenResets ?? 5000;

  const retryState = useRetryId ? getRetryStateFromUrl() : null;

  let currentAttempt = retryState ? retryState.retryAttempt : 0;
  let retryId = retryState?.retryId ?? generateRetryId();

  const retryEnabled = isDefaultRetryEnabled();

  emitEvent({
    error,
    isRetrying: retryEnabled && currentAttempt < reloadDelays.length,
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

  setTimeout(() => {
    if (useRetryId && enableRetryReset) {
      setLastReloadTime(retryId, nextAttempt);
    }

    if (useRetryId) {
      const reloadUrl = buildReloadUrl(retryId, nextAttempt);
      globalThis.window.location.href = reloadUrl;
    } else {
      globalThis.window.location.reload();
    }
  }, delay);
};

const showFallbackUI = (): void => {
  const options = getOptions();
  const fallbackHtml = options.fallback?.html;
  const selector = options.fallback?.selector ?? "body";

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

    const retryState = getRetryStateFromUrl();
    if (retryState && retryState.retryAttempt === -1) {
      getLogger()?.clearingRetryState();
      clearRetryStateFromUrl();

      const retryIdElements = document.getElementsByClassName("spa-guard-retry-id");
      for (const element of retryIdElements) {
        element.textContent = retryState.retryId;
      }
    } else if (retryState) {
      updateRetryStateInUrl(retryState.retryId, retryState.retryAttempt + 1);
      getLogger()?.updatedRetryAttempt(retryState.retryAttempt + 1);

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
