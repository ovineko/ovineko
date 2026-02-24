import { getOptions } from "./options";
import { attemptReload } from "./reload";

let recoveryTimer: null | ReturnType<typeof setTimeout> = null;
let failedAssets: Set<string> = new Set();

export const handleStaticAssetFailure = (url: string): void => {
  failedAssets.add(url);

  if (recoveryTimer !== null) {
    return;
  }

  const options = getOptions();
  const delay = options.staticAssets?.recoveryDelay ?? 500;

  recoveryTimer = setTimeout(() => {
    const assets = [...failedAssets];
    failedAssets = new Set();
    recoveryTimer = null;

    const error = new Error(`Static asset load failed: ${assets.join(", ")}`);
    attemptReload(error, { cacheBust: true });
  }, delay);
};

export const resetStaticAssetRecovery = (): void => {
  if (recoveryTimer !== null) {
    clearTimeout(recoveryTimer);
    recoveryTimer = null;
  }
  failedAssets = new Set();
};
