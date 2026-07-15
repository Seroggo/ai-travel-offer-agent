# Контракт `TravelOffer` v0.1

> **Источник API:** официальная документация Tourvisor `tv-search-gateway 1.2.1`, проверена 15 июля 2026 года:  
> https://api.tourvisor.ru/search/docs  
>
> Все значения, не подтверждённые документацией или реальным ответом API, помечены как гипотезы первой беты.


## 1. Назначение

`TravelOffer` — детерминированный пакет данных для LLM Writer. Он уже содержит выбранные варианты, причины, предупреждения и разрешённые факты.

LLM Writer не получает полный raw JSON Tourvisor и не меняет ranking.

## 2. Структура

```ts
type TravelOffer = {
  schema_version: "0.1";
  request_id: string;
  created_at: string;

  request_summary: {
    departure_city: string;
    destinations: string[];
    date_from: string;
    date_to: string;
    nights_from: number;
    nights_to: number;
    adults: number;
    children_ages: number[];
    budget_max: number | null;
    budget_mode: "hard" | "soft" | "unknown";
    meal_preferences: string[];
    hotel_stars_min: number | null;
    hotel_rating_min: number | null;
  };

  assumptions: string[];
  unverifiable_requirements: string[];

  destination_results: DestinationOffer[];

  agent_block: AgentOfferBlock;
  client_block: ClientOfferBlock;

  global_disclaimers: string[];
};

type DestinationOffer = {
  country: string;
  priority: number;
  search_state:
    | "completed"
    | "partial"
    | "empty"
    | "failed"
    | "timed_out";

  raw_tours_count: number;
  accepted_tours_count: number;

  options: RankedOfferOption[];
  rejection_summary: Record<string, number>;
  warnings: string[];
};

type RankedOfferOption = {
  rank: number;

  hotel_id: string;
  tour_id: string;

  hotel_name: string;
  country: string;
  resort: string | null;
  hotel_category: number | null;
  hotel_rating: number | null;

  departure_date: string;
  nights: number;
  meal_name: string | null;
  room_name: string | null;
  accommodation: string | null;

  price: number;
  currency: string;
  price_status: "search" | "actualized";

  flight_availability:
    | "unknown"
    | "available"
    | "on_request"
    | "unavailable";

  hotel_availability:
    | "unknown"
    | "available"
    | "on_request"
    | "unavailable";

  internal_score: number;
  strengths: string[];
  compromises: string[];
  verification_needed: string[];
};
```

## 3. Блок турагенту

```ts
type AgentOfferBlock = {
  understood_request: string;
  assumptions: string[];
  unverified_requirements: string[];

  destination_sections: Array<{
    country: string;
    status_summary: string;
    options: Array<{
      rank: number;
      headline: string;
      factual_details: string[];
      why_ranked_here: string[];
      compromises: string[];
      verify_before_sending: string[];
    }>;
    no_result_reason: string | null;
  }>;

  overall_recommendation: string;
  operational_warnings: string[];
};
```

Обязательное содержание:

- как понят запрос;
- все assumptions;
- что нельзя проверить;
- сколько вариантов найдено;
- почему №1 выше;
- какие компромиссы;
- частичный ли поиск;
- актуализирована ли цена;
- проверены ли места;
- что проверить вручную.

Допустимо показывать internal score только в отладочном режиме. В обычном Telegram-ответе он скрыт.

## 4. Блок клиенту

```ts
type ClientOfferBlock = {
  intro: string;
  destination_sections: Array<{
    country: string;
    options: Array<{
      rank: number;
      title: string;
      details: string[];
      selection_reason: string;
      compromise: string | null;
    }>;
  }>;
  closing: string;
  disclaimer: string;
};
```

## 5. Разрешённые факты

LLM Writer может использовать только:

- hotel name;
- country/resort;
- category;
- Tourvisor rating;
- date;
- nights;
- meal;
- room;
- accommodation;
- price and currency;
- actualization status;
- calculated strengths and compromises;
- explicitly supplied assumptions.

## 6. Запрещённые утверждения

Без отдельного проверенного источника нельзя писать:

- лучший пляж;
- идеален для детей;
- новый ремонт;
- высокий уровень сервиса;
- вкусное питание;
- тихий;
- популярный у туристов;
- подтверждённые места;
- гарантированная цена.

Нельзя превращать пожелание клиента в характеристику отеля.

## 7. Шаблон блока турагенту

```text
Запрос понят так:
— вылет: Екатеринбург;
— даты: 10–20 августа;
— 7–9 ночей;
— 2 взрослых + ребёнок 8 лет;
— ориентир: 250 000 ₽;
— страны: Турция, Египет.

Допущения:
— бюджет трактуется как мягкий, допустимое превышение до 10%.

Не удалось автоматически проверить:
— современность отеля;
— качество пляжа.

Турция — найдено 3 подходящих варианта.

1. Hotel A — 246 000 ₽
Почему выше:
— внутри ориентира;
— нужное питание;
— самый высокий рейтинг среди финалистов.
Компромисс:
— цена близка к верхней границе бюджета.
Перепроверить:
— актуальную цену;
— места в отеле и на рейсе.
```

## 8. Шаблон клиентского текста

```text
Подобрал несколько вариантов под ваши даты и состав туристов.

Турция

1. Hotel A 5*, Анталья
12 августа, 8 ночей, всё включено
246 000 ₽ на всех

Почему стоит рассмотреть: вариант укладывается в ориентир и имеет самый высокий рейтинг среди подобранных отелей.
Компромисс: стоимость близка к верхней границе бюджета.

Цены и наличие актуальны на момент поиска и требуют подтверждения у туроператора.
```

## 9. Пустые и частичные результаты

### Empty

Клиентский блок по стране не создаётся автоматически. Турагенту предлагается ослабить параметры.

### Partial

В agent block обязательно:

> Поиск завершился частично; подборка сформирована по полученным данным.

В client block технический статус не раскрывается, но общий дисклеймер сохраняется. Решение отправлять такой блок принимает турагент.

### Failed

Другие страны продолжают отображаться. Для failed-страны клиентский блок отсутствует.

## 10. Бюджет unknown

Agent block:

> Поиск выполнен без ценового ограничения.

Client intro не говорит «в рамках бюджета». Варианты упорядочены по совокупности цены и подтверждённых характеристик.

## 11. Минимальный дисклеймер

```text
Цена и наличие актуальны на момент поиска и могут измениться. Перед бронированием требуется подтверждение у туроператора.
```
