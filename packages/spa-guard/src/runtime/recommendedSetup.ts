import { startVersionCheck, stopVersionCheck } from "../common/checkVersion";

export interface RecommendedSetupOptions {
  /**
   * Whether to start version checking.
   * @default true
   */
  versionCheck?: boolean;
}

/**
 * Enable recommended runtime features with sensible defaults.
 * Returns a cleanup function that tears down all started features.
 */
export const recommendedSetup = (overrides?: RecommendedSetupOptions): (() => void) => {
  const options = { versionCheck: true, ...overrides };

  if (options.versionCheck) {
    startVersionCheck();
  }

  return () => {
    stopVersionCheck();
  };
};
