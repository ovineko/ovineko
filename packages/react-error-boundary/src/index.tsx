import { useEffect, useMemo } from "react";
import { isRouteErrorResponse, useRouteError } from "react-router";

import { captureException } from "./sentry";

const { ERROR_DEBUGGER } = (globalThis.window || {}) as unknown as {
  ERROR_DEBUGGER?: {
    buildErrorDebuggerHTML: (errors: string[], index: number) => string;
  };
};

const DEBUG_PRE_STYLE = { whiteSpace: "pre-wrap" as const, wordBreak: "break-word" as const };

const DebugErrorInfo: React.FC<{ error: unknown }> = ({ error }) => {
  const html = useMemo(() => {
    if (!ERROR_DEBUGGER) {
      return "";
    }

    const stringError = JSON.stringify(error, Object.getOwnPropertyNames(error));
    return ERROR_DEBUGGER.buildErrorDebuggerHTML([stringError], 2);
  }, [error]);

  if (!html) {
    return null;
  }

  return <pre style={DEBUG_PRE_STYLE}>{html}</pre>;
};

class ErrorBoundary extends Error {
  error: unknown;
  isRouteErrorResponse: boolean;

  constructor(error: unknown) {
    const name = "ErrorBoundary";
    let message = name;

    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      "message" in error &&
      typeof error.name === "string" &&
      typeof error.message === "string"
    ) {
      message = `<${error.name}> ${error.message}`;
    }

    super(message);
    this.name = name;
    this.error = error;

    if (
      typeof error === "object" &&
      error !== null &&
      "stack" in error &&
      typeof error.stack === "string"
    ) {
      this.stack = error.stack;
    }

    this.isRouteErrorResponse = isRouteErrorResponse(error);
  }
}

export const ErrorBoundaryReloadPage: React.FC = () => {
  const routeError = useRouteError();

  useEffect(() => {
    const customError = new ErrorBoundary(routeError);

    captureException(customError);

    console.error(customError);

    if (!ERROR_DEBUGGER) {
      setTimeout(() => {
        globalThis.window.location.reload();
      }, 100);
    }
  }, []);

  if (!ERROR_DEBUGGER) {
    return null;
  }

  return <DebugErrorInfo error={routeError} />;
};
