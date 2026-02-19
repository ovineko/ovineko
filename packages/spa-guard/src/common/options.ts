import { optionsWindowKey } from "./constants";

export { optionsWindowKey } from "./constants";

const defaultOptions: Options = {
  checkVersion: {
    interval: 60_000,
  },
  maxReloads: 3,
};

export interface Options {
  checkVersion?: {
    endpoint?: string;
    /** @default 60_000 */
    interval?: number;
  };
  /** @default 3 */
  maxReloads?: number;
  reportBeacon?: {
    endpoint?: string;
  };
}

export const getOptions = (): Options => {
  const windowOptions = (globalThis.window as any)?.[optionsWindowKey] as Options | undefined;

  return {
    ...defaultOptions,
    checkVersion: {
      ...defaultOptions.checkVersion,
      ...windowOptions?.checkVersion,
    },
    reportBeacon: {
      ...defaultOptions.reportBeacon,
      ...windowOptions?.reportBeacon,
    },
  };
};
