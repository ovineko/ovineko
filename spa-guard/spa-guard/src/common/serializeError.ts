import { MAX_SERIALIZED_LENGTH } from "../schema/parse";
import { stripForceRetryMagic } from "./errors/ForceRetryError";
import { getPageUrl } from "./pageUrl";

export const serializeError = (error: unknown): string => {
  try {
    return JSON.stringify(serializeErrorObject(error));
  } catch {
    return JSON.stringify({
      error: "Failed to serialize error",
      fallback: safeFallback(error),
    });
  }
};

export const serializeErrorObject = (error: unknown): any => {
  try {
    const result = serializeErrorInternal(error);
    if (JSON.stringify(result).length > MAX_SERIALIZED_LENGTH) {
      return {
        error: "Serialized error exceeded maximum length",
        ...(typeof result?.type === "string" && { type: result.type }),
      };
    }
    return result;
  } catch {
    return {
      error: "Failed to serialize error",
      fallback: safeFallback(error),
    };
  }
};

// Guardrail constants
const MAX_DEPTH = 4;
const MAX_KEYS = 20;
const MAX_TOTAL_KEYS = 100;
const MAX_STRING_LEN = 500;

const truncate = (str: string): string =>
  str.length > MAX_STRING_LEN ? `${str.slice(0, MAX_STRING_LEN - 1)}\u2026` : str;

const safeString = (value: unknown): string => {
  try {
    return truncate(stripForceRetryMagic(String(value)));
  } catch {
    return "Unstringifiable value";
  }
};

const safeFallback = (value: unknown): string => {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) {
    return safeString(value);
  }
  try {
    if (value instanceof Error) {
      return safeString(value);
    }
  } catch {}
  return "Unserializable object";
};

const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" ? safeString(value) : undefined;

const serializePrimitive = (value: unknown): unknown => {
  if (typeof value === "string") {
    return safeString(value);
  }
  if (typeof value === "bigint" || typeof value === "symbol") {
    return safeString(value);
  }
  if (typeof value === "function") {
    return `[function${value.name ? ` ${truncate(value.name)}` : ""}]`;
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    return String(value);
  }
  return value;
};

const getSerializedPageUrl = (): string | undefined => {
  const pageUrl = getPageUrl();
  return pageUrl === undefined ? undefined : truncate(pageUrl);
};

const getConstructorName = (value: unknown): string | undefined => {
  try {
    return meaningfulConstructorName((value as any)?.constructor?.name);
  } catch {
    return undefined;
  }
};

const SENSITIVE_KEYS = new Set([
  "accesstoken",
  "apikey",
  "auth",
  "authorization",
  "body",
  "clientsecret",
  "cookie",
  "credentials",
  "data",
  "formdata",
  "headers",
  "passphrase",
  "passwd",
  "password",
  "payload",
  "privatekey",
  "refreshtoken",
  "secret",
  "setcookie",
  "token",
]);

const isSensitiveKey = (key: string): boolean => {
  const normalized = key.replaceAll(/[^a-z]/gi, "").toLowerCase();
  return (
    SENSITIVE_KEYS.has(normalized) ||
    /apikey|authorization|cookie|credential|passphrase|passwd|password|secret|token/.test(
      normalized,
    ) ||
    normalized.endsWith("body") ||
    normalized.endsWith("headers") ||
    normalized.endsWith("payload")
  );
};

const meaningfulConstructorName = (value: unknown): string | undefined => {
  if (typeof value !== "string" || /^[A-Za-z_$]{1,3}$/.test(value)) {
    return undefined;
  }
  return safeString(value);
};

interface SerializationBudget {
  remainingKeys: number;
}

