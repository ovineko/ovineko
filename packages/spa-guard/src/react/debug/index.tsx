import { type CSSProperties, useCallback, useMemo, useState } from "react";

import type { SPAGuardEvent } from "../../common/events/types";

import { useSpaGuardState } from "../index";
import { useSPAGuardEvents } from "../useSPAGuardEvents";
import {
  simulateChunkLoadError,
  simulateFinallyError,
  simulateNetworkTimeout,
  simulateRuntimeError,
} from "./errorSimulators";

export type DebugPanelPosition = "bottom-left" | "bottom-right" | "top-left" | "top-right";

export interface DebugTestPanelProps {
  defaultOpen?: boolean;
  onErrorTriggered?: (errorType: string, error: unknown) => void;
  position?: DebugPanelPosition;
}

interface ButtonState {
  label: string;
  status: ButtonStatus;
}

type ButtonStatus = "default" | "loading" | "triggered";

interface EventHistoryEntry {
  event: SPAGuardEvent;
  id: number;
  timestamp: number;
}

const POSITION_STYLES: Record<DebugPanelPosition, CSSProperties> = {
  "bottom-left": { bottom: 16, left: 16 },
  "bottom-right": { bottom: 16, right: 16 },
  "top-left": { left: 16, top: 16 },
  "top-right": { right: 16, top: 16 },
};

const PANEL_STYLE: CSSProperties = {
  background: "#1e1e2e",
  borderRadius: 8,
  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
  color: "#cdd6f4",
  fontFamily: "monospace",
  fontSize: 13,
  maxWidth: 320,
  minWidth: 260,
  padding: 12,
  position: "fixed",
  zIndex: 99_999,
};

const HEADER_STYLE: CSSProperties = {
  alignItems: "center",
  cursor: "pointer",
  display: "flex",
  justifyContent: "space-between",
  userSelect: "none",
};

const BUTTON_BASE_STYLE: CSSProperties = {
  border: "1px solid #45475a",
  borderRadius: 4,
  color: "#cdd6f4",
  cursor: "pointer",
  fontFamily: "monospace",
  fontSize: 12,
  marginTop: 6,
  padding: "6px 10px",
  textAlign: "left",
  width: "100%",
};

const CONTENT_STYLE: CSSProperties = { marginTop: 10 };

const LABEL_STYLE: CSSProperties = { color: "#a6adc8", fontSize: 11, marginBottom: 4 };

const SECTION_STYLE: CSSProperties = {
  borderTop: "1px solid #45475a",
  marginTop: 10,
  paddingTop: 8,
};

const STATE_ROW_STYLE: CSSProperties = {
  display: "flex",
  fontSize: 11,
  justifyContent: "space-between",
  marginTop: 2,
};

const STATE_VALUE_STYLE: CSSProperties = { color: "#f9e2af" };

const EVENT_LIST_STYLE: CSSProperties = {
  fontSize: 11,
  maxHeight: 120,
  overflowY: "auto",
};

const EVENT_ENTRY_STYLE: CSSProperties = {
  borderBottom: "1px solid #313244",
  padding: "3px 0",
};

const EVENT_TIME_STYLE: CSSProperties = { color: "#585b70", marginRight: 6 };

const EVENT_NAME_STYLE: CSSProperties = { color: "#89b4fa" };

const CLEAR_BUTTON_STYLE: CSSProperties = {
  background: "none",
  border: "none",
  color: "#a6adc8",
  cursor: "pointer",
  fontFamily: "monospace",
  fontSize: 11,
  padding: 0,
};

const EVENT_HEADER_STYLE: CSSProperties = {
  ...LABEL_STYLE,
  alignItems: "center",
  display: "flex",
  justifyContent: "space-between",
};

function getButtonStyle(status: ButtonStatus): CSSProperties {
  switch (status) {
    case "loading": {
      return { ...BUTTON_BASE_STYLE, background: "#585b70", opacity: 0.7 };
    }
    case "triggered": {
      return { ...BUTTON_BASE_STYLE, background: "#a6e3a1", color: "#1e1e2e" };
    }
    default: {
      return { ...BUTTON_BASE_STYLE, background: "#313244" };
    }
  }
}

const SCENARIOS = [
  { key: "chunk-load-error", label: "ChunkLoadError" },
  { key: "network-timeout", label: "Network Timeout" },
  { key: "runtime-error", label: "Runtime Error" },
  { key: "finally-error", label: "Finally Error" },
] as const;

type ScenarioKey = (typeof SCENARIOS)[number]["key"];

let nextEventId = 0;

