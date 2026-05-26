export const isChunkError = (error: unknown): boolean => {
  const message = getErrorMessage(error);
  if (!message) {
    return false;
  }

  const patterns = [
    /Failed to fetch dynamically imported module/i,
    /Importing a module script failed/i,
    /error loading dynamically imported module/i,
    /Unable to preload CSS/i,
    /Loading chunk \d+ failed/i,
    /Loading CSS chunk \d+ failed/i,
    /ChunkLoadError/i,
  ];

  return patterns.some((pattern) => pattern.test(message));
};

const getErrorMessage = (error: unknown): null | string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  if (error && typeof error === "object" && "reason" in error) {
    return getErrorMessage((error as any).reason);
  }
  return null;
};