const serializeErrorInternal = (error: unknown): any => {
  if (error === null || error === undefined) {
    return { type: "null", value: error };
  }
  if (typeof error !== "object") {
    return { type: typeof error, value: serializePrimitive(error) };
  }

  if (error instanceof Error) {
    return {
      message: safeString(error.message),
      name: safeString(error.name),
      stack: error.stack ? safeString(error.stack) : undefined,
      type: "Error",
      ...extractErrorProperties(error),
    };
  }

  if ("reason" in error && "promise" in error) {
    const evt = error as any;
    const reason = evt.reason;
    const constructorName = getConstructorName(reason);
    return {
      ...(constructorName ? { constructorName } : {}),
      isTrusted: serializePrimitive(evt.isTrusted),
      pageUrl: getSerializedPageUrl(),
      reason: serializeRejectionReason(reason, new WeakSet(), 0, {
        remainingKeys: MAX_TOTAL_KEYS,
      }),
      timeStamp: serializePrimitive(evt.timeStamp),
      type: "PromiseRejectionEvent",
    };
  }

  if ("error" in error && "message" in error && "filename" in error) {
    const evt = error as any;
    const message = typeof evt.message === "string" ? safeString(evt.message) : undefined;
    const crossOrigin = message === "Script error." && !evt.filename;
    return {
      colno: serializePrimitive(evt.colno),
      error: serializeErrorInternal(evt.error),
      filename: typeof evt.filename === "string" ? truncate(evt.filename) : undefined,
      lineno: serializePrimitive(evt.lineno),
      ...(crossOrigin ? { crossOrigin: true } : {}),
      message,
      pageUrl: getSerializedPageUrl(),
      type: "ErrorEvent",
    };
  }

  if ("violatedDirective" in error && "blockedURI" in error) {
    const evt = error as SecurityPolicyViolationEvent;
    return {
      blockedURI: optionalString(evt.blockedURI),
      columnNumber: serializePrimitive(evt.columnNumber),
      effectiveDirective: optionalString(evt.effectiveDirective),
      lineNumber: serializePrimitive(evt.lineNumber),
      originalPolicy: optionalString(evt.originalPolicy),
      sourceFile: optionalString(evt.sourceFile),
      type: "SecurityPolicyViolationEvent",
      violatedDirective: optionalString(evt.violatedDirective),
    };
  }

  if ("type" in error && "target" in error) {
    const evt = error as Event;
    return {
      eventType: optionalString(evt.type),
      pageUrl: getSerializedPageUrl(),
      target: extractEventTarget(evt.target),
      timeStamp: serializePrimitive(evt.timeStamp),
      type: "Event",
    };
  }

  return {
    type: "object",
    value: extractOwnProperties(error),
  };
};

const serializeRejectionReason = (
  reason: unknown,
  visited: WeakSet<object>,
  depth: number,
  budget: SerializationBudget,
): any => {
  if (reason === null || reason === undefined) {
    return { type: "null", value: reason };
  }
  if (typeof reason !== "object") {
    return { type: typeof reason, value: serializePrimitive(reason) };
  }
  if (visited.has(reason as object)) {
    return { type: "circular" };
  }
  visited.add(reason as object);

  // AggregateError - check before Error since it extends Error
  if (typeof AggregateError !== "undefined" && reason instanceof AggregateError) {
    return {
      errors: reason.errors
        .slice(0, 3)
        .map((e: unknown) => serializeSafeError(e, visited, depth + 1, budget)),
      message: safeString(reason.message),
      name: safeString(reason.name),
      stack: reason.stack ? safeString(reason.stack) : undefined,
      type: "Error",
    };
  }

  // DOMException - check before Error since it may extend Error
  if (typeof DOMException !== "undefined" && reason instanceof DOMException) {
    return {
      code: (reason as DOMException).code,
      message: safeString((reason as DOMException).message),
      name: safeString((reason as DOMException).name),
      type: "Error",
    };
  }

  // HTTP-like errors with response
  const reasonObj = reason as any;
  if (reasonObj.response != null) {
    const response = reasonObj.response;
    const result: Record<string, any> = {
      type: "HttpError",
    };
    if (typeof response.status === "number" && Number.isFinite(response.status)) {
      result.status = response.status;
    }
    if (typeof response.statusText === "string" && response.statusText) {
      result.statusText = safeString(response.statusText);
    }
    if (typeof response.url === "string") {
      result.url = safeString(response.url);
    }
    if (typeof response.type === "string") {
      result.responseType = safeString(response.type);
    }

    const reqSource = reasonObj.config ?? reasonObj.request ?? reasonObj.options;
    const methodSource = [reasonObj.config, reasonObj.request, reasonObj.options].find(
      (source) => source?.method !== undefined,
    );
    if (typeof methodSource?.method === "string") {
      result.method = safeString(methodSource.method);
    } else if (typeof response.method === "string") {
      // Preserve support for client-specific response wrappers.
      result.method = safeString(response.method);
    }

    // X-Request-ID header ONLY if present
    try {
      const headers = response.headers;
      if (headers) {
        let xRequestId: null | string | undefined;
        if (typeof headers.get === "function") {
          xRequestId = headers.get("X-Request-ID") ?? headers.get("x-request-id");
        } else if (typeof headers === "object") {
          xRequestId =
            (headers as Record<string, string>)["X-Request-ID"] ??
            (headers as Record<string, string>)["x-request-id"];
        }
        if (xRequestId) {
          result.xRequestId = safeString(xRequestId);
        }
      }
    } catch {}

    // Request wrapper: ONLY method, url, baseURL - no body/payload/headers
    if (reqSource != null) {
      const req: Record<string, any> = {};
      if (typeof reqSource.method === "string") {
        req.method = safeString(reqSource.method);
      }
      if (typeof reqSource.url === "string") {
        req.url = safeString(reqSource.url);
      }
      if (typeof reqSource.baseURL === "string") {
        req.baseURL = safeString(reqSource.baseURL);
      }
      result.request = req;
    }

    return result;
  }

  // Error
  if (reason instanceof Error) {
    return serializeSafeError(reason, visited, depth, budget);
  }

  // Non-Error object: safe bounded preview
  return {
    type: "object",
    value: extractBoundedObject(reasonObj, visited, depth, budget),
  };
};

