import { optionsWindowKey } from "./constants";
import { defaultFallbackHtml } from "./fallbackHtml.generated";

export { optionsWindowKey } from "./constants";

const defaultOptions: Options = {
  fallback: {
    html: defaultFallbackHtml,
    selector: "body",
  },
  ignoredErrors: [],
  reloadDelays: [1000, 2000, 5000],
  useRetryId: true,
};

export interface Options {
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
    reportBeacon: {
      ...defaultOptions.reportBeacon,
      ...windowOptions?.reportBeacon,
    },
  };
};
