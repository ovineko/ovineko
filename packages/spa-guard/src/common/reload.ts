import { RETRY_ATTEMPT_PARAM, RETRY_ID_PARAM } from "./constants";
import { logMessage } from "./log";
import { getOptions } from "./options";
import { sendBeacon } from "./sendBeacon";

interface RetryState {
  retryAttempt: number;
  retryId: string;
}

const getRetryStateFromUrl = (): null | RetryState => {
  try {
    const params = new URLSearchParams(window.location.search);
    const retryId = params.get(RETRY_ID_PARAM);
    const retryAttempt = params.get(RETRY_ATTEMPT_PARAM);

    if (retryId && retryAttempt) {
      return {
        retryAttempt: parseInt(retryAttempt, 10),
        retryId,
      };
    }
    return null;
  } catch {
    return null;
  }
};

const generateRetryId = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const array = new Uint32Array(2);
    crypto.getRandomValues(array);
    return `${Date.now()}-${array[0]!.toString(36)}${array[1]!.toString(36)}`;
  }

  // eslint-disable-next-line sonarjs/pseudo-random -- Last resort fallback for insecure contexts (HTTP) where crypto is unavailable
  return `${Date.now()}-${Math.random().toString(36).slice(2, 15)}`;
};

const buildReloadUrl = (retryId: string, retryAttempt: number): string => {
  const url = new URL(window.location.href);
  url.searchParams.set(RETRY_ID_PARAM, retryId);
  url.searchParams.set(RETRY_ATTEMPT_PARAM, String(retryAttempt));
  return url.toString();
};

export const attemptReload = (error: unknown): void => {
  const options = getOptions();
  const reloadDelays = options.reloadDelays ?? [1000, 2000, 5000];
  const useRetryId = options.useRetryId ?? true;

  const retryState = useRetryId ? getRetryStateFromUrl() : null;

  const currentAttempt = retryState ? retryState.retryAttempt : 0;

  if (currentAttempt >= reloadDelays.length) {
    console.error(logMessage("All reload attempts exhausted"), error);

    sendBeacon({
      errorMessage: "Exceeded maximum reload attempts",
      eventName: "chunk_error_max_reloads",
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
  const retryId = retryState?.retryId ?? generateRetryId();
  const delay = reloadDelays[currentAttempt];

  console.warn(
    logMessage(
      `Reload attempt ${nextAttempt}/${reloadDelays.length} in ${delay}ms (retryId: ${retryId})`,
    ),
    error,
  );

  setTimeout(() => {
    if (useRetryId) {
      const reloadUrl = buildReloadUrl(retryId, nextAttempt);
      window.location.href = reloadUrl;
    } else {
      window.location.reload();
    }
  }, delay);
};

const showFallbackUI = (): void => {
  const options = getOptions();
  const fallbackHtml = options.fallbackHtml;

  if (!fallbackHtml) {
    console.error(logMessage("No fallback UI configured"));
    return;
  }

  try {
    document.body.innerHTML = fallbackHtml;
  } catch (error) {
    console.error(logMessage("Failed to inject fallback UI"), error);
  }
};
