import { optionsWindowKey } from "./constants";
import { defaultFallbackHtml } from "./fallbackHtml.generated";

export { optionsWindowKey } from "./constants";

const defaultOptions: Options = {
  fallbackHtml: defaultFallbackHtml,
  reloadDelays: [1000, 2000, 5000],
  useRetryId: true,
};

export interface Options {
  fallbackHtml?: string;

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
    reportBeacon: {
      ...defaultOptions.reportBeacon,
      ...windowOptions?.reportBeacon,
    },
  };
};
