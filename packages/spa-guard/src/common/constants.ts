import { name } from "../../package.json";

export const optionsWindowKey = "__SPA_GUARD_OPTIONS__";

export const eventSubscribersWindowKey = Symbol.for(`${name}:event-subscribers`);

export const internalConfigWindowKey = Symbol.for(`${name}:internal-config`);
