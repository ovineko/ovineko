import { name } from "../../package.json";

export const optionsWindowKey = "__SPA_GUARD_OPTIONS__";

export const eventSubscribersWindowKey = Symbol.for(`${name}:event-subscribers`);

export const internalConfigWindowKey = Symbol.for(`${name}:internal-config`);

export const RETRY_ID_PARAM = "spaGuardRetryId";
export const RETRY_ATTEMPT_PARAM = "spaGuardRetryAttempt";
