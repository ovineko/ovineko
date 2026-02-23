# Update spa-guard default parameters based on independent code analysis

## Overview

Independent investigation of TODO.md claims against actual code behavior. After thorough analysis, only ONE default needs changing: `checkVersion.interval`. The other proposals in TODO.md are based on incomplete analysis of the code.

## Independent Analysis vs TODO.md

### AGREE: checkVersion.interval needs increasing (but to 5min, not 10min)

Current: 60_000ms (1 minute). Proposed by TODO.md: 600_000ms (10 minutes).
My recommendation: 300_000ms (5 minutes).

Rationale:

- 1-minute polling is unnecessarily aggressive for deployment detection
- The version checker already pauses when tab is hidden or window is unfocused (checkVersion.ts lines 115-201), which the TODO.md ignores when calculating "battery drain"
- HTML mode (default) re-fetches the entire page on each check - a heavier operation than a lightweight JSON ping
- 5 minutes balances responsiveness (users get updates within 5 min) with resource efficiency
- 10 minutes (TODO.md proposal) is too conservative - the whole point is proactive detection before chunk errors happen

### DISAGREE: minTimeBetweenResets should NOT change

Current: 5000ms. TODO.md proposes: 300_000ms (5 minutes).

The TODO.md analysis is flawed because it ignores the `PAGE_LOAD_BUFFER_MS` constant of 30,000ms in lastReloadTime.ts (line 108). The actual reset condition is:
timeSinceReload > previousDelay + 30_000ms

This means a retry cycle can ONLY reset after 31+ seconds have passed since the last reload. The "12 resets per minute" scenario described in TODO.md is impossible with the current code.

The `minTimeBetweenResets` is a secondary guard against rapid successive resets. The 30-second page load buffer is the primary protection. Increasing to 5 minutes would harm user experience: if a user encounters an error, successfully uses the app for 2 minutes, then hits another error, the 5-minute guard would prevent a fresh retry cycle, forcing them through remaining accumulated retry state.

### DISAGREE: reloadDelays should NOT change to [1000, 2000, 4000]

Current: [1000, 2000, 5000]. TODO.md proposes: [1000, 2000, 4000].

The "purer exponential" argument (1-2-4 vs 1-2-5) is aesthetic, not practical. The extra 1 second on the third attempt gives infrastructure more recovery time between the second and third reload - this is arguably better for chunk load recovery. Total difference is 1 second (7s vs 8s), which is negligible.

### DISAGREE: Jitter should NOT be added

TODO.md proposes adding +-10% jitter to reload delays, citing AWS/Google thundering herd recommendations.

Problems:

- AWS/Google jitter recommendations target API retries against a single backend, NOT static asset fetching from CDNs
- +-10% jitter on 1000ms creates a 200ms spread window - not enough to meaningfully distribute load
- Natural network variability (DNS resolution, TCP handshake, TLS, download speed) already provides organic jitter far exceeding 10%
- CDNs are designed to handle concurrent requests for the same asset across edge locations
- Adding jitter introduces code complexity and makes tests non-deterministic (requires mocking Math.random)

## Context

- Files involved:
  - Modify: `packages/spa-guard/src/common/options.ts` (default value + JSDoc)
  - Modify: `packages/spa-guard/src/common/checkVersion.ts` (fallback value in startVersionCheck)
  - Modify: `packages/spa-guard/README.md` (all mentions of 60_000 / 60s interval)
- Related patterns: Default values defined in options.ts, with fallback values repeated in code
- Dependencies: None

## Development Approach

- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Update checkVersion.interval default from 60_000 to 300_000

**Files:**

- Modify: `packages/spa-guard/src/common/options.ts`
- Modify: `packages/spa-guard/src/common/checkVersion.ts`

- [x] In options.ts line 8: change `interval: 60_000` to `interval: 300_000`
- [x] In options.ts line 49: update JSDoc `@default 60000` to `@default 300000`
- [x] In checkVersion.ts line 165: change fallback `?? 60_000` to `?? 300_000`
- [x] Review and update tests in checkVersion.test.ts that assert on the old 60_000 value
- [x] Run project test suite - must pass before task 2

### Task 2: Update README.md

**Files:**

- Modify: `packages/spa-guard/README.md`

- [x] Update Options Interface section: `interval?: number; // Polling interval in ms (default: 60000)` to 300000
- [x] Update Default values block: `interval: 60_000` to `300_000`
- [x] Update Version Checker Configuration example: `interval: 60_000, // polling interval in ms (default: 60s)` to 300_000 / 5min
- [x] Update API Reference Options section: same interval default comment
- [x] Verify no other 60_000/60s references remain related to checkVersion
- [x] Run project test suite - must pass before task 3

### Task 3: Verify acceptance criteria

- [ ] Run full test suite: `cd packages/spa-guard && pnpm test`
- [ ] Run linter: `pnpm lint` (or project-specific command)
- [ ] Verify test coverage meets 80%+
- [ ] Grep codebase for remaining `60_000` or `60000` references to ensure consistency

### Task 4: Update documentation

- [ ] Delete TODO.md (it contains inaccurate recommendations that could mislead future contributors)
- [ ] Move this plan to `docs/plans/completed/`
