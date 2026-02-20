import { Component, type ReactNode } from "react";

import { DefaultErrorFallback } from "../common/DefaultErrorFallback";
import { handleErrorWithSpaGuard } from "../common/handleErrorWithSpaGuard";
import { isChunkError } from "../common/isChunkError";
import { type SpaGuardState, useSpaGuardState } from "../react";

/**
 * Props for the ErrorBoundary component
 */
export interface ErrorBoundaryProps {
  autoRetryChunkErrors?: boolean;
  children: ReactNode;
  fallback?: ((props: FallbackProps) => React.ReactElement) | React.ComponentType<FallbackProps>;
  fallbackRender?: (props: FallbackProps) => React.ReactElement;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: Array<unknown>;
  sendBeaconOnError?: boolean;
}

/**
 * Props passed to the fallback component when an error is caught
 */
export interface FallbackProps {
  error: Error;
  errorInfo: null | React.ErrorInfo;
  isChunkError: boolean;
  isRetrying: boolean;
  resetError: () => void;
  spaGuardState: SpaGuardState;
}

const DefaultFallback: React.FC<FallbackProps> = ({
  error,
  isChunkError: isChunk,
  isRetrying,
  resetError,
  spaGuardState,
}) => (
  <DefaultErrorFallback
    error={error}
    isChunkError={isChunk}
    isRetrying={isRetrying}
    onReset={resetError}
    spaGuardState={spaGuardState}
  />
);

class ErrorBoundaryImpl extends Component<
  ErrorBoundaryProps & { spaGuardState: SpaGuardState },
  { error: Error | null; errorInfo: null | React.ErrorInfo }
> {
  override state = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    const { autoRetryChunkErrors, onError, sendBeaconOnError } = this.props;

    handleErrorWithSpaGuard(error, {
      autoRetryChunkErrors,
      errorInfo,
      eventName: "react-error-boundary",
      onError: () => onError?.(error, errorInfo),
      sendBeaconOnError,
    });
  }

  override componentDidUpdate(prevProps: ErrorBoundaryProps & { spaGuardState: SpaGuardState }) {
    const { resetKeys = [] } = this.props;
    const prevResetKeys = prevProps.resetKeys ?? [];

    if (resetKeys.some((key, i) => key !== prevResetKeys[i])) {
      this.resetError();
    }
  }

  override render() {
    const { error, errorInfo } = this.state;

    if (!error) {
      return this.props.children;
    }

    const { fallback: Fallback, fallbackRender, spaGuardState } = this.props;

    const isChunk = isChunkError(error);
    const isRetrying = spaGuardState.isWaiting && spaGuardState.currentAttempt > 0;

    const fallbackProps: FallbackProps = {
      error,
      errorInfo,
      isChunkError: isChunk,
      isRetrying,
      resetError: this.resetError,
      spaGuardState,
    };

    if (fallbackRender) {
      return fallbackRender(fallbackProps);
    }

    if (Fallback) {
      return <Fallback {...fallbackProps} />;
    }

    return <DefaultFallback {...fallbackProps} />;
  }

  resetError = () => {
    this.setState({ error: null, errorInfo: null });
  };
}

/**
 * Error boundary component with spa-guard integration.
 *
 * Catches errors in child components and automatically retries chunk loading errors.
 */
export const ErrorBoundary: React.FC<ErrorBoundaryProps> = (props) => {
  const spaGuardState = useSpaGuardState();

  return <ErrorBoundaryImpl {...props} spaGuardState={spaGuardState} />;
};
