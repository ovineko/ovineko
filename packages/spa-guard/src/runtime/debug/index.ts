import type { SPAGuardEvent } from "../../common/events/types";

import { subscribe } from "../../common/events/internal";
import { subscribeToState } from "../state";
import {
  dispatchAsyncRuntimeError,
  dispatchChunkLoadError,
  dispatchFinallyError,
  dispatchNetworkTimeout,
} from "./errorDispatchers";

type ButtonStatus = "default" | "loading" | "triggered";
type Position = "bottom-left" | "bottom-right" | "top-left" | "top-right";

interface Scenario {
  dispatch: () => void;
  key: string;
  label: string;
}

const SCENARIOS: Scenario[] = [
  { dispatch: dispatchChunkLoadError, key: "chunk-load-error", label: "ChunkLoadError" },
  { dispatch: () => dispatchNetworkTimeout(100), key: "network-timeout", label: "Network Timeout" },
  { dispatch: dispatchAsyncRuntimeError, key: "runtime-error", label: "Runtime Error" },
  { dispatch: dispatchFinallyError, key: "finally-error", label: "Finally Error" },
];

const POSITION_MAP: Record<Position, string> = {
  "bottom-left": "bottom:16px;left:16px;",
  "bottom-right": "bottom:16px;right:16px;",
  "top-left": "top:16px;left:16px;",
  "top-right": "top:16px;right:16px;",
};

const MAX_EVENT_HISTORY = 100;

let activeInstance: (() => void) | null = null;

/**
 * Creates a debug panel for spa-guard that displays state, events,
 * and provides error simulation buttons.
 *
 * Returns a cleanup function that removes the panel and unsubscribes all listeners.
 */
export function createDebugger(options?: {
  defaultOpen?: boolean;
  position?: Position;
}): () => void {
  if (activeInstance) {
    console.warn("[spa-guard] Debug panel already exists. Returning existing cleanup function.");
    return activeInstance;
  }

  let isOpen = options?.defaultOpen ?? true;
  const unsubscribers: (() => void)[] = [];
  const panel = el(
    "div",
    `background:#1e1e2e;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.3);color:#cdd6f4;font-family:monospace;font-size:13px;max-width:320px;min-width:260px;padding:12px;position:fixed;z-index:99999;${POSITION_MAP[options?.position ?? "bottom-right"]}`,
    "spa-guard-debug-panel",
  );
  const { arrow, header } = createHeader(isOpen);
  const content = buildContent(unsubscribers);

  panel.append(header);
  header.addEventListener("click", () => {
    isOpen = !isOpen;
    arrow.textContent = isOpen ? "\u25B2" : "\u25BC";
    if (isOpen) {
      panel.append(content);
    } else {
      content.remove();
    }
  });
  if (isOpen) {
    panel.append(content);
  }
  document.body.append(panel);

  const destroy = (): void => {
    for (const unsub of unsubscribers) {
      unsub();
    }
    panel.remove();
    activeInstance = null;
  };
  activeInstance = destroy;
  return destroy;
}

function buildContent(unsubscribers: (() => void)[]): HTMLDivElement {
  const content = el("div", "margin-top:10px;", "debug-panel-content");
  createButtons(content);
  content.append(createStateSection(unsubscribers), createEventsSection(unsubscribers));
  return content;
}

function createButtons(content: HTMLElement): void {
  const label = el("div", "color:#a6adc8;font-size:11px;margin-bottom:4px;");
  label.textContent = "Error Scenarios";
  content.append(label);

  for (const scenario of SCENARIOS) {
    const btn = el("button", getButtonCss("default"), `debug-btn-${scenario.key}`);
    btn.setAttribute("type", "button");
    btn.textContent = scenario.label;

    btn.addEventListener("click", () => {
      btn.textContent = getButtonLabel(scenario.label, "loading");
      btn.setAttribute("style", getButtonCss("loading"));
      btn.disabled = true;
      scenario.dispatch();
      // eslint-disable-next-line sonarjs/void-use -- Intentional: delay triggered state to next microtask
      void Promise.resolve().then(() => {
        btn.textContent = getButtonLabel(scenario.label, "triggered");
        btn.setAttribute("style", getButtonCss("triggered"));
        btn.disabled = false;
      });
    });

    content.append(btn);
  }
}

function createEventListHeader(): {
  clearBtn: HTMLButtonElement;
  countSpan: HTMLSpanElement;
  headerContainer: HTMLDivElement;
} {
  const headerContainer = el(
    "div",
    "color:#a6adc8;font-size:11px;margin-bottom:4px;align-items:center;display:flex;justify-content:space-between;",
  );
  const countSpan = document.createElement("span");
  countSpan.textContent = "Event History (0)";

  const clearBtn = el(
    "button",
    "background:none;border:none;color:#a6adc8;cursor:pointer;font-family:monospace;font-size:11px;padding:0;",
    "debug-clear-history",
  );
  clearBtn.setAttribute("type", "button");
  clearBtn.textContent = "clear";
  headerContainer.append(countSpan, clearBtn);

  return { clearBtn, countSpan, headerContainer };
}

