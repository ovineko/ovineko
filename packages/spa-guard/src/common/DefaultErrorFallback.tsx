import { useLayoutEffect, useMemo, useRef } from "react";

import type { SpaGuardState } from "../runtime";

import { defaultErrorFallbackHtml, defaultLoadingFallbackHtml } from "./fallbackHtml.generated";

interface DefaultErrorFallbackProps {
  error: unknown;
  isChunkError: boolean;
  isRetrying: boolean;
  onReset?: () => void;
  spaGuardState: SpaGuardState;
}

const escapeHtml = (str: string): string =>
  str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/**
 * Default fallback UI component for error boundaries.
 *
 * Uses two separate HTML templates: one for loading/retrying state
 * and one for error state. Renders via dangerouslySetInnerHTML with
 * string replacements for dynamic content.
 */
export const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  isChunkError: isChunk,
  isRetrying,
  onReset,
  spaGuardState,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  let html: string;

  if (isRetrying) {
    html = defaultLoadingFallbackHtml
      .replace(
        'data-spa-guard-section="retrying" style="display:none"',
        'data-spa-guard-section="retrying" style="display:block"',
      )
      .replace(
        'Retry attempt <span data-spa-guard-content="attempt"></span>',
        `Retry attempt ${spaGuardState.currentAttempt}`,
      );
  } else {
    const heading = isChunk ? "Failed to load module" : "Something went wrong";
    const message = error instanceof Error ? error.message : String(error);

    html = defaultErrorFallbackHtml
      .replace(">Something went wrong</h1>", `>${escapeHtml(heading)}</h1>`)
      .replace(">Please refresh the page to continue.</p>", `>${escapeHtml(message)}</p>`);

    if (onReset) {
      html = html.replace(
        'data-spa-guard-action="try-again" type="button" style="display:none"',
        'data-spa-guard-action="try-again" type="button" style="display:inline-block"',
      );
    }
  }

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    if (onReset) {
      const tryAgainBtn = el.querySelector('[data-spa-guard-action="try-again"]');
      if (tryAgainBtn) {
        const handler = () => onReset();
        tryAgainBtn.addEventListener("click", handler);
        return () => tryAgainBtn.removeEventListener("click", handler);
      }
    }
  }, [onReset, html]);

  const innerHtml = useMemo(() => ({ __html: html }), [html]);

  return <div dangerouslySetInnerHTML={innerHtml} ref={containerRef} />;
};
