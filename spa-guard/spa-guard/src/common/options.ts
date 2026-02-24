import { optionsWindowKey } from "./constants";
import { defaultErrorFallbackHtml, defaultLoadingFallbackHtml } from "./html.generated";

export { optionsWindowKey } from "./constants";

const defaultOptions: Options = {
  checkVersion: {
    interval: 300_000,
    mode: "html",
    onUpdate: "reload",
  },
  enableRetryReset: true,
  errors: {
    forceRetry: [],
    ignore: [],
  },
  handleUnhandledRejections: {
    retry: true,
    sendBeacon: true,
  },
  html: {
    fallback: {
      content: defaultErrorFallbackHtml,
      selector: "body",
    },
    loading: {
      content: defaultLoadingFallbackHtml,
    },
  },
  lazyRetry: {
    callReloadOnFailure: true,
    retryDelays: [1000, 2000],
  },
  minTimeBetweenResets: 5000,
  reloadDelays: [1000, 2000, 5000],
  spinner: {
    background: "#fff",
    disabled: false,
  },
  useRetryId: true,
};

export interface Options {
  /**
   * Application name for beacon source identification.
   * Useful in monorepo setups to identify which app sent the beacon.
   */
  appName?: string;

  /**
   * Configuration for proactive version checking to detect new deployments.
   * When configured with a `version`, periodically polls to detect version changes
   * and dispatches a `spa-guard:version-change` CustomEvent on the window.
   */
  checkVersion?: {
    /**
     * Endpoint URL for JSON mode version checking.
     * Required when mode is "json".
     */
    endpoint?: string;
    /**
     * Polling interval in milliseconds.
     * @default 300000
     */
    interval?: number;
    /**
     * Detection mode.
     * - "html": Re-fetches the current page and parses the injected version from the HTML.
     * - "json": Fetches a dedicated JSON endpoint.
     * @default "html"
     */
    mode?: "html" | "json";
    /**
     * Behavior when a version change is detected.
     * - "reload": Automatically calls location.reload() after dispatching the event.
     * - "event": Only dispatches the spa-guard:version-change CustomEvent (no reload).
     * @default "reload"
     */
    onUpdate?: "event" | "reload";
  };

  /**
   * Enable automatic retry cycle reset when enough time has passed
   * since the last reload. When true, if the user stays on a page longer
   * than the retry delay, the next error will start a fresh retry cycle.
   * @default true
   */
  enableRetryReset?: boolean;

  /**
   * Error filtering and retry configuration.
   */
  errors?: {
    /**
     * List of error message substrings that should trigger the retry/reload process,
     * same as chunk load errors. Useful for custom errors that indicate a stale deployment.
     * @default []
     */
    forceRetry?: string[];
    /**
     * List of error message substrings to ignore and not report.
     * If error message contains any of these strings, it will be filtered out.
     * @default []
     */
    ignore?: string[];
  };

  /**
   * Controls behavior for regular unhandled promise rejections
   * (those that are not chunk errors or ForceRetry errors).
   * @default { retry: true, sendBeacon: true }
   */
  handleUnhandledRejections?: {
    /**
     * Whether to attempt a page reload on unhandled rejections.
     * @default true
     */
    retry?: boolean;
    /**
     * Whether to send a beacon report on unhandled rejections.
     * @default true
     */
    sendBeacon?: boolean;
  };

  html?: {
    fallback?: {
      /** Custom HTML to display when all reload attempts are exhausted */
      content?: string;
      /** CSS selector where the fallback HTML should be injected @default "body" */
      selector?: string;
    };
    loading?: {
      /** Custom HTML to display during the loading/retrying state */
      content?: string;
    };
  };

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

  /**
   * Spinner overlay configuration.
   * Controls the full-page loading spinner injected by the Vite plugin
   * and available via `showSpinner()`/`dismissSpinner()` at runtime.
   */
  spinner?: {
    /**
     * Overlay background color.
     * Used as CSS variable fallback: var(--spa-guard-spinner-bg, <this value>).
     * @default '#fff'
     */
    background?: string;
    /**
     * Custom spinner HTML (the spinner element only, no container/overlay).
     * If not provided, uses the default SVG spinner.
     */
    content?: string;
    /**
     * Disable spinner entirely.
     * No injection into body, showSpinner() is a no-op, Spinner returns null.
     * @default false
     */
    disabled?: boolean;
  };

  /** @default true */
  useRetryId?: boolean;

  /**
   * Current application version. Used by the version checker to detect new deployments.
   * Automatically generated by the Vite plugin using `crypto.randomUUID()` if not explicitly provided.
   */
  version?: string;
}

export const getOptions = (): Options => {
  const windowOptions = (globalThis.window as any)?.[optionsWindowKey] as Options | undefined;

  return {
    ...defaultOptions,
    ...windowOptions,
    checkVersion: {
      ...defaultOptions.checkVersion,
      ...windowOptions?.checkVersion,
    },
    errors: {
      ...defaultOptions.errors,
      ...windowOptions?.errors,
    },
    handleUnhandledRejections: {
      ...defaultOptions.handleUnhandledRejections,
      ...windowOptions?.handleUnhandledRejections,
    },
    html: {
      fallback: {
        ...defaultOptions.html?.fallback,
        ...windowOptions?.html?.fallback,
      },
      loading: {
        ...defaultOptions.html?.loading,
        ...windowOptions?.html?.loading,
      },
    },
    lazyRetry: {
      ...defaultOptions.lazyRetry,
      ...windowOptions?.lazyRetry,
    },
    reportBeacon: {
      ...defaultOptions.reportBeacon,
      ...windowOptions?.reportBeacon,
    },
    spinner: {
      ...defaultOptions.spinner,
      ...windowOptions?.spinner,
    },
  };
};
