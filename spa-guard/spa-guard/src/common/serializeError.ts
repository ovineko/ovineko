export const serializeError = (error: unknown): string => {
  try {
    const serialized = serializeErrorInternal(error);
    return JSON.stringify(serialized, null, 2);
  } catch {
    return JSON.stringify({
      error: "Failed to serialize error",
      fallback: String(error),
    });
  }
};

// Guardrail constants
const MAX_DEPTH = 4;
const MAX_KEYS = 20;
const MAX_STRING_LEN = 500;

const truncate = (str: string): string =>
  str.length > MAX_STRING_LEN ? str.slice(0, MAX_STRING_LEN) + "\u2026" : str;

const serializeErrorInternal = (error: unknown): any => {
  if (error === null || error === undefined) {
    return { type: "null", value: error };
  }
  if (typeof error !== "object") {
    return { type: typeof error, value: error };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack ? truncate(error.stack) : undefined,
      type: "Error",
      ...extractErrorProperties(error),
    };
  }

  if ("reason" in error && "promise" in error) {
    const evt = error as any;
    const reason = evt.reason;
    const pageUrl =
      typeof window !== "undefined" && typeof window.location?.href === "string"
        ? window.location.href
        : undefined;
    return {
      constructorName: reason?.constructor?.name,
      isTrusted: evt.isTrusted,
      pageUrl,
      reason: serializeRejectionReason(reason, new WeakSet(), 0),
      timeStamp: evt.timeStamp,
      type: "PromiseRejectionEvent",
    };
  }

  if ("error" in error && "message" in error && "filename" in error) {
    return {
      colno: (error as any).colno,
      error: serializeErrorInternal((error as any).error),
      filename: (error as any).filename,
      lineno: (error as any).lineno,
      message: (error as any).message,
      type: "ErrorEvent",
    };
  }

  if ("violatedDirective" in error && "blockedURI" in error) {
    const evt = error as SecurityPolicyViolationEvent;
    return {
      blockedURI: evt.blockedURI,
      columnNumber: evt.columnNumber,
      effectiveDirective: evt.effectiveDirective,
      lineNumber: evt.lineNumber,
      originalPolicy: evt.originalPolicy,
      sourceFile: evt.sourceFile,
      type: "SecurityPolicyViolationEvent",
      violatedDirective: evt.violatedDirective,
    };
  }

  if ("type" in error && "target" in error) {
    const evt = error as Event;
    return {
      eventType: evt.type,
      target: extractEventTarget(evt.target),
      timeStamp: evt.timeStamp,
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
): any => {
  if (reason === null || reason === undefined) {
    return { type: "null", value: reason };
  }
  if (typeof reason !== "object") {
    const val = typeof reason === "string" ? truncate(reason) : reason;
    return { type: typeof reason, value: val };
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
        .map((e: unknown) => serializeSafeError(e, visited, depth + 1)),
      message: truncate(reason.message),
      name: reason.name,
      stack: reason.stack ? truncate(reason.stack) : undefined,
      type: "Error",
    };
  }

  // DOMException - check before Error since it may extend Error
  if (typeof DOMException !== "undefined" && reason instanceof DOMException) {
    return {
      code: (reason as DOMException).code,
      message: truncate((reason as DOMException).message),
      name: (reason as DOMException).name,
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
    if (response.status !== undefined) {
      result.status = response.status;
    }
    if (response.statusText !== undefined) {
      result.statusText =
        typeof response.statusText === "string"
          ? truncate(response.statusText)
          : response.statusText;
    }
    if (response.url !== undefined) {
      result.url = typeof response.url === "string" ? truncate(response.url) : response.url;
    }
    if (response.method !== undefined) {
      result.method = response.method;
    }
    if (response.type !== undefined) {
      result.responseType = response.type;
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
          result.xRequestId = truncate(String(xRequestId));
        }
      }
    } catch {}

    // Request wrapper: ONLY method, url, baseURL - no body/payload/headers
    const reqSource = reasonObj.config ?? reasonObj.request;
    if (reqSource != null) {
      const req: Record<string, any> = {};
      if (reqSource.method !== undefined) {
        req.method = reqSource.method;
      }
      if (reqSource.url !== undefined) {
        req.url = typeof reqSource.url === "string" ? truncate(reqSource.url) : reqSource.url;
      }
      if (reqSource.baseURL !== undefined) {
        req.baseURL =
          typeof reqSource.baseURL === "string" ? truncate(reqSource.baseURL) : reqSource.baseURL;
      }
      result.request = req;
    }

    return result;
  }

  // Error
  if (reason instanceof Error) {
    return serializeSafeError(reason, visited, depth);
  }

  // Non-Error object: safe bounded preview
  return {
    type: "object",
    value: extractBoundedObject(reasonObj, visited, depth),
  };
};

const serializeSafeError = (error: unknown, visited: WeakSet<object>, depth: number): any => {
  if (!(error instanceof Error)) {
    return serializeRejectionReason(error, visited, depth + 1);
  }
  const result: Record<string, any> = {
    message: truncate(error.message),
    name: error.name,
    stack: error.stack ? truncate(error.stack) : undefined,
    type: "Error",
  };
  if (depth < MAX_DEPTH && (error as any).cause !== undefined) {
    const cause = (error as any).cause;
    if (typeof cause === "object" && cause !== null) {
      if (!visited.has(cause as object)) {
        result.cause = serializeRejectionReason(cause, visited, depth + 1);
      }
    } else {
      result.cause = cause;
    }
  }
  return result;
};

const extractBoundedObject = (
  obj: object,
  visited: WeakSet<object>,
  depth: number,
): Record<string, any> => {
  const result: Record<string, any> = {};
  let keyCount = 0;
  for (const key of Object.keys(obj)) {
    if (keyCount >= MAX_KEYS) {
      break;
    }
    try {
      const value = (obj as any)[key];
      if (value === null || value === undefined || typeof value !== "object") {
        result[key] = typeof value === "string" ? truncate(value) : value;
      } else if (depth < MAX_DEPTH && !visited.has(value as object)) {
        visited.add(value as object);
        result[key] = extractBoundedObject(value as object, visited, depth + 1);
      } else {
        result[key] = "[object]";
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
      try {
        const value = (error as any)[key];
        if (value === null || value === undefined || typeof value !== "object") {
          props[key] = typeof value === "string" ? truncate(value) : value;
        } else {
          props[key] = "[object]";
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
    return {
      className: target.className,
      href: (target as any).href,
      id: target.id,
      src: (target as any).src,
      tagName: target.tagName,
    };
  }
  return { type: String(target) };
};

const extractOwnProperties = (obj: any): Record<string, any> => {
  const props: Record<string, any> = {};
  let keyCount = 0;
  for (const key of Object.keys(obj)) {
    if (keyCount >= MAX_KEYS) {
      break;
    }
    try {
      const value = obj[key];
      if (value === null || value === undefined || typeof value !== "object") {
        props[key] = typeof value === "string" ? truncate(value) : value;
      } else {
        props[key] = "[object]";
      }
    } catch {}
    keyCount++;
  }
  return props;
};
