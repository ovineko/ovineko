import type { SpaGuardState } from "../runtime";

interface DefaultErrorFallbackProps {
  error: unknown;
  isChunkError: boolean;
  isRetrying: boolean;
  onReset?: () => void;
  spaGuardState: SpaGuardState;
}

const containerStyle: React.CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexDirection: "column",
  fontFamily: "system-ui, sans-serif",
  gap: "1rem",
  justifyContent: "center",
  minHeight: "100vh",
  padding: "2rem",
};

const errorContainerStyle: React.CSSProperties = {
  ...containerStyle,
  textAlign: "center",
};

const spinnerStyle: React.CSSProperties = {
  animation: "spin 1s linear infinite",
  border: "4px solid #f3f3f3",
  borderRadius: "50%",
  borderTop: "4px solid #3498db",
  height: "40px",
  width: "40px",
};

const headingStyle: React.CSSProperties = { margin: 0 };
const errorHeadingStyle: React.CSSProperties = { color: "#e74c3c", margin: 0 };

const textStyle: React.CSSProperties = { color: "#666", margin: 0 };
const messageStyle: React.CSSProperties = { color: "#666", maxWidth: "600px" };

const buttonContainerStyle: React.CSSProperties = { display: "flex", gap: "0.5rem" };

const baseButtonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: "4px",
  color: "white",
  cursor: "pointer",
  fontSize: "16px",
  padding: "0.75rem 1.5rem",
};

const primaryButtonStyle: React.CSSProperties = {
  ...baseButtonStyle,
  backgroundColor: "#3498db",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...baseButtonStyle,
  backgroundColor: "#95a5a6",
};

/**
 * Default fallback UI component for error boundaries.
 *
 * Shows retry progress or error message with action buttons.
 */
export const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  isChunkError: isChunk,
  isRetrying,
  onReset,
  spaGuardState,
}) => {
  if (isRetrying) {
    return (
      <div style={containerStyle}>
        <div style={spinnerStyle} />
        <h2 style={headingStyle}>Loading...</h2>
        <p style={textStyle}>Retry attempt {spaGuardState.currentAttempt}</p>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  const message = error instanceof Error ? error.message : String(error);

  return (
    <div style={errorContainerStyle}>
      <h1 style={errorHeadingStyle}>
        {isChunk ? "Failed to load module" : "Something went wrong"}
      </h1>
      <p style={messageStyle}>{message}</p>
      <div style={buttonContainerStyle}>
        {onReset && (
          <button onClick={onReset} style={primaryButtonStyle} type="button">
            Try again
          </button>
        )}
        <button
          onClick={() => globalThis.window?.location.reload()}
          style={onReset ? secondaryButtonStyle : primaryButtonStyle}
          type="button"
        >
          Reload page
        </button>
      </div>
    </div>
  );
};
