import { staticAssetRecoveryKey } from "./constants";
import { getOptions } from "./options";
import { triggerRetry } from "./retryOrchestrator";

interface StaticAssetRecoveryState {
  failedAssets: Set<string>;
  recoveryTimer: null | ReturnType<typeof setTimeout>;
}

const getState = (): StaticAssetRecoveryState => {
  if (globalThis.window === undefined) {
    return { failedAssets: new Set<string>(), recoveryTimer: null };
  }
  if (!(globalThis.window as any)[staticAssetRecoveryKey]) {
    (globalThis.window as any)[staticAssetRecoveryKey] = {
      failedAssets: new Set<string>(),
      recoveryTimer: null,
    } as StaticAssetRecoveryState;
  }
  return (globalThis.window as any)[staticAssetRecoveryKey] as StaticAssetRecoveryState;
};

export const handleStaticAssetFailure = (url: string): void => {
  if (globalThis.window === undefined) {
    return;
  }

  const state = getState();
  state.failedAssets.add(url);

  if (state.recoveryTimer !== null) {
    return;
  }

  const options = getOptions();
  const delay = options.staticAssets?.recoveryDelay ?? 500;

  state.recoveryTimer = setTimeout(() => {
    const s = getState();
    s.recoveryTimer = null;
    const assets = [...s.failedAssets];
    s.failedAssets = new Set();

    const error = new Error(`Static asset load failed: ${assets.join(", ")}`);
    triggerRetry({ cacheBust: true, error, source: "static-asset-error" });
  }, delay);
};

export const resetStaticAssetRecovery = (): void => {
  const state = getState();
  if (state.recoveryTimer !== null) {
    clearTimeout(state.recoveryTimer);
    state.recoveryTimer = null;
  }
  state.failedAssets = new Set();
};
