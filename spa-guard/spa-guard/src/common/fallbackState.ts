import { fallbackModeKey } from "./constants";

export const isInFallbackMode = (): boolean => {
  if (globalThis.window === undefined) {
    return false;
  }
  return (globalThis.window as any)[fallbackModeKey] === true;
};

export const setFallbackMode = (): void => {
  if (globalThis.window === undefined) {
    return;
  }
  (globalThis.window as any)[fallbackModeKey] = true;
};

export const resetFallbackMode = (): void => {
  if (globalThis.window === undefined) {
    return;
  }
  (globalThis.window as any)[fallbackModeKey] = false;
};