const serializeSafeError = (
  error: unknown,
  visited: WeakSet<object>,
  depth: number,
  budget: SerializationBudget,
): any => {
  if (!(error instanceof Error)) {
    return serializeRejectionReason(error, visited, depth + 1, budget);
  }
  const result: Record<string, any> = {
    message: safeString(error.message),
    name: safeString(error.name),
    stack: error.stack ? safeString(error.stack) : undefined,
    type: "Error",
  };
  if (depth < MAX_DEPTH && (error as any).cause !== undefined) {
    const cause = (error as any).cause;
    if (typeof cause === "object" && cause !== null) {
      if (!visited.has(cause as object)) {
        result.cause = serializeRejectionReason(cause, visited, depth + 1, budget);
      }
    } else {
      result.cause = serializePrimitive(cause);
    }
  }
  return result;
};

const extractBoundedObject = (
  obj: object,
  visited: WeakSet<object>,
  depth: number,
  budget: SerializationBudget,
): Record<string, any> => {
  const result: Record<string, any> = {};
  let keyCount = 0;
  for (const key of Object.keys(obj)) {
    if (keyCount >= MAX_KEYS || budget.remainingKeys <= 0) {
      break;
    }
    budget.remainingKeys -= 1;
    const resultKey = truncate(key);
    if (isSensitiveKey(key)) {
      result[resultKey] = "[redacted]";
      keyCount++;
      continue;
    }
    try {
      const value = (obj as any)[key];
      if (value === null || value === undefined || typeof value !== "object") {
        result[resultKey] = serializePrimitive(value);
      } else if (depth < MAX_DEPTH && !visited.has(value as object)) {
        visited.add(value as object);
        result[resultKey] = extractBoundedObject(value as object, visited, depth + 1, budget);
      } else {
        result[resultKey] = "[object]";
      }
    } catch {}
    keyCount++;
  }
  return result;
};

const extractErrorProperties = (error: Error): Record<string, any> => {
  const props: Record<string, any> = {};
  let keyCount = 0;
  for (const key of Object.getOwnPropertyNames(error)) {
    if (keyCount >= MAX_KEYS) {
      break;
    }
    if (!["message", "name", "stack"].includes(key)) {
      const resultKey = truncate(key);
      if (isSensitiveKey(key)) {
        props[resultKey] = "[redacted]";
        keyCount++;
        continue;
      }
      try {
        const value = (error as any)[key];
        if (value === null || value === undefined || typeof value !== "object") {
          props[resultKey] = serializePrimitive(value);
        } else {
          props[resultKey] = "[object]";
        }
      } catch {}
      keyCount++;
    }
  }
  return props;
};

const extractEventTarget = (target: EventTarget | null): any => {
  if (!target) {
    return null;
  }
  if (target instanceof HTMLElement) {
    const getAttribute = (name: string): string | undefined => {
      try {
        const value = target.getAttribute(name);
        return value === null ? undefined : value;
      } catch {
        return undefined;
      }
    };
    const as = getAttribute("as");
    const href = optionalString((target as any).href);
    const rel = getAttribute("rel");
    const src = optionalString((target as any).src);
    return {
      className: optionalString(target.className),
      ...(href !== undefined && { href }),
      id: optionalString(target.id),
      ...(rel !== undefined && { rel: safeString(rel) }),
      ...(as !== undefined && { as: safeString(as) }),
      ...(src !== undefined && { src }),
      tagName: optionalString(target.tagName),
    };
  }
  return { type: safeString(target) };
};

const extractOwnProperties = (obj: any): Record<string, any> => {
  const props: Record<string, any> = {};
  let keyCount = 0;
  for (const key of Object.keys(obj)) {
    if (keyCount >= MAX_KEYS) {
      break;
    }
    const resultKey = truncate(key);
    if (isSensitiveKey(key)) {
      props[resultKey] = "[redacted]";
      keyCount++;
      continue;
    }
    try {
      const value = obj[key];
      if (value === null || value === undefined || typeof value !== "object") {
        props[resultKey] = serializePrimitive(value);
      } else {
        props[resultKey] = "[object]";
      }
    } catch {}
    keyCount++;
  }
  return props;
};
