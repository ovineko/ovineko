import { useLayoutEffect, useMemo, useRef } from "react";

import type { SpaGuardState } from "../runtime";

import { defaultErrorFallbackHtml, defaultLoadingFallbackHtml } from "./fallbackHtml.generated";
import { getOptions } from "./options";

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

const reloadHandler = () => location.reload();

/**
 * Build final HTML by parsing the template in a virtual container
 * and patching content via data attributes. This is robust against
 * template changes (minification, styling, element order).
 */
function buildHtml(
  template: string,
  patches: {
    actions?: Record<string, boolean>;
    content?: Record<string, string>;
    sections?: Record<string, boolean>;
    spinnerHtml?: string;
  },
): string {
  const container = document.createElement("div");
  container.innerHTML = template;

  if (patches.spinnerHtml) {
    const spinnerEl = container.querySelector("[data-spa-guard-spinner]");
    if (spinnerEl) {
      spinnerEl.innerHTML = patches.spinnerHtml;
    }
  }

  if (patches.content) {
    for (const [key, value] of Object.entries(patches.content)) {
      const el = container.querySelector(`[data-spa-guard-content="${key}"]`);
      if (el) {
        el.innerHTML = value;
      }
    }
  }

  if (patches.sections) {
    for (const [key, visible] of Object.entries(patches.sections)) {
      const el = container.querySelector<HTMLElement>(`[data-spa-guard-section="${key}"]`);
      if (el) {
        el.style.display = visible ? "block" : "none";
      }
    }
  }

  if (patches.actions) {
    for (const [key, visible] of Object.entries(patches.actions)) {
      const el = container.querySelector<HTMLElement>(`[data-spa-guard-action="${key}"]`);
      if (el) {
        el.style.display = visible ? "inline-block" : "none";
      }
    }
  }

  return container.innerHTML;
}

/**
 * Default fallback UI component for error boundaries.
 *
 * Uses two separate HTML templates: one for loading/retrying state
 * and one for error state. Renders via dangerouslySetInnerHTML with
 * virtual container + data attribute patching for dynamic content.
 */
export const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  isChunkError: isChunk,
  isRetrying,
  onReset,
  spaGuardState,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const html = useMemo(() => {
    if (isRetrying) {
      const opts = getOptions();
      return buildHtml(defaultLoadingFallbackHtml, {
        content: {
          attempt: String(spaGuardState.currentAttempt),
        },
        sections: {
          retrying: true,
        },
        spinnerHtml: opts.spinner?.content,
      });
    }

    const heading = isChunk ? "Failed to load module" : "Something went wrong";
    const message = error instanceof Error ? error.message : String(error);

    return buildHtml(defaultErrorFallbackHtml, {
      actions: {
        "try-again": Boolean(onReset),
      },
      content: {
        heading: escapeHtml(heading),
        message: escapeHtml(message),
      },
    });
  }, [isRetrying, isChunk, error, onReset, spaGuardState.currentAttempt]);

  // eslint-disable-next-line fsecond/valid-event-listener -- Intentional: imperative DOM binding for dangerouslySetInnerHTML content; buttons are not React elements
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    const reloadBtn = el.querySelector('[data-spa-guard-action="reload"]');
    reloadBtn?.addEventListener("click", reloadHandler);

    const tryAgainHandler = onReset ? () => onReset() : null;
    const tryAgainBtn = onReset ? el.querySelector('[data-spa-guard-action="try-again"]') : null;
    if (tryAgainHandler && tryAgainBtn) {
      tryAgainBtn.addEventListener("click", tryAgainHandler);
    }

    return () => {
      reloadBtn?.removeEventListener("click", reloadHandler);
      if (tryAgainHandler && tryAgainBtn) {
        tryAgainBtn.removeEventListener("click", tryAgainHandler);
      }
    };
  }, [onReset, html]);

  const innerHtml = useMemo(() => ({ __html: html }), [html]);

  return <div dangerouslySetInnerHTML={innerHtml} ref={containerRef} />;
};
