# Контракт Tourvisor API v0.1

> **Источник API:** официальная документация Tourvisor `tv-search-gateway 1.2.1`, проверена 15 июля 2026 года:  
> https://api.tourvisor.ru/search/docs  
>
> Все значения, не подтверждённые документацией или реальным ответом API, помечены как гипотезы первой беты.


## 1. Авторизация и лимиты

Каждый запрос содержит:

```http
Authorization: Bearer <JWT>
```

Секрет не записывается в логи.

Документированные лимиты:

- справочники: 120 запросов/мин;
- остальные методы: 300 запросов/мин;
- тариф включает 3000 поисковых запросов/сутки;
- старт поиска, continue и актуализация рейсов считаются поисковыми запросами;
- ознакомительный режим: общий лимит 300 запросов/сутки.

## 2. Методы пилота

| Метод | Назначение | Пилот |
|---|---|---|
| `GET /departures` | города вылета | Да |
| `GET /countries` | страны, доступные из города | Да |
| `GET /currencies` | валюты | Да |
| `GET /meals` | питание | Да |
| `GET /regions` | курорты | Условно |
| `GET /hotel-group-services` | проверяемые услуги | Условно |
| `GET /tours/search` | запуск поиска | Да |
| `GET /tours/search/{searchId}/status` | polling | Да |
| `GET /tours/search/{searchId}` | результаты | Да |
| `GET /tours/{tourId}/flights` | актуализация | Конфигурируемо |
| `GET /tours/search/{searchId}/continue` | расширение поиска | Нет по умолчанию |

## 3. `TourvisorSearchParams`

```ts
type TourvisorSearchParams = {
  departureId: number;
  countryId: number;

  dateFrom: string;
  dateTo: string;

  nightsFrom: number;
  nightsTo: number;

  adults: number;
  childs?: number[];

  meal?: number;
  hotelCategory?: number;
  hotelRating?: 0 | 2 | 3 | 4 | 5;

  regionIds?: number[];
  hotelServices?: number[];

  priceTo?: number;

  currency: string;
  onlyCharter: boolean;
  onlyDirect?: boolean;
};
```

## 4. Mapping

| TravelSearchRequest | Tourvisor | Правило |
|---|---|---|
| `departure_city` | `/departures` | найти ID |
| `departure_id` | `departureId` | обязательный |
| `destination.country_name` | `/countries` | искать с departure/flight filters |
| `destination.country_id` | `countryId` | отдельный запрос на страну |
| `date_from` | `dateFrom` | ISO date |
| `date_to` | `dateTo` | ISO date, диапазон ≤21 |
| `nights_from` | `nightsFrom` | 1–28 |
| `nights_to` | `nightsTo` | 1–28, разница ≤10 |
| `adults` | `adults` | 1–6 |
| `children_ages` | `childs` | до 3, 0–17 |
| `meal_id` | `meal` | минимум питания |
| `hotel_stars_min` | `hotelCategory` | от указанной категории |
| `hotel_rating_min` | `hotelRating` | дискретный порог |
| `region_ids` | `regionIds` | только текущей страны |
| `hotel_service_ids` | `hotelServices` | только подтверждённые ID |
| `budget` | `priceTo` | hard = max, soft = max×1.10 |
| `currency` | `currency` | RUB после проверки справочника |
| `charter_only` | `onlyCharter` | всегда |
| `direct_flight_only` | `onlyDirect` | boolean |

Не передаются:

- свободный текст;
- assumptions;
- непроверенные предпочтения;
- расстояние до моря;
- внутренние режимы strictness.

## 5. Mapping рейтинга

| Минимальный рейтинг | `hotelRating` |
|---:|---:|
| не указан | omit |
| 3.0–3.49 | 2 |
| 3.5–3.99 | 3 |
| 4.0–4.49 | 4 |
| ≥4.5 | 5 |

Точное значение сохраняется для постфильтра.

## 6. Справочники

ID никогда не генерирует LLM.

Resolver:

```text
departure_city → /departures → departure_id
country_name → /countries → country_id
meal text → /meals → meal_id
resort text → /regions → region_ids
feature → /hotel-group-services → hotel_service_ids
```

Если страна недоступна из выбранного города, ошибка относится только к этой стране.

## 7. Асинхронный lifecycle

```text
startSearch
→ searchId
→ wait 4 sec
→ status
→ polling every 3 sec
→ progress >= 100
→ results(limit=25)
```

Параметры 4 секунды, 3 секунды и timeout 45 секунд — гипотезы первой беты.

Внутренние статусы:

```ts
type DestinationSearchState =
  | "pending"
  | "starting"
  | "processing"
  | "completed"
  | "partial"
  | "empty"
  | "failed"
  | "timed_out";
```

Tourvisor `status` сохраняется, но до реального API не используется как единственный критерий. Завершение определяется `progress >= 100`.

При timeout:

- запросить накопленные результаты;
- непусто → `partial`;
- пусто → `timed_out`.

## 8. Retry

Временные ошибки:

- 429;
- 5xx;
- network timeout.

Две попытки: через 2 и 4 секунды.

Фатальные:

- 401/403;
- 400 invalid params;
- invalid `searchId`.

## 9. Результаты

Endpoint:

```http
GET /tours/search/{searchId}?limit=25
```

Возвращает:

```text
Hotel[]
└── tours[]
```

Каждый `tour` нормализуется в отдельный `NormalizedTour`.

## 10. Актуализация

`GET /tours/{tourId}/flights?currency=RUB` возвращает:

- рейсы;
- актуальную цену;
- fuel charge;
- surcharges;
- `noPlaces`;
- `onDemand`;
- error.

Правило интерпретации первой беты:

- `noPlaces=true` в обязательном сегменте → unavailable;
- нет `noPlaces`, но `onDemand=true` → on_request;
- оба false → available.

Правило требует проверки на реальном ответе.

## 11. Неоднозначности

До реального JWT подтвердить:

1. сериализацию массивов query;
2. реальные ID справочников;
3. единицу `seaDistance`;
4. коды `hotelPlace` и `flightPlace`;
5. входит ли `fuelCharge` в `price`;
6. формат `tourId` в path;
7. фактические значения строки status;
8. структуру ошибок.
