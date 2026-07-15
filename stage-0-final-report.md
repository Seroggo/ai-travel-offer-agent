# Итоговый отчёт — Этап 0

## 1. Цель этапа

Подготовить минимальный продуктовый и технический контракт, позволяющий начать backend-разработку AI Travel Offer Agent на mock-данных без реального JWT Tourvisor.

## 2. Что было проанализировано

- официальная документация Tourvisor `tv-search-gateway 1.2.1`;
- методы справочников;
- запуск, статус, результаты и продолжение поиска;
- карточка тура и актуализация рейсов;
- ограничения параметров;
- тарифные и rate-limit ограничения;
- исходная концепция и границы пилота.

Основной источник:

https://api.tourvisor.ru/search/docs

## 3. Подготовленные контракты

Созданы:

```text
docs/product-spec.md
docs/contracts/travel-request.md
docs/contracts/tourvisor-api.md
docs/contracts/normalized-tour.md
docs/contracts/travel-offer.md
docs/ranking-rules.md
docs/mock-data-spec.md
```

Дополнительно созданы mock fixtures в:

```text
tests/fixtures/tourvisor/
```

## 4. Обязательные поля запроса

Критически обязательны:

- departure city;
- минимум одна destination country;
- date range;
- nights range;
- adults;
- age of every child.

Бюджет:

- не блокирует поиск окончательно;
- при отсутствии вызывает одну попытку уточнения;
- hard → строгая граница;
- soft → допуск +10%;
- explicitly unknown → поиск без priceTo.

## 5. Mapping к Tourvisor

Зафиксирован mapping:

```text
TravelSearchRequest
→ resolver справочников
→ TourvisorSearchParams на каждую страну
```

Несколько стран создают отдельные параллельные поиски.

Подтверждены основные параметры:

- departureId;
- countryId;
- dateFrom/dateTo;
- nightsFrom/nightsTo;
- adults/childs;
- meal;
- hotelCategory;
- hotelRating;
- regionIds;
- hotelServices;
- priceTo;
- currency;
- onlyCharter;
- onlyDirect.

## 6. Схема нормализованного тура

Создан `NormalizedTour v0.2`.

Каждый элемент `hotel.tours[]` превращается в отдельный тур.

Неоднозначные поля сохраняются raw и не используются как факт:

- hotelPlace;
- flightPlace;
- seaDistance unit;
- fuelCharge semantics.

## 7. Правила фильтрации

Определены жёсткие фильтры:

- критически неполные данные;
- страна;
- даты;
- ночи;
- состав туристов;
- hard budget;
- soft +10% limit;
- required meal;
- required stars;
- required rating;
- required resort;
- direct flight;
- verified unavailable flight;
- verified excluded feature.

Непроверяемое требование не считается mismatch: оно становится предупреждением турагенту.

## 8. Первая версия ranking

Создан объяснимый score 0–100.

Факторы:

- цена;
- рейтинг;
- питание;
- категория;
- даты и ночи;
- курорт;
- проверяемые услуги;
- полнота данных.

Определены:

- разные веса для известного и неизвестного бюджета;
- hotel dedup;
- tie-breakers;
- top-3 по каждой стране;
- diversity heuristic;
- reserve для актуализации.

Все веса и пороги явно помечены как гипотезы первой беты.

## 9. Структура TravelOffer

Создан детерминированный пакет для LLM Writer:

- request summary;
- assumptions;
- unverifiable requirements;
- результаты по странам;
- ranked options;
- блок турагенту;
- блок клиенту;
- дисклеймеры.

LLM Writer не получает права менять ranking или добавлять факты.

## 10. Подготовленные mock-сценарии

Созданы fixtures:

- start success;
- processing;
- complete;
- empty;
- error;
- partial timeout;
- invalid response;
- raw results;
- unavailable flight;
- expected normalization summary.

Базовая выдача содержит 6 отелей и 7 туров и покрывает budget, meal, availability, incomplete data и hotel dedup.

## 11. Предположения и неподтверждённые моменты

Гипотезы первой беты:

- один объединённый clarification cycle;
- первая status-проверка через 4 секунды;
- polling каждые 3 секунды;
- timeout 45 секунд;
- две retry-попытки;
- results limit 25;
- ranking weights;
- diversity threshold 5 points;
- до пяти резервных кандидатов для optional actualization.

Технически требуют проверки после JWT:

- query serialization arrays;
- real dictionary IDs;
- status values;
- seaDistance unit;
- hotelPlace/flightPlace codes;
- fuelCharge meaning;
- tourId path format;
- real error envelopes.

## 12. Обнаруженные риски

### Продуктовые

- свободные пожелания часто невозможно подтвердить базовым Search API;
- без API описаний нельзя надёжно оценивать пляж, ремонт, инфраструктуру и семейность;
- ranking первого пилота является гипотезой;
- top-3 по каждой стране может дать длинный ответ при большом числе стран.

### Технические

- тип tourId противоречиво описан;
- availability codes не расшифрованы;
- актуализация увеличивает число тарифицируемых запросов;
- partial search может менять состав результатов;
- реальные error responses неизвестны.

### Репутационные

- поисковая цена может измениться;
- места в отеле остаются неподтверждёнными;
- LLM Writer должен быть жёстко ограничен allowlist полей.

## 13. Вопросы управляющему штабу

Блокирующих вопросов для backend на mock-данных нет.

После первых реальных тестов штаб должен принять решения:

1. включать ли актуализацию top-3 по умолчанию с учётом тарификации;
2. достаточно ли top-3 на каждую страну или нужен общий лимит предложения;
3. какие ranking weights лучше отражают выбор реального турагента;
4. подключать ли платный API описаний отелей на следующем этапе.

Эти вопросы не блокируют следующий этап.

## 14. Готовность к Backend MVP

Следующая ветка может реализовать:

```text
text input
→ mock parser payload
→ validation
→ mock Tourvisor adapter
→ normalization
→ filtering
→ ranking
→ TravelOffer
```

без дополнительных продуктовых решений.

# READY FOR BACKEND

Ограничение: статус относится к backend на mock-данных. Реальная интеграция Tourvisor требует JWT и проверки перечисленных неоднозначностей.
