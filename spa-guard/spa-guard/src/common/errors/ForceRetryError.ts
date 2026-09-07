const FORCE_RETRY_MAGIC = "__SPA_GUARD_FORCE_RETRY__";

export const stripForceRetryMagic = (message: string): string =>
  message.replaceAll(FORCE_RETRY_MAGIC, "");

export { FORCE_RETRY_MAGIC };

export class ForceRetryError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(`${FORCE_RETRY_MAGIC}${message ?? ""}`, options);
    this.name = "ForceRetryError";
  }
}
