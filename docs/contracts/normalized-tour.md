# Контракт `NormalizedTour` v0.2

> **Источник API:** официальная документация Tourvisor `tv-search-gateway 1.2.1`, проверена 15 июля 2026 года:  
> https://api.tourvisor.ru/search/docs  
>
> Все значения, не подтверждённые документацией или реальным ответом API, помечены как гипотезы первой беты.


## 1. Назначение

Каждый элемент `hotel.tours[]` превращается в отдельный `NormalizedTour`.

```ts
type AvailabilityStatus =
  | "unknown"
  | "available"
  | "on_request"
  | "unavailable";

type NormalizedTour = {
  schema_version: "0.2";

  search_id: string;
  search_state: "completed" | "partial";
  destination_priority: number;
  departure_city: string | null;

  hotel_id: string;
  hotel_name: string;
  country_id: number | null;
  country: string;
  resort_id: number | null;
  resort: string | null;
  subregion_id: number | null;
  subregion: string | null;

  hotel_category: number | null;
  hotel_rating: number | null;

  sea_distance_value: number | null;
  sea_distance_unit: "unknown" | "m";

  latitude: number | null;
  longitude: number | null;
  hotel_image_url: string | null;

  tour_id: string;
  tour_name: string | null;
  departure_date: string;
  nights: number;
  flight_nights: number | null;
  adults: number | null;
  children_count: number | null;

  meal_id: number | null;
  meal_code: string | null;
  meal_name: string | null;
  meal_name_full: string | null;

  room_id: string | null;
  room_name: string | null;
  accommodation: string | null;

  tour_operator_id: number | null;
  tour_operator: string | null;

  is_charter: boolean | null;
  is_promo: boolean | null;

  price: number;
  currency: string;
  fuel_charge: number | null;
  price_status: "search" | "actualized";
  price_actualized_at: string | null;

  hotel_availability: AvailabilityStatus;
  flight_availability: AvailabilityStatus;

  hotel_place_raw: number | null;
  flight_place_raw: number | null;
  availability_verification: "not_checked" | "verified" | "failed";

  source: "tourvisor";

  raw_reference: {
    search_id: string;
    hotel_id: string;
    tour_id: string;
    hotel_index: number;
    tour_index: number;
  };

  missing_fields: string[];
  data_warnings: string[];
};
```

## 2. Критические поля

Тур исключается на нормализации, если отсутствуют:

- `hotel_id`;
- `hotel_name`;
- `country`;
- `tour_id`;
- валидная `departure_date`;
- `nights > 0`;
- `price > 0`;
- `currency`.

## 3. Mapping отеля

| Tourvisor | NormalizedTour | Клиент | Ranking |
|---|---|---|---|
| `id` | `hotel_id` | нет | дедупликация |
| `name` | `hotel_name` | да | нет |
| `country.id/name` | country | да | группировка |
| `region.id/name` | resort | да | предпочтение |
| `subRegion` | subregion | опционально | нет |
| `category` | hotel_category | если 1–5 | да |
| `rating` | hotel_rating | если >0 | да |
| `seaDistance` | raw distance | пока нет | пока нет |
| `picturelink` | image | не в текстовом MVP | нет |

`seaDistance` не используется, пока не подтверждена единица.

## 4. Mapping тура

| Tourvisor | NormalizedTour |
|---|---|
| `tour.id` | `tour_id` string |
| `tour.date` | `departure_date` |
| `tour.nights` | `nights` |
| `tour.flightNights` | `flight_nights` |
| `tour.adults` | `adults` |
| `tour.childs` | `children_count` |
| `tour.meal.id` | `meal_id` |
| `tour.meal.name` | `meal_code` |
| `tour.meal.russianName` | `meal_name` |
| `tour.roomId` | `room_id` string |
| `tour.roomType` | `room_name` |
| `tour.placement` | `accommodation` |
| `tour.operator` | operator |
| `tour.price` | `price` |
| `tour.currency` | `currency` |
| `tour.fuelCharge` | raw fuel charge |
| `tour.hotelPlace` | raw |
| `tour.flightPlace` | raw |

## 5. Цена

Используется цена конкретного элемента `tour`, а не минимальная цена верхнего уровня отеля.

До актуализации:

```text
price_status = search
```

После успешного `/flights`:

```text
price_status = actualized
price_actualized_at = ISO datetime
```

Нельзя автоматически прибавлять `fuel_charge` к цене до проверки смысла поля.

## 6. Доступность

`hotelPlace` и `flightPlace` не расшифрованы официально:

```text
hotel_availability = unknown
flight_availability = unknown
```

После `/flights` доступность рейса может стать:

- available;
- on_request;
- unavailable.

Доступность отеля остаётся unknown до расшифровки `hotelPlace`.

## 7. Meal normalization

Порядок fallback:

```text
russianName
→ fullRussianName
→ name
→ fullName
→ null
```

`meal_code` сохраняет краткое значение вроде AI/UAI/HB и может использоваться детерминированным ranking.

## 8. Missing fields

Необязательные поля не исключают тур. Они добавляются в `missing_fields`.

Пример:

```json
["hotel_rating", "room_name", "tour_operator"]
```

`data_warnings` содержит:

- partial search;
- fixture;
- price not actualized;
- availability not verified;
- unknown sea-distance unit.

## 9. Дедупликация

### Один `tour_id`

Оставить одну наиболее полную запись. При равенстве — меньшую положительную цену.

### Один отель, разные туры

Сохранить все до ranking.

## 10. Клиентский текст

Можно показывать при наличии:

- название отеля;
- страна/курорт;
- категория;
- рейтинг Tourvisor;
- дата;
- ночи;
- питание;
- номер;
- размещение;
- цена.

Нельзя показывать как подтверждённые:

- качество пляжа;
- свежий ремонт;
- тишину;
- семейность;
- подтверждённые места;
- единицу расстояния до моря;
- качество питания и сервиса.
