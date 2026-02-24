import { name } from "../../package.json";

export const optionsWindowKey = "__SPA_GUARD_OPTIONS__";

export const eventSubscribersWindowKey = Symbol.for(`${name}:event-subscribers`);

export const internalConfigWindowKey = Symbol.for(`${name}:internal-config`);

export const initializedKey = Symbol.for(`${name}:initialized`);

export const loggerWindowKey = Symbol.for(`${name}:logger`);

export const RETRY_ID_PARAM = "spaGuardRetryId";
export const RETRY_ATTEMPT_PARAM = "spaGuardRetryAttempt";
export const CACHE_BUST_PARAM = "spaGuardCacheBust";

export const versionCheckStateWindowKey = Symbol.for(`${name}:version-check-state`);

export const reloadScheduledKey = Symbol.for(`${name}:reload-scheduled`);

export const inMemoryLastReloadKey = Symbol.for(`${name}:in-memory-last-reload`);

export const staticAssetRecoveryKey = Symbol.for(`${name}:static-asset-recovery`);

export const debugSyncErrorEventType = "spa-guard:debug-sync-error";
