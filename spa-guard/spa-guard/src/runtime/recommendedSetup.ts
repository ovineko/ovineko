import { startVersionCheck, stopVersionCheck } from "../common/checkVersion";
import { markRetryHealthyBoot } from "../common/retryOrchestrator";
import { dismissSpinner } from "../common/spinner";

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
  dismissSpinner();
  markRetryHealthyBoot();

  const options = { versionCheck: true, ...overrides };

  if (options.versionCheck) {
    startVersionCheck();
  }

  return () => {
    if (options.versionCheck) {
      stopVersionCheck();
    }
  };
};
