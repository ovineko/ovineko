/**
 * Custom error class for URL parsing failures
 */
export class URLParseError extends Error {
  public readonly context: Record<string, unknown>;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = "URLParseError";
    this.context = context;
  }
}

/**
 * Decodes URL component safely, handling special characters
 */
export function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    console.warn(`Failed to decode URI component: ${value}`, error);
    return value;
  }
}
