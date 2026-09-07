/** Base64url hashes use letters, digits, `-`, and `_` in the filename token. */
const HASHED_ASSET_RE = /[-._]([a-zA-Z0-9_-]{6,})\.(js|mjs|css|cjs)$/i;

const isHashLike = (token: string | undefined): boolean =>
  token !== undefined &&
  (/\d/.test(token) || /[a-z][A-Z]|[A-Z][a-z]/.test(token) || /^[a-f]{6,}$/i.test(token));

const matchesHashedAsset = (url: string): boolean => {
  const match = HASHED_ASSET_RE.exec(url.split(/[?#]/, 1)[0] ?? "");
  return match !== null && isHashLike(match?.[1]);
};

const isHashedAssetUrl = (url: string): boolean => {
  try {
    const pathname = new URL(url).pathname;
    return matchesHashedAsset(pathname);
  } catch {
    return matchesHashedAsset(url);
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

export interface ResourceTimingInfo {
  hasEntry: boolean;
  noBytesDelivered: boolean;
  responseStatus?: number;
}

export const getResourceTimingInfo = (url: string): ResourceTimingInfo => {
  if (typeof performance === "undefined" || typeof performance.getEntriesByName !== "function") {
    return { hasEntry: false, noBytesDelivered: false };
  }
  const entries = performance.getEntriesByName(url, "resource") as PerformanceResourceTiming[];
  if (entries.length === 0) {
    return { hasEntry: false, noBytesDelivered: false };
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const entry = entries.at(-1)!;
  const responseStatus = (entry as any).responseStatus;
  return {
    hasEntry: true,
    noBytesDelivered: entry.transferSize === 0 && entry.decodedBodySize === 0,
    ...(typeof responseStatus === "number" && Number.isFinite(responseStatus)
      ? { responseStatus }
      : {}),
  };
};

const checkResourceStatus = (url: string): boolean => {
  const info = getResourceTimingInfo(url);
  return !info.hasEntry || info.noBytesDelivered || (info.responseStatus ?? 0) >= 400;
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

export const getResourceUrl = (event: Event): string => {
  const target = event.target;
  if (!(target instanceof Element)) {
    return "";
  }
  const resource = target as Element & { currentSrc?: string; href?: string; src?: string };
  return resource.currentSrc || resource.src || resource.href || "";
};
