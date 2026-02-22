import { RETRY_ATTEMPT_PARAM, RETRY_ID_PARAM } from "./constants";

export interface RetryState {
  retryAttempt: number;
  retryId: string;
}

export const getRetryStateFromUrl = (): null | RetryState => {
  try {
    const params = new URLSearchParams(globalThis.window.location.search);
    const retryId = params.get(RETRY_ID_PARAM);
    const retryAttempt = params.get(RETRY_ATTEMPT_PARAM);

    if (retryId && retryAttempt) {
      const parsed = parseInt(retryAttempt, 10);
      if (Number.isNaN(parsed)) {
        return null;
      }
      return {
        retryAttempt: parsed,
        retryId,
      };
    }
    return null;
  } catch {
    return null;
  }
};

export const clearRetryStateFromUrl = (): void => {
  try {
    const url = new URL(globalThis.window.location.href);
    url.searchParams.delete(RETRY_ID_PARAM);
    url.searchParams.delete(RETRY_ATTEMPT_PARAM);
    globalThis.window.history.replaceState(null, "", url.toString());
  } catch {}
};

export const updateRetryStateInUrl = (retryId: string, retryAttempt: number): void => {
  try {
    const url = new URL(globalThis.window.location.href);
    url.searchParams.set(RETRY_ID_PARAM, retryId);
    url.searchParams.set(RETRY_ATTEMPT_PARAM, String(retryAttempt));
    globalThis.window.history.replaceState(null, "", url.toString());
  } catch {}
};

export const generateRetryId = (): string => {
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

export const getRetryAttemptFromUrl = (): null | number => {
  try {
    const params = new URLSearchParams(globalThis.window.location.search);
    const retryAttempt = params.get(RETRY_ATTEMPT_PARAM);

    if (retryAttempt) {
      const parsed = parseInt(retryAttempt, 10);
      if (Number.isNaN(parsed)) {
        return null;
      }
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

export const clearRetryAttemptFromUrl = (): void => {
  try {
    const url = new URL(globalThis.window.location.href);
    url.searchParams.delete(RETRY_ATTEMPT_PARAM);
    globalThis.window.history.replaceState(null, "", url.toString());
  } catch {}
};

export const getRetryInfoForBeacon = (): { retryAttempt?: number; retryId?: string } => {
  const retryState = getRetryStateFromUrl();
  if (!retryState) {
    return {};
  }
  return {
    retryAttempt: retryState.retryAttempt,
    retryId: retryState.retryId,
  };
};
