# План улучшения определения 404 ошибок для статических ресурсов

## Context

**Проблема:** Текущая реализация `isLikely404()` использует проверку по времени (прошло ли >30 секунд с загрузки страницы), что является костыльной эвристикой:

- ❌ Не срабатывает если пользователь только открыл страницу после деплоя (прошло <30 сек)
- ❌ Неудобно для тестирования (нужно ждать 30+ секунд)
- ❌ Угадываем проблему, а не определяем точно

**Текущий код** (spa-guard/spa-guard/src/common/listen/internal.ts:44):

```typescript
if (isStaticAssetError(event) && isLikely404()) {
  handleStaticAssetFailure(assetUrl);
}
```

**Цель:** Заменить проверку по времени на надежное определение через Browser APIs с progressive enhancement.

## Исследование

### Находки из веб-поиска:

1. **PerformanceResourceTiming.responseStatus** (НОВИНКА!)
   - Добавлено в Firefox 129 (август 2024)
   - Дает прямой доступ к HTTP статус коду: `entry.responseStatus === 404`
   - Ограничение: требует CORS заголовок `Access-Control-Allow-Origin` для cross-origin
   - Источники: [MDN responseStatus](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/responseStatus), [web.dev August 2024](https://web.dev/blog/web-platform-08-2024)

2. **PerformanceResourceTiming.transferSize** (текущий лучший вариант)
   - `transferSize === 0 && decodedBodySize === 0` = ресурс не загружен (404, blocked)
   - Ограничения:
     - `transferSize === 0` также может означать кеш или cross-origin без CORS
     - Safari может не показывать entries для failed requests
   - Источники: [MDN transferSize](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/transferSize), [ResourceTiming in Practice](https://nicj.net/resourcetiming-in-practice/)

3. **Vite-специфичная обработка**
   - spa-guard уже обрабатывает `vite:preloadError` событие для chunk errors! (internal.ts:140-151)
   - Это покрывает динамические импорты и CSS chunks
   - Текущая проблема только со static assets в `<script>` и `<link>` тегах

4. **Проблемы с определением 404:**
   - События `error` на `<script>` и `<link>` не содержат HTTP статус
   - Resource Timing API - единственный способ получить информацию о статусе
   - Источники: [MDN Window error event](https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event), [Vite cache invalidation](https://paulau.dev/blog/handle-version-skew-after-new-deployment-with-vite-and-vue-router/)

## Решение: Progressive Enhancement подход

Реализовать каскадную проверку с 3 уровнями:

### Уровень 1: responseStatus (самый надежный, новейший)

```typescript
if (entry.responseStatus >= 400) return true;
```

### Уровень 2: transferSize (fallback для старых браузеров)

```typescript
if (entry.transferSize === 0 && entry.decodedBodySize === 0) return true;
```

### Уровень 3: Проверка по времени (последний fallback)

```typescript
if (performance.now() > 30_000) return true;
```

## Критические файлы

1. **spa-guard/spa-guard/src/common/isStaticAssetError.ts**
   - Заменить функцию `isLikely404()`
   - Добавить функцию `checkResourceStatus(url: string): boolean`

2. **spa-guard/spa-guard/src/common/listen/internal.ts** (возможно)
   - Обновить вызов `isLikely404()` для передачи URL
   - Текущая строка 44: `if (isStaticAssetError(event) && isLikely404())`

## Детальная реализация

### Новая функция `checkResourceStatus`

```typescript
const checkResourceStatus = (url: string): boolean => {
  if (!url) return false;

  const entries = performance.getEntriesByName(url, "resource");

  // Нет записи в Performance API = ресурс не загружен
  if (entries.length === 0) return true;

  const entry = entries[entries.length - 1] as PerformanceResourceTiming;

  // Уровень 1: responseStatus (Firefox 129+, Chrome 109+)
  if ("responseStatus" in entry && entry.responseStatus) {
    return entry.responseStatus >= 400;
  }

  // Уровень 2: transferSize (широкая поддержка)
  // transferSize === 0 && decodedBodySize === 0 = не загружено (404, blocked)
  return entry.transferSize === 0 && entry.decodedBodySize === 0;
};
```

### Обновленная функция `isLikely404`

```typescript
export const isLikely404 = (url?: string, timeSinceNavMs: number = performance.now()): boolean => {
  // Если передан URL - используем Resource Timing API
  if (url) {
    return checkResourceStatus(url);
  }

  // Fallback на старую логику по времени (для backward compatibility)
  return timeSinceNavMs > 30_000;
};
```

### Обновление вызова в internal.ts

```typescript
// Было:
if (isStaticAssetError(event) && isLikely404()) {
  handleStaticAssetFailure(assetUrl);
}

// Станет:
const assetUrl = getAssetUrl(event);
if (isStaticAssetError(event) && isLikely404(assetUrl)) {
  handleStaticAssetFailure(assetUrl);
}
```

## Преимущества

1. ✅ **Точность:** Используем реальные HTTP статусы когда доступны
2. ✅ **Мгновенность:** Не зависит от времени загрузки страницы
3. ✅ **Backward compatibility:** Сохраняем старую логику как fallback
4. ✅ **Progressive enhancement:** Используем новые API где доступны
5. ✅ **Тестируемость:** Работает сразу, не нужно ждать 30 секунд

## Edge Cases

1. **Cross-origin ресурсы без CORS:**
   - `responseStatus === 0` (не поможет)
   - `transferSize === 0` (fallback сработает корректно)

2. **Safari limitations:**
   - Может не показывать entries для failed requests
   - `entries.length === 0` вернет `true` (корректно)

3. **Кешированные ресурсы:**
   - `responseStatus === 200/304` (уровень 1 определит правильно)
   - `transferSize === 0 && decodedBodySize > 0` (уровень 2 определит правильно)

## Verification

### Тестирование в DevTools:

1. **Request Blocking:**

   ```
   DevTools → Network → Request blocking → Add pattern: */*.*.js
   ```

2. **Проверка в консоли:**

   ```javascript
   // После блокировки и Store as global variable (temp1)
   testEvent(temp1);

   // Должно вернуть:
   // isStaticAssetError: true
   // FINAL RESULT: SHOULD RETRY ✓
   ```

3. **Проверка без ожидания 30 секунд:**
   - Открыть страницу
   - Сразу заблокировать main.\*.js
   - Reload
   - Retry должен сработать мгновенно

### Unit тесты:

Обновить существующие тесты в `isStaticAssetError.test.ts`:

- Добавить моки для `performance.getEntriesByName`
- Тестировать все 3 уровня fallback
- Тестировать edge cases (no entries, cross-origin, cache)

## Источники

- [PerformanceResourceTiming: responseStatus property - MDN](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/responseStatus)
- [PerformanceResourceTiming: transferSize property - MDN](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/transferSize)
- [New to the web platform in August 2024 - web.dev](https://web.dev/blog/web-platform-08-2024)
- [Handle version skew after new deployment with Vite and Vue Router](https://paulau.dev/blog/handle-version-skew-after-new-deployment-with-vite-and-vue-router/)
- [ResourceTiming in Practice - NicJ.net](https://nicj.net/resourcetiming-in-practice/)
- [Window: error event - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event)

---

# Debugger: Кнопка "Static Asset 404"

## Задача

Добавить кнопку в debugger panel для симуляции 404 ошибки статических ресурсов.

## Текущая ситуация

- Debugger panel содержит 8 кнопок для симуляции различных ошибок
- Нет кнопки для тестирования обработки 404 статических ресурсов (JS/CSS файлов)
- Проблема: `isLikely404()` проверяет `performance.now() > 30_000`, что требует ждать 30+ секунд

## Решение

Добавить 9-ю кнопку "Static Asset 404" которая:

1. Создаёт реальный `<script>` элемент с несуществующим хешированным URL
2. Автоматически рассчитывает необходимую задержку для прохождения проверки `isLikely404()`
3. Триггерит полный путь обработки: `isStaticAssetError()` → `isLikely404()` → `handleStaticAssetFailure()`

## Реализация

**Файлы для изменения:**

- `spa-guard/src/runtime/debug/errorDispatchers.ts` - добавить `dispatchStaticAsset404()`
- `spa-guard/src/runtime/debug/index.ts` - импорт и добавление в SCENARIOS
- `spa-guard/src/runtime/debug/errorDispatchers.test.ts` - unit тесты

**Workaround:**

Функция включает автоматическую задержку для обхода текущей проверки `isLikely404()` (>30s):

```typescript
const delay = timeSinceNav < 30_000 ? 30_000 - timeSinceNav + 100 : 0;
```

## Следующее улучшение

После реализации Resource Timing API подхода (см. выше), убрать задержку из `dispatchStaticAsset404()`, так как `isLikely404(url)` будет работать мгновенно.
