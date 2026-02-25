import { emitEvent, getLogger } from "./events/internal";
import { applyI18n, getI18n } from "./i18n";
import { getOptions } from "./options";
import { getRetryStateFromUrl } from "./retryState";

/**
 * Renders the fallback UI into the DOM.
 *
 * This is a pure rendering helper. It has no lifecycle side effects:
 * it does not set fallback mode, does not check whether fallback mode is
 * already active, and does not modify orchestrator state. The caller is
 * responsible for ensuring the lifecycle transition has already occurred
 * before invoking this function.
 *
 * Fails safely: if fallback HTML is not configured or the target element
 * is not found, logs a warning and returns without side effects or errors.
 */
export const showFallbackUI = (): void => {
  const options = getOptions();
  const fallbackHtml = options.html?.fallback?.content;
  const selector = options.html?.fallback?.selector ?? "body";

  if (!fallbackHtml) {
    getLogger()?.noFallbackConfigured();
    emitEvent({ name: "fallback-ui-not-rendered", reason: "no-html-configured" });
    return;
  }

  try {
    const targetElement = document.querySelector(selector);
    if (!targetElement) {
      getLogger()?.fallbackTargetNotFound(selector);
      emitEvent({ name: "fallback-ui-not-rendered", reason: "target-not-found", selector });
      return;
    }

    const container = document.createElement("div");
    container.innerHTML = fallbackHtml;

    const t = getI18n();
    if (t) {
      applyI18n(container, t);
    }

    targetElement.innerHTML = container.innerHTML;

    const reloadBtn = targetElement.querySelector('[data-spa-guard-action="reload"]');
    if (reloadBtn) {
      reloadBtn.addEventListener("click", () => globalThis.window.location.reload());
    }

    const retryState = getRetryStateFromUrl();
    if (retryState) {
      const retryIdElements = document.getElementsByClassName("spa-guard-retry-id");
      for (const element of retryIdElements) {
        element.textContent = retryState.retryId;
      }
    }

    emitEvent({
      name: "fallback-ui-shown",
    });
  } catch (error) {
    getLogger()?.fallbackInjectFailed(error);
  }
};