function createEventsSection(unsubscribers: (() => void)[]): HTMLDivElement {
  const section = el(
    "div",
    "border-top:1px solid #45475a;margin-top:10px;padding-top:8px;",
    "debug-events-section",
  );
  const { clearBtn, countSpan, headerContainer } = createEventListHeader();
  section.append(headerContainer);

  const eventList = el(
    "div",
    "font-size:11px;max-height:120px;overflow-y:auto;",
    "debug-event-list",
  );
  section.append(eventList);

  wireEventSubscription(countSpan, clearBtn, eventList, unsubscribers);
  return section;
}

function createHeader(isOpen: boolean): {
  arrow: HTMLSpanElement;
  header: HTMLButtonElement;
} {
  const header = el(
    "button",
    "align-items:center;background:none;border:none;color:inherit;cursor:pointer;display:flex;font-family:inherit;font-size:inherit;justify-content:space-between;padding:0;user-select:none;width:100%;",
    "debug-panel-header",
  );
  header.setAttribute("type", "button");
  const label = document.createElement("span");
  label.textContent = "spa-guard debug";
  const arrow = document.createElement("span");
  arrow.textContent = isOpen ? "\u25B2" : "\u25BC";
  header.append(label, arrow);
  return { arrow, header };
}

function createStateRow(
  testId: string,
  labelText: string,
): {
  row: HTMLDivElement;
  value: HTMLSpanElement;
} {
  const row = el(
    "div",
    "display:flex;font-size:11px;justify-content:space-between;margin-top:2px;",
    testId,
  );
  const label = document.createElement("span");
  label.textContent = labelText;
  const value = el("span", "color:#f9e2af;");
  row.append(label, value);
  return { row, value };
}

function createStateSection(unsubscribers: (() => void)[]): HTMLDivElement {
  const section = el(
    "div",
    "border-top:1px solid #45475a;margin-top:10px;padding-top:8px;",
    "debug-state-section",
  );
  const label = el("div", "color:#a6adc8;font-size:11px;margin-bottom:4px;");
  label.textContent = "State";

  const attempt = createStateRow("debug-state-attempt", "attempt");
  const waiting = createStateRow("debug-state-waiting", "isWaiting");
  const fallback = createStateRow("debug-state-fallback", "isFallbackShown");

  section.append(label, attempt.row, waiting.row, fallback.row);

  unsubscribers.push(
    subscribeToState((state) => {
      attempt.value.textContent = String(state.currentAttempt);
      waiting.value.textContent = String(state.isWaiting);
      fallback.value.textContent = String(state.isFallbackShown);
    }),
  );

  return section;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  css: string,
  testId?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.setAttribute("style", css);
  if (testId) {
    e.dataset.testid = testId;
  }
  return e;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

function getButtonCss(status: ButtonStatus): string {
  const base =
    "border:1px solid #45475a;border-radius:4px;color:#cdd6f4;cursor:pointer;font-family:monospace;font-size:12px;margin-top:6px;padding:6px 10px;text-align:left;width:100%;";
  switch (status) {
    case "loading": {
      return base + "background:#585b70;opacity:0.7;";
    }
    case "triggered": {
      return base + "background:#a6e3a1;color:#1e1e2e;";
    }
    default: {
      return base + "background:#313244;";
    }
  }
}

function getButtonLabel(label: string, status: ButtonStatus): string {
  switch (status) {
    case "loading": {
      return `${label}...`;
    }
    case "triggered": {
      return `${label} \u2713`;
    }
    default: {
      return label;
    }
  }
}

function wireEventSubscription(
  countSpan: HTMLSpanElement,
  clearBtn: HTMLButtonElement,
  eventList: HTMLDivElement,
  unsubscribers: (() => void)[],
): void {
  let history: { event: SPAGuardEvent; timestamp: number }[] = [];

  function render(): void {
    countSpan.textContent = `Event History (${String(history.length)})`;
    eventList.innerHTML = "";
    for (const entry of history) {
      const row = el("div", "border-bottom:1px solid #313244;padding:3px 0;", "debug-event-entry");
      const time = el("span", "color:#585b70;margin-right:6px;");
      time.textContent = formatTime(entry.timestamp);
      const name = el("span", "color:#89b4fa;");
      name.textContent = entry.event.name;
      row.append(time, name);
      eventList.append(row);
    }
  }

  clearBtn.addEventListener("click", () => {
    history = [];
    render();
  });

  unsubscribers.push(
    subscribe((event: SPAGuardEvent) => {
      history = [...history, { event, timestamp: Date.now() }];
      if (history.length > MAX_EVENT_HISTORY) {
        history = history.slice(-MAX_EVENT_HISTORY);
      }
      render();
    }),
  );
}
