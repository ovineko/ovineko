const FORCE_RETRY_MAGIC = "__SPA_GUARD_FORCE_RETRY__";

export { FORCE_RETRY_MAGIC };

export class ForceRetryError extends Error {
  constructor(message?: string) {
    super(`${FORCE_RETRY_MAGIC}${message ?? ""}`);
    this.name = "ForceRetryError";
  }
}
