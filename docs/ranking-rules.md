# Фильтрация и Ranking v0.1

> **Источник API:** официальная документация Tourvisor `tv-search-gateway 1.2.1`, проверена 15 июля 2026 года:  
> https://api.tourvisor.ru/search/docs  
>
> Все значения, не подтверждённые документацией или реальным ответом API, помечены как гипотезы первой беты.


## 1. Общий принцип

Порядок обработки:

```text
NormalizedTour[]
→ hard filters
→ score 0–100
→ лучший тур каждого отеля
→ diversity adjustment
→ top-3 по стране
```

Веса являются гипотезой первой беты и должны быть скорректированы по обратной связи турагентов.

## 2. Результат фильтрации

```ts
type FilterDecision = {
  accepted: boolean;
  rejection_codes: FilterCode[];
  warning_codes: WarningCode[];
};

type FilterCode =
  | "MISSING_CRITICAL_DATA"
  | "COUNTRY_MISMATCH"
  | "DATE_MISMATCH"
  | "NIGHTS_MISMATCH"
  | "TRAVELLER_COMPOSITION_MISMATCH"
  | "HARD_BUDGET_EXCEEDED"
  | "SOFT_BUDGET_LIMIT_EXCEEDED"
  | "REQUIRED_MEAL_MISMATCH"
  | "REQUIRED_STARS_MISMATCH"
  | "REQUIRED_RATING_MISMATCH"
  | "REQUIRED_RESORT_MISMATCH"
  | "DIRECT_FLIGHT_MISMATCH"
  | "FLIGHT_UNAVAILABLE"
  | "VERIFIED_EXCLUDED_FEATURE";

type WarningCode =
  | "PRICE_ABOVE_SOFT_BUDGET"
  | "PRICE_NOT_ACTUALIZED"
  | "AVAILABILITY_NOT_VERIFIED"
  | "HOTEL_AVAILABILITY_UNKNOWN"
  | "PARTIAL_SEARCH"
  | "MISSING_RATING"
  | "MISSING_ROOM"
  | "UNVERIFIABLE_REQUIREMENT";
```

## 3. Жёсткие фильтры

| Код | Условие | Действие | Ослабление |
|---|---|---|---|
| `MISSING_CRITICAL_DATA` | нет обязательного поля нормализации | исключить | нет |
| `COUNTRY_MISMATCH` | страна не соответствует текущему поиску | исключить | нет |
| `DATE_MISMATCH` | дата вне requested range | исключить | только новым поиском |
| `NIGHTS_MISMATCH` | ночи вне range | исключить | только новым поиском |
| `TRAVELLER_COMPOSITION_MISMATCH` | состав известен и не совпадает | исключить | нет |
| `HARD_BUDGET_EXCEEDED` | hard и price > budget | исключить | только сменой budget mode |
| `SOFT_BUDGET_LIMIT_EXCEEDED` | soft и price > budget×1.10 | исключить | только новым решением |
| `REQUIRED_MEAL_MISMATCH` | meal required и ниже/неизвестно | исключить | перевести в preferred |
| `REQUIRED_STARS_MISMATCH` | stars required и ниже/неизвестно | исключить | preferred |
| `REQUIRED_RATING_MISMATCH` | rating required и ниже/неизвестно | исключить | preferred |
| `REQUIRED_RESORT_MISMATCH` | resort required и другой | исключить | preferred |
| `DIRECT_FLIGHT_MISMATCH` | direct required и подтверждён mismatch | исключить | убрать требование |
| `FLIGHT_UNAVAILABLE` | актуализация вернула noPlaces | исключить | выбрать резерв |
| `VERIFIED_EXCLUDED_FEATURE` | исключение подтверждено справочником | исключить | убрать exclusion |

### Непроверяемое критическое требование

Если требование нельзя проверить по доступным данным, вариант не исключается как mismatch. Вместо этого:

```text
warning = UNVERIFIABLE_REQUIREMENT
```

Турагенту явно сообщается, что требование требует ручной проверки.

## 4. Meal rank

Внутренний порядок для сравнения текстовых кодов:

```text
RO = 0
BB = 1
HB = 2
FB = 3
AI = 4
UAI = 5
```

Синонимы нормализуются parser/resolver. ID Tourvisor не зашиваются.

Если код неизвестен, meal считается missing.

## 5. Score 0–100

### Веса при известном бюджете

| Фактор | Вес |
|---|---:|
| Цена и соответствие бюджету | 25 |
| Рейтинг отеля | 20 |
| Питание | 15 |
| Категория | 10 |
| Дата и ночи | 10 |
| Курорт | 5 |
| Проверяемые услуги | 5 |
| Полнота данных | 10 |
| **Итого** | **100** |

