import { stripForceRetryMagic } from "./errors/ForceRetryError";

const MAX_PREVIEW_LENGTH = 200;

const truncate = (value: string): string =>
  value.length > MAX_PREVIEW_LENGTH ? `${value.slice(0, MAX_PREVIEW_LENGTH - 1)}…` : value;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readStringProperty = (value: Record<string, unknown>, key: string): string | undefined => {
  try {
    const property = value[key];
    return typeof property === "string" ? property : undefined;
  } catch {
    return undefined;
  }
};

const stringify = (value: unknown): string | undefined => {
  try {
    return String(value);
  } catch {
    return undefined;
  }
};

export const describeError = (reason: unknown): string => {
  if (typeof reason === "string") {
    return truncate(stripForceRetryMagic(reason));
  }

  if (isObject(reason)) {
    if (reason instanceof Error) {
      const description = stringify(reason);
      if (description) {
        return truncate(stripForceRetryMagic(description));
      }
    }

    const message = readStringProperty(reason, "message");
    if (message?.trim()) {
      return truncate(stripForceRetryMagic(message));
    }

    const explicitName = readStringProperty(reason, "name");
    let constructorName: string | undefined;
    try {
      const constructor = reason.constructor;
      if (
        (typeof constructor === "object" && constructor !== null) ||
        typeof constructor === "function"
      ) {
        constructorName = readStringProperty(
          constructor as unknown as Record<string, unknown>,
          "name",
        );
      }
    } catch {}
    const name = explicitName ?? constructorName;
    if (name && name !== "Object" && !/^[A-Za-z_$]{1,2}$/.test(name)) {
      return truncate(`${stripForceRetryMagic(name)} rejection`);
    }
    return "Non-Error rejection";
  }

  const value = stringify(reason);
  return value === undefined ? "Non-Error rejection" : truncate(stripForceRetryMagic(value));
};
