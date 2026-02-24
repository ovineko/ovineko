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

export const isLikely404 = (
  timeSinceNavMs: number = typeof performance === "undefined" ? 0 : performance.now(),
): boolean => {
  return timeSinceNavMs > 30_000;
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
