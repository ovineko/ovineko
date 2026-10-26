import { useEffect } from "react";
import { useRouteError } from "react-router";

import {
  DefaultErrorFallback,
  type SpaGuardState,
  useSpaGuardState,
} from "@ovineko/spa-guard-react";
import {
  ForceRetryError,
  handleErrorWithSpaGuard,
  isChunkError,
} from "@ovineko/spa-guard/_internal";

const lazyRouteModuleErrorPatterns = [
  /Cannot read properties of undefined \(reading ['"]default['"]\)/i,
  /undefined is not an object \(evaluating ['"][^'"]*\.default['"]\)/i,
  /can't access property ["']default["'], .+ is undefined/i,
];

const isLazyRouteModuleError = (error: unknown): error is TypeError =>
  error instanceof TypeError &&
  lazyRouteModuleErrorPatterns.some((pattern) => pattern.test(error.message));

/**
 * Props for the ErrorBoundaryReactRouter component
 */
export interface ErrorBoundaryReactRouterProps {
  autoRetryChunkErrors?: boolean;
  fallback?:
    ((props: RouterFallbackProps) => React.ReactElement) | React.ComponentType<RouterFallbackProps>;
  onError?: (error: unknown) => void;
  sendBeacon?: boolean;
}

/**
 * Props passed to the fallback component when a route error occurs
 */
export interface RouterFallbackProps {
  error: unknown;
  isChunkError: boolean;
  isRetrying: boolean;
  spaGuardState: SpaGuardState;
}

const DefaultRouterFallback: React.FC<RouterFallbackProps> = ({
  error,
  isChunkError: isChunk,
  isRetrying,
  spaGuardState,
}) => (
  <DefaultErrorFallback
    error={error}
    isChunkError={isChunk}
    isRetrying={isRetrying}
    spaGuardState={spaGuardState}
  />
);

/**
 * Error boundary for React Router with spa-guard integration.
 *
 * Uses `useRouteError()` to catch route errors and automatically retries chunk loading errors.
 */
export const ErrorBoundaryReactRouter: React.FC<ErrorBoundaryReactRouterProps> = ({
  autoRetryChunkErrors = true,
  fallback: Fallback,
  onError,
  sendBeacon: shouldSendBeacon = true,
}) => {
  const routeError = useRouteError();
  const spaGuardState = useSpaGuardState();
  const isLazyRouteError = isLazyRouteModuleError(routeError);

  useEffect(() => {
    const handledError = isLazyRouteError
      ? new ForceRetryError(routeError.message, { cause: routeError })
      : routeError;
    const handleOnError =
      isLazyRouteError && onError !== undefined ? () => onError(routeError) : onError;

    handleErrorWithSpaGuard(handledError, {
      autoRetryChunkErrors,
      eventName: "react-router-error",
      ...(handleOnError !== undefined && { onError: handleOnError }),
      sendBeaconOnError: shouldSendBeacon,
    });
  }, [routeError, isLazyRouteError, autoRetryChunkErrors, onError, shouldSendBeacon]);

  const isChunk = isChunkError(routeError) || isLazyRouteError;
  const isRetrying = spaGuardState.isWaiting && spaGuardState.currentAttempt > 0;

  const fallbackProps: RouterFallbackProps = {
    error: routeError,
    isChunkError: isChunk,
    isRetrying,
    spaGuardState,
  };

  if (Fallback) {
    return <Fallback {...fallbackProps} />;
  }

  return <DefaultRouterFallback {...fallbackProps} />;
};
