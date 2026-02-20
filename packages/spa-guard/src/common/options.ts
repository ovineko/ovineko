import { optionsWindowKey } from "./constants";
import { defaultFallbackHtml } from "./fallbackHtml.generated";

export { optionsWindowKey } from "./constants";

const defaultOptions: Options = {
  enableRetryReset: true,
  fallback: {
    html: defaultFallbackHtml,
    selector: "body",
  },
  ignoredErrors: [],
  lazyRetry: {
    callReloadOnFailure: true,
    retryDelays: [1000, 2000],
  },
  minTimeBetweenResets: 5000,
  reloadDelays: [1000, 2000, 5000],
  useRetryId: true,
};

export interface Options {
  /**
   * Enable automatic retry cycle reset when enough time has passed
   * since the last reload. When true, if the user stays on a page longer
   * than the retry delay, the next error will start a fresh retry cycle.
   * @default true
   */
  enableRetryReset?: boolean;

  fallback?: {
    /**
     * Custom HTML to display when all reload attempts are exhausted
     */
    html?: string;
    /**
     * CSS selector where the fallback HTML should be injected
     * @default "body"
     */
    selector?: string;
  };

  /**
   * List of error message substrings to ignore and not report.
   * If error message contains any of these strings, it will be filtered out.
   * @default []
   */
  ignoredErrors?: string[];

  /**
   * Options for the lazyWithRetry module-level retry logic.
   * Controls retry behaviour for dynamic imports before falling back to a full page reload.
   */
  lazyRetry?: {
    /**
     * Call attemptReload() after all retry attempts for dynamic imports are exhausted.
     * If true, triggers page reload logic after all retryDelays fail.
     * If false, only throws the error to the error boundary without a reload.
     * @default true
     */
    callReloadOnFailure?: boolean;

    /**
     * Array of delays in milliseconds for dynamic import retry attempts.
     * Each element represents one retry attempt with the given delay.
     * The number of elements determines the total number of retry attempts.
     * @default [1000, 2000]
     * @example [500, 1500, 3000] // 3 attempts: 500ms, 1.5s, 3s
     */
    retryDelays?: number[];
  };

  /**
   * Minimum time in milliseconds between retry cycle resets.
   * Prevents infinite reset loops by ensuring a reset can only happen
   * if the previous reset was at least this many milliseconds ago.
   * @default 5000 (5 seconds)
   */
  minTimeBetweenResets?: number;

  /** @default [1000, 2000, 5000] */
  reloadDelays?: number[];

  reportBeacon?: {
    endpoint?: string;
  };

  /** @default true */
  useRetryId?: boolean;
}

export const getOptions = (): Options => {
  const windowOptions = (globalThis.window as any)?.[optionsWindowKey] as Options | undefined;

  return {
    ...defaultOptions,
    ...windowOptions,
    fallback: {
      ...defaultOptions.fallback,
      ...windowOptions?.fallback,
    },
    lazyRetry: {
      ...defaultOptions.lazyRetry,
      ...windowOptions?.lazyRetry,
    },
    reportBeacon: {
      ...defaultOptions.reportBeacon,
      ...windowOptions?.reportBeacon,
    },
  };
};
