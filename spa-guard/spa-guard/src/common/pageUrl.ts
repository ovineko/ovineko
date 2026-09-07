export const getPageUrl = (): string | undefined => {
  try {
    const href = globalThis.window?.location?.href;
    return typeof href === "string" ? href : undefined;
  } catch {
    return undefined;
  }
};
