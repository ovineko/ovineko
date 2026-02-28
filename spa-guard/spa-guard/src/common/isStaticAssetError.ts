const HASHED_ASSET_RE = /[-._][a-zA-Z0-9]{6,}\.(js|mjs|css)$/i;

const isHashedAssetUrl = (url: string): boolean => {
  try {
    const pathname = new URL(url).pathname;
    return HASHED_ASSET_RE.test(pathname);
  } catch {
    return HASHED_ASSET_RE.test(url);
  }
};

export const isStaticAssetError = (event: Event): boolean => {
  const target = event.target;
  if (target instanceof HTMLScriptElement) {
    return isHashedAssetUrl(target.src);
  }
  if (target instanceof HTMLLinkElement) {
    return isHashedAssetUrl(target.href);
  }
  return false;
};

const checkResourceStatus = (url: string): boolean => {
  if (typeof performance === "undefined" || typeof performance.getEntriesByName !== "function") {
    return true;
  }
  const entries = performance.getEntriesByName(url, "resource") as PerformanceResourceTiming[];
  if (entries.length === 0) {
    return true;
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const entry = entries.at(-1)!;
  if ((entry as any).responseStatus >= 400) {
    return true;
  }
  if (entry.transferSize === 0 && entry.decodedBodySize === 0) {
    return true;
  }
  return false;
};

export const isLikely404 = (url?: string, timeSinceNavMs?: number): boolean => {
  if (url !== undefined) {
    return checkResourceStatus(url);
  }
  const elapsed = timeSinceNavMs ?? (typeof performance === "undefined" ? 0 : performance.now());
  return elapsed > 30_000;
};

export const getAssetUrl = (event: Event): string => {
  const target = event.target;
  if (target instanceof HTMLScriptElement) {
    return target.src;
  }
  if (target instanceof HTMLLinkElement) {
    return target.href;
  }
  return "";
};
