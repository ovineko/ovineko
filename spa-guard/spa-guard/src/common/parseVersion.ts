/**
 * Extract the SPA Guard version string from an HTML document.
 *
 * Tries the new `__SPA_GUARD_VERSION__` format first, then falls back
 * to the legacy `__SPA_GUARD_OPTIONS__` object with a `version` key.
 *
 * Returns `null` when neither marker is found.
 */
export function extractVersionFromHtml(html: string): null | string {
  // Collapse newlines so formatters (e.g. Prettier) don't break single-line regex matching
  const collapsed = html.replaceAll(/[\r\n]+/g, "");

  // Try new format first: window.__SPA_GUARD_VERSION__="1.2.3"
  const versionMatch = collapsed.match(/__SPA_GUARD_VERSION__\s*=\s*"([^"]+)"/);
  if (versionMatch?.[1]) {
    return versionMatch[1];
  }

  // Fall back to old format: window.__SPA_GUARD_OPTIONS__={...,"version":"1.2.3",...}
  // Handles both quoted ("version") and unquoted (version) keys for JSDOM compatibility
  // Limit search to 1000 chars after the marker to prevent catastrophic backtracking
  const markerIdx = collapsed.indexOf("__SPA_GUARD_OPTIONS__");
  if (markerIdx === -1) {
    return null;
  }
  const segment = collapsed.slice(markerIdx, markerIdx + 1000);
  const optionsMatch = segment.match(
    /__SPA_GUARD_OPTIONS__\s*=\s*\{.*?"?version"?\s*:\s*"([^"]+)"/,
  );

  return optionsMatch?.[1] ?? null;
}
