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
      stack: error.stack,
      type: "Error",
      ...extractErrorProperties(error),
    };
  }

  if ("reason" in error && "promise" in error) {
    return {
      reason: serializeErrorInternal((error as any).reason),
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

const extractErrorProperties = (error: Error): Record<string, any> => {
  const props: Record<string, any> = {};
  for (const key of Object.getOwnPropertyNames(error)) {
    if (!["message", "name", "stack"].includes(key)) {
      try {
        props[key] = (error as any)[key];
      } catch {}
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
  for (const key of Object.keys(obj)) {
    try {
      const value = obj[key];
      props[key] = typeof value === "object" ? String(value) : value;
    } catch {}
  }
  return props;
};
