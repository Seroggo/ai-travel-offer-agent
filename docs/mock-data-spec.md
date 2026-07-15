# Mock Data Specification v0.2

> **Источник API:** официальная документация Tourvisor `tv-search-gateway 1.2.1`, проверена 15 июля 2026 года:  
> https://api.tourvisor.ru/search/docs  
>
> Все значения, не подтверждённые документацией или реальным ответом API, помечены как гипотезы первой беты.


## 1. Каталог

```text
tests/fixtures/tourvisor/
├── README.md
├── search-start-success.json
├── search-processing.json
├── search-complete.json
├── search-empty.json
├── search-error.json
├── search-partial-timeout.json
├── search-invalid-response.json
├── search-results.json
├── tour-flights-unavailable.json
└── expected/
    └── normalized-tours-summary.json
```

Все данные искусственные. Raw JSON не содержит служебных полей, меняющих схему API.

## 2. Покрытие

Fixtures проверяют:

- start;
- polling;
- complete;
- partial timeout;
- empty;
- 401/503 envelope;
- invalid response;
- 6 отелей и 7 туров;
- два тура одного отеля;
- hard/soft бюджет;
- meal mismatch;
- missing optional fields;
- unavailable flight after actualization;
- минимум три финалиста.

## 3. Условия базового запроса

```json
{
  "country": "Турция",
  "date_from": "2026-08-10",
  "date_to": "2026-08-20",
  "nights_from": 7,
  "nights_to": 9,
  "adults": 2,
  "children_ages": [8],
  "budget_max": 250000,
  "budget_mode": "hard",
  "meal": "AI",
  "meal_mode": "required",
  "hotel_stars_min": 4,
  "hotel_stars_mode": "required"
}
```

## 4. Raw candidates

| Tour | Цена | Meal | Rating | Назначение |
|---|---:|---|---:|---|
| 900101-a | 246000 | AI | 4.6 | сильный |
| 900101-b | 258000 | UAI | 4.6 | второй тур отеля |
| 900102-a | 238000 | AI | 4.4 | сильный |
| 900103-a | 272000 | UAI | 4.2 | soft-only |
| 900104-a | 219000 | HB | 3.9 | meal mismatch |
| 900105-a | 244000 | AI | 4.7 | unavailable after flights |
| 900106-a | 231000 | AI | null | incomplete |

## 5. Expected hard result

Исключаются:

- 900101-b: hard budget;
- 900103-a: hard budget;
- 900104-a: required meal;
- 900105-a: flight unavailable, если actualization enabled.

Остаются:

- 900101-a;
- 900102-a;
- 900106-a.

## 6. Expected soft result

До 275000 проходят все по цене. После meal/availability остаются:

- 900101-a;
- 900101-b;
- 900102-a;
- 900103-a;
- 900106-a.

После hotel dedup остаётся один из туров 900101.

## 7. Acceptance criteria

1. 6 hotel objects → 7 NormalizedTour.
2. ID нормализуются в string.
3. Нулевые optional fields → null.
4. `hotelPlace/flightPlace` не интерпретируются.
5. `noPlaces=true` → unavailable.
6. hard/soft budget работают.
7. meal required работает.
8. duplicate hotel collapsing выполняется после score.
9. top-3 не содержит повторов hotel_id.
10. fixture data не попадает в реальную демонстрацию.
