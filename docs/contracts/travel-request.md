# Контракт `TravelSearchRequest` v0.4

> **Источник API:** официальная документация Tourvisor `tv-search-gateway 1.2.1`, проверена 15 июля 2026 года:  
> https://api.tourvisor.ru/search/docs  
>
> Все значения, не подтверждённые документацией или реальным ответом API, помечены как гипотезы первой беты.


## 1. Назначение

`TravelSearchRequest` — внутренний контракт, не зависящий от названий query-параметров Tourvisor.

LLM заполняет человеческие значения. ID справочников разрешаются детерминированным resolver.

## 2. Типы

```ts
type RequirementMode = "required" | "preferred" | "any";

type BudgetMode = "hard" | "soft" | "unknown";

type BudgetSource =
  | "provided"
  | "missing"
  | "explicitly_unknown";

type Destination = {
  country_name: string;
  country_id: number | null;
  priority: number;

  resort_preferences: string[];
  resort_mode: RequirementMode;
  region_ids: number[];

  hotel_service_ids: number[];
};

type TravelSearchRequest = {
  schema_version: "0.4";
  free_text: string;

  departure_city: string | null;
  departure_id: number | null;

  destinations: Destination[];

  date_from: string | null;
  date_to: string | null;
  nights_from: number | null;
  nights_to: number | null;

  adults: number | null;
  children_ages: number[];

  budget_max: number | null;
  budget_mode: BudgetMode;
  budget_source: BudgetSource;

  currency: string;

  meal_preferences: string[];
  meal_id: number | null;
  meal_mode: RequirementMode;

  hotel_stars_min: number | null;
  hotel_stars_mode: RequirementMode;

  hotel_rating_min: number | null;
  hotel_rating_mode: RequirementMode;

  direct_flight_only: boolean;
  charter_only: boolean;

  max_sea_distance_m: number | null;
  sea_distance_mode: RequirementMode;

  hotel_preferences: string[];
  required_features: string[];
  excluded_features: string[];

  assumptions: string[];
  unverifiable_requirements: string[];

  missing_required_fields: string[];
  missing_recommended_fields: string[];
};
```

## 3. Почему добавлены `RequirementMode`

Без режима нельзя детерминированно различать:

- «только All Inclusive»;
- «желательно All Inclusive»;
- «питание не важно».

`required` создаёт жёсткий фильтр, только если параметр можно проверить по данным Tourvisor.

`preferred` влияет на score, но не исключает вариант.

`any` не влияет на фильтрацию и ranking.

## 4. Поля и обязательность

| Поле | Тип | Обязательность | Default | Можно предположить | Уточнение |
|---|---|---|---|---|---|
| `free_text` | string | Да | — | Нет | Нет |
| `departure_city` | string/null | Критически | null | Нет | Да |
| `departure_id` | number/null | Технически | null | Нет, только справочник | Не у пользователя |
| `destinations` | array | Критически | [] | Нет | Да |
| `date_from` | date/null | Критически | null | Только из однозначной даты | Да |
| `date_to` | date/null | Критически | null | Равна `date_from`, если указана одна точная дата | Да при неоднозначности |
| `nights_from` | int/null | Критически | null | «Неделя» → 7 с assumption | Да |
| `nights_to` | int/null | Критически | null | Равна `nights_from`, если одно число | Да |
| `adults` | int/null | Критически | null | «Мы вдвоём» → 2 | Да |
| `children_ages` | int[] | Критически при детях | [] | Никогда | Да |
| `budget_max` | number/null | Желательно | null | Нет | Один раз |
| `budget_mode` | enum | Да | unknown | По формулировке | Нет |
| `budget_source` | enum | Да | missing | По runtime | Нет |
| `currency` | string | Технически | RUB | Да для российского пилота | Нет |
| `meal_preferences` | string[] | Нет | [] | Нет | Нет |
| `meal_mode` | enum | Да | any | По формулировке | Нет |
| `hotel_stars_min` | int/null | Нет | null | Нет | Нет |
| `hotel_rating_min` | number/null | Нет | null | Нет | Нет |
| `direct_flight_only` | boolean | Да | false | Нет | Нет |
| `charter_only` | boolean | Да | false | Нет | Нет |
| `max_sea_distance_m` | number/null | Нет | null | Нет | Нет |
| свободные предпочтения | string[] | Нет | [] | Нет | Нет |

## 5. Ограничения

До запуска поиска:

