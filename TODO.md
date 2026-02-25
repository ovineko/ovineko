# TODO: Fix SPA Guard Infinite Reload Loop

## Problem

После исчерпания retry attempts, когда происходит ошибка загрузки статического ресурса, система входит в бесконечный цикл перезагрузки.

## Implementation Tasks

- [ ] 1. Create fallback state module
  - File: `spa-guard/spa-guard/src/common/fallbackState.ts`
  - Implement `isInFallbackMode()`, `setFallbackMode()`, `resetFallbackMode()`

- [ ] 2. Add fallback mode constant
  - File: `spa-guard/spa-guard/src/common/constants.ts`
  - Add: `export const fallbackModeKey = Symbol.for(\`\${name}:fallback-mode\`);`

- [ ] 3. Guard static asset recovery
  - File: `spa-guard/spa-guard/src/common/staticAssetRecovery.ts`
  - Add early return in `handleStaticAssetFailure()` if in fallback mode

- [ ] 4. Set fallback mode in reload logic
  - File: `spa-guard/spa-guard/src/common/reload.ts`
  - Add 4 changes:
    - Guard at entry of `attemptReload()`
    - Set flag when `currentAttempt === -1`
    - Set flag when retry exhausted
    - Set flag in `showFallbackUI()`

- [ ] 5. Export for testing
  - File: `spa-guard/spa-guard/src/common/exports.ts`
  - Export `isInFallbackMode` and `resetFallbackMode`

- [ ] 6. Create unit tests
  - File: `spa-guard/spa-guard/src/common/fallbackState.test.ts`
  - Test all functions in fallback state module

- [ ] 7. Update existing tests
  - Update: `staticAssetRecovery.test.ts`
  - Update: `reload.test.ts`
  - Update: `listen/internal.test.ts`

- [ ] 8. Run tests and verify
  - Run `npm test` in spa-guard package
  - Manual test with debug panel

## Verification Steps

1. Click "Retry Exhausted" button → should show fallback UI
2. Click "Static Asset 404" button → should NOT trigger reload loop
3. Check console for no infinite "Scheduling reload" messages
4. All tests should pass
