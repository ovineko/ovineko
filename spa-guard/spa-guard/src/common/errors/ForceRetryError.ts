const FORCE_RETRY_MAGIC = "__SPA_GUARD_FORCE_RETRY__";

export { FORCE_RETRY_MAGIC };

export class ForceRetryError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(`${FORCE_RETRY_MAGIC}${message ?? ""}`, options);
    this.name = "ForceRetryError";
  }
}