### Веса при неизвестном бюджете

| Фактор | Вес |
|---|---:|
| Относительная цена | 15 |
| Рейтинг отеля | 25 |
| Питание | 15 |
| Категория | 15 |
| Дата и ночи | 10 |
| Курорт | 5 |
| Проверяемые услуги | 5 |
| Полнота данных | 10 |
| **Итого** | **100** |

## 6. Расчёт факторов

Каждый factor score находится в диапазоне 0–100.

### 6.1. Цена

Среди принятых кандидатов страны:

```ts
relative = 100 - 60 * (price - minPrice) / (maxPrice - minPrice)
```

Если все цены одинаковы: `relative = 80`.

Итог:

- hard: `relative`;
- unknown: `relative`;
- soft внутри бюджета: `relative`;
- soft выше бюджета: вычесть линейный penalty до 40 баллов factor score на границе +10%.

Factor ограничивается 0–100.

### 6.2. Рейтинг

```text
rating null → 50
rating ≤3.0 → 30
rating 3.0–5.0 → linear 30–100
```

Отсутствие рейтинга дополнительно влияет на completeness.

### 6.3. Питание

- required и прошло фильтр → 100;
- preferred exact/higher → 100;
- preferred на один уровень ниже → 50;
- preferred существенно ниже/unknown → 20;
- any → 60 neutral.

### 6.4. Категория

- required и прошло → 100;
- preferred category ≥ target → 100;
- на одну звезду ниже → 50;
- ниже → 20;
- any → `category/5×100`, null → 50.

### 6.5. Даты и ночи

Все кандидаты уже внутри диапазонов.

- точный центр даты и ночей → 100;
- граница диапазона → 75;
- если диапазон состоит из одного значения и совпадает → 100.

Используется среднее двух близостей.

### 6.6. Курорт

- required и прошло → 100;
- preferred match → 100;
- preferred no match → 40;
- any → 60.

### 6.7. Услуги

```text
matched_verified / requested_verified × 100
```

Если проверяемых услуг нет → 60 neutral.

### 6.8. Полнота

Начало 100.

Штрафы:

- нет rating: −20;
- нет category: −20;
- нет meal: −25;
- нет room: −10;
- partial search: −10;
- availability not verified: −10;
- больше двух других missing ranking fields: −10.

Минимум 0.

## 7. Итоговый score

```ts
score = sum(factorScore * factorWeight) / 100
```

Округлить до одного знака.

Score используется только внутри системы и в блоке турагенту может быть скрыт по умолчанию. Клиенту не показывается.

## 8. Дедупликация отелей

Для каждого `hotel_id` оставить тур с максимальным score.

Tie-breakers:

1. price actualized;
2. flight availability verified and not unavailable;
3. меньшая цена;
4. меньше missing fields;
5. более ранняя дата.

## 9. Top-3

Выбирается до трёх разных `hotel_id` внутри каждой страны.

Если кандидатов:

- ≥3 → top-3;
- 2 → показать 2;
- 1 → показать 1;
- 0 → no suitable results.

Автоматический `continue` не запускается.

## 10. Diversity heuristic

Если top-3 целиком относится к одному курорту, а лучший кандидат другого курорта отстаёт от третьего места не более чем на 5 score points, он заменяет третье место.

Это гипотеза первой беты. Цель — не дать почти одинаковым вариантам вытеснить осмысленную альтернативу.

При явном `resort_mode=required` diversity не применяется.

## 11. Несколько стран

Ranking выполняется независимо по каждой стране.

Страны выводятся:

1. по явному `priority`;
2. при равном приоритете — в порядке исходного сообщения.

Одна страна не вытесняет другую общим score.

## 12. Актуализация и резерв

Если актуализация финалистов включена:

1. сформировать ranked reserve до 5 отелей;
2. проверять кандидатов по порядку;
3. `FLIGHT_UNAVAILABLE` → исключить;
4. брать следующий;
5. остановиться при трёх пригодных вариантах или исчерпании пяти.

Лимит 5 — гипотеза первой беты и конфигурация.

## 13. Объяснение ranking

Для каждого финалиста сохраняются:

```ts
type RankingExplanation = {
  strengths: string[];
  compromises: string[];
  verification_needed: string[];
};
```

Формулировки создаются только из рассчитанных факторов и подтверждённых полей.

Пример:

- сильные стороны: «укладывается в бюджет», «рейтинг выше остальных», «нужное питание»;
- компромисс: «цена на 8% выше ориентира»;
- проверка: «наличие мест в отеле требует подтверждения».