function createInitialButtonStates(): Record<ScenarioKey, ButtonState> {
  const states = {} as Record<ScenarioKey, ButtonState>;
  for (const s of SCENARIOS) {
    states[s.key] = { label: s.label, status: "default" };
  }
  return states;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

export const DebugTestPanel = ({
  defaultOpen = true,
  onErrorTriggered,
  position = "bottom-right",
}: DebugTestPanelProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [buttonStates, setButtonStates] = useState(createInitialButtonStates);
  const [eventHistory, setEventHistory] = useState<EventHistoryEntry[]>([]);
  const spaGuardState = useSpaGuardState();

  useSPAGuardEvents(
    useCallback((event: SPAGuardEvent) => {
      setEventHistory((prev) => [...prev, { event, id: nextEventId++, timestamp: Date.now() }]);
    }, []),
  );

  const clearHistory = useCallback(() => {
    setEventHistory([]);
  }, []);

  const setButtonStatus = useCallback((key: ScenarioKey, status: ButtonStatus) => {
    setButtonStates((prev) => ({
      ...prev,
      [key]: { ...prev[key], status },
    }));
  }, []);

  const handleTrigger = useCallback(
    async (key: ScenarioKey) => {
      setButtonStatus(key, "loading");

      try {
        switch (key) {
          case "chunk-load-error": {
            await simulateChunkLoadError();
            break;
          }
          case "finally-error": {
            await simulateFinallyError();
            break;
          }
          case "network-timeout": {
            await simulateNetworkTimeout(100);
            break;
          }
          case "runtime-error": {
            simulateRuntimeError();
            break;
          }
        }
      } catch (error: unknown) {
        onErrorTriggered?.(key, error);
      } finally {
        setButtonStatus(key, "triggered");
      }
    },
    [onErrorTriggered, setButtonStatus],
  );

  const panelStyle = useMemo<CSSProperties>(
    () => ({
      ...PANEL_STYLE,
      ...POSITION_STYLES[position],
    }),
    [position],
  );

  return (
    <div data-testid="spa-guard-debug-panel" style={panelStyle}>
      <div
        data-testid="debug-panel-header"
        onClick={() => setIsOpen((o) => !o)}
        role="button"
        style={HEADER_STYLE}
        tabIndex={0}
      >
        <span>spa-guard debug</span>
        <span>{isOpen ? "\u25B2" : "\u25BC"}</span>
      </div>

      {isOpen && (
        <div data-testid="debug-panel-content" style={CONTENT_STYLE}>
          <div style={LABEL_STYLE}>Error Scenarios</div>
          {SCENARIOS.map((scenario) => {
            const state = buttonStates[scenario.key];
            return (
              <button
                data-testid={`debug-btn-${scenario.key}`}
                disabled={state.status === "loading"}
                key={scenario.key}
                onClick={() => handleTrigger(scenario.key)}
                style={getButtonStyle(state.status)}
                type="button"
              >
                {state.status === "loading"
                  ? `${state.label}...`
                  : state.status === "triggered"
                    ? `${state.label} \u2713`
                    : state.label}
              </button>
            );
          })}

          <div data-testid="debug-state-section" style={SECTION_STYLE}>
            <div style={LABEL_STYLE}>State</div>
            <div data-testid="debug-state-attempt" style={STATE_ROW_STYLE}>
              <span>attempt</span>
              <span style={STATE_VALUE_STYLE}>{spaGuardState.currentAttempt}</span>
            </div>
            <div data-testid="debug-state-waiting" style={STATE_ROW_STYLE}>
              <span>isWaiting</span>
              <span style={STATE_VALUE_STYLE}>{String(spaGuardState.isWaiting)}</span>
            </div>
            <div data-testid="debug-state-fallback" style={STATE_ROW_STYLE}>
              <span>isFallbackShown</span>
              <span style={STATE_VALUE_STYLE}>{String(spaGuardState.isFallbackShown)}</span>
            </div>
          </div>

          <div data-testid="debug-events-section" style={SECTION_STYLE}>
            <div style={EVENT_HEADER_STYLE}>
              <span>Event History ({eventHistory.length})</span>
              <button
                data-testid="debug-clear-history"
                onClick={clearHistory}
                style={CLEAR_BUTTON_STYLE}
                type="button"
              >
                clear
              </button>
            </div>
            <div data-testid="debug-event-list" style={EVENT_LIST_STYLE}>
              {eventHistory.map((entry) => (
                <div data-testid="debug-event-entry" key={entry.id} style={EVENT_ENTRY_STYLE}>
                  <span style={EVENT_TIME_STYLE}>{formatTime(entry.timestamp)}</span>
                  <span style={EVENT_NAME_STYLE}>{entry.event.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