- минимум одна страна;
- диапазон дат ≤ 21 дня;
- ночи 1–28;
- `nights_to - nights_from ≤ 10`;
- взрослые 1–6;
- максимум три ребёнка;
- возраст ребёнка 0–17;
- `budget_max > 0`, если задан;
- звёздность 1–5;
- рейтинг 0–5.

## 6. Бюджет

### Hard

Фразы:

- до 250 тысяч;
- максимум 250;
- не дороже 250.

```json
{
  "budget_max": 250000,
  "budget_mode": "hard",
  "budget_source": "provided"
}
```

Поведение:

- `priceTo = 250000`;
- всё выше исключается.

### Soft

Фразы:

- примерно 250 тысяч;
- ориентир 250;
- желательно уложиться.

```json
{
  "budget_max": 250000,
  "budget_mode": "soft",
  "budget_source": "provided"
}
```

Поведение:

- `priceTo = 275000`;
- до +10% допускается;
- превышение снижает score и показывается турагенту.

### Unknown

Если бюджета нет в исходном запросе:

```json
{
  "budget_max": null,
  "budget_mode": "unknown",
  "budget_source": "missing"
}
```

Система один раз задаёт вопрос.

После «без бюджета»:

```json
{
  "budget_max": null,
  "budget_mode": "unknown",
  "budget_source": "explicitly_unknown"
}
```

`priceTo` не передаётся.

Состояние попытки уточнения хранится в runtime-сессии:

```ts
budget_clarification_attempted: boolean;
```

## 7. Несколько стран

```json
{
  "destinations": [
    {
      "country_name": "Турция",
      "country_id": null,
      "priority": 1,
      "resort_preferences": [],
      "resort_mode": "any",
      "region_ids": [],
      "hotel_service_ids": []
    },
    {
      "country_name": "Египет",
      "country_id": null,
      "priority": 2,
      "resort_preferences": [],
      "resort_mode": "any",
      "region_ids": [],
      "hotel_service_ids": []
    }
  ]
}
```

Каждая страна создаёт отдельный `TourvisorSearchParams`.

## 8. Непроверяемые требования

Фразы вроде:

- современный отель;
- хороший пляж;
- тихая атмосфера;
- свежий ремонт;
- подходит детям

не должны автоматически становиться фактами.

Если точного service ID нет, требование переносится в:

```ts
unverifiable_requirements: string[];
```

Оно показывается турагенту, но не используется как жёсткий фильтр.

## 9. Логика уточнения

```text
missing_required_fields не пуст
или budget_source = missing и вопрос ещё не задавался
→ один объединённый вопрос
```

После ответа:

- критические поля заполнены → поиск;
- бюджет явно неизвестен → поиск без priceTo;
- критические поля не заполнены → STOP_VALIDATION_FAILED.

## 10. Пример

```json
{
  "schema_version": "0.4",
  "free_text": "Турция или Египет, двое взрослых и ребёнок 8 лет, вылет из Екатеринбурга 10–20 августа, 7–9 ночей, примерно 250 тысяч, желательно всё включено, отель от 4 звёзд.",
  "departure_city": "Екатеринбург",
  "departure_id": null,
  "destinations": [
    {
      "country_name": "Турция",
      "country_id": null,
      "priority": 1,
      "resort_preferences": [],
      "resort_mode": "any",
      "region_ids": [],
      "hotel_service_ids": []
    },
    {
      "country_name": "Египет",
      "country_id": null,
      "priority": 2,
      "resort_preferences": [],
      "resort_mode": "any",
      "region_ids": [],
      "hotel_service_ids": []
    }
  ],
  "date_from": "2026-08-10",
  "date_to": "2026-08-20",
  "nights_from": 7,
  "nights_to": 9,
  "adults": 2,
  "children_ages": [8],
  "budget_max": 250000,
  "budget_mode": "soft",
  "budget_source": "provided",
  "currency": "RUB",
  "meal_preferences": ["all inclusive"],
  "meal_id": null,
  "meal_mode": "preferred",
  "hotel_stars_min": 4,
  "hotel_stars_mode": "required",
  "hotel_rating_min": null,
  "hotel_rating_mode": "any",
  "direct_flight_only": false,
  "charter_only": false,
  "max_sea_distance_m": null,
  "sea_distance_mode": "any",
  "hotel_preferences": ["современный семейный отель"],
  "required_features": [],
  "excluded_features": [],
  "assumptions": ["Валюта бюджета — RUB"],
  "unverifiable_requirements": ["современный семейный отель"],
  "missing_required_fields": [],
  "missing_recommended_fields": []
}
```
