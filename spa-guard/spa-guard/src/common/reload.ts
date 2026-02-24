import { RETRY_ATTEMPT_PARAM, RETRY_ID_PARAM } from "./constants";
import { emitEvent, getLogger, isDefaultRetryEnabled } from "./events/internal";
import { applyI18n, getI18n } from "./i18n";
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

/** @internal */
export const resetReloadScheduled = (): void => {
  reloadScheduled = false;
};

export const attemptReload = (error: unknown): void => {
  if (reloadScheduled) {
    getLogger()?.reloadAlreadyScheduled(error);
    return;
  }

  // Set early to prevent re-entrant calls from synchronous event subscribers
  reloadScheduled = true;

  try {
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
      reloadScheduled = false;
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
      reloadScheduled = false;
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

      reloadScheduled = false;
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

    getLogger()?.retrySchedulingReload(retryId, nextAttempt, delay);

    showLoadingUI(nextAttempt);

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
  } catch {
    reloadScheduled = false;
  }
};

const showLoadingUI = (attempt: number): void => {
  const options = getOptions();
  const loadingHtml = options.html?.loading?.content;
  const selector = options.html?.fallback?.selector ?? "body";

  if (!loadingHtml) {
    return;
  }

  try {
    const targetElement = document.querySelector(selector);
    if (!targetElement) {
      return;
    }

    const container = document.createElement("div");
    container.innerHTML = loadingHtml;

    const spinnerEl = container.querySelector("[data-spa-guard-spinner]");
    if (spinnerEl) {
      if (options.spinner?.disabled) {
        spinnerEl.remove();
      } else if (options.spinner?.content) {
        spinnerEl.innerHTML = options.spinner.content;
      }
    }

    const retryingSection = container.querySelector<HTMLElement>(
      '[data-spa-guard-section="retrying"]',
    );
    if (retryingSection) {
      retryingSection.style.display = "block";
    }

    const attemptEl = container.querySelector('[data-spa-guard-content="attempt"]');
    if (attemptEl) {
      attemptEl.textContent = String(attempt);
    }

    const t = getI18n();
    if (t) {
      applyI18n(container, t);
    }

    targetElement.innerHTML = container.innerHTML;
  } catch {
    // Silently fail — loading UI is best-effort
  }
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
    const container = document.createElement("div");
    container.innerHTML = fallbackHtml;

    const t = getI18n();
    if (t) {
      applyI18n(container, t);
    }

    targetElement.innerHTML = container.innerHTML;

    const useRetryId = options.useRetryId ?? true;
    const retryState = getRetryStateFromUrl();
    if (retryState && retryState.retryAttempt === -1) {
      getLogger()?.clearingRetryState();
      clearRetryStateFromUrl();
    } else if (!useRetryId && !retryState) {
      clearRetryAttemptFromUrl();
    }

    const reloadBtn = targetElement.querySelector('[data-spa-guard-action="reload"]');
    if (reloadBtn) {
      reloadBtn.addEventListener("click", () => location.reload());
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
