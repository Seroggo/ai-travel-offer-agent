import assert from "node:assert/strict";

import {
  buildTourvisorParams,
  getSearchResults,
  getSearchStatus,
  mapTourvisorResults,
  searchTours,
  startSearch,
  TourvisorError,
} from "../../supabase/functions/_shared/tourvisor/client.ts";
import type { TourvisorSearchInput } from "../../supabase/functions/_shared/tourvisor/client.ts";

const TEST_JWT = "test-tourvisor-token";

const defaultInput: TourvisorSearchInput = {
  departure_id: 1,
  country_id: 2,
  date_from: "2026-08-01",
  date_to: "2026-08-21",
  nights_from: 7,
  nights_to: 14,
  adults: 2,
  currency: "RUB",
  charter_only: true,
};

type CallRecord = {
  url: string;
  method: string;
  headers: Record<string, string>;
};

function mockFetch(responses: Response[]): typeof fetch & { calls: CallRecord[] } {
  const calls: CallRecord[] = [];
  const queue = [...responses];
  const fn = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    calls.push({
      url: typeof input === "string" ? input : input.toString(),
      method: init?.method ?? "GET",
      headers: (init?.headers as Record<string, string>) ?? {},
    });
    if (queue.length === 0) {
      return Promise.resolve(
        new Response("[]", { status: 200, headers: { "content-type": "application/json" } }),
      );
    }
    return Promise.resolve(queue.shift()!);
  };
  (fn as typeof fetch & { calls: CallRecord[] }).calls = calls;
  return fn as typeof fetch & { calls: CallRecord[] };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function fastSleep(): Promise<void> {
  return Promise.resolve();
}

// ---- Request mapping tests ----

Deno.test("1. query params use correct camelCase names", () => {
  const params = buildTourvisorParams(defaultInput);

  assert.strictEqual(params.get("departureId"), "1");
  assert.strictEqual(params.get("countryId"), "2");
  assert.strictEqual(params.get("dateFrom"), "2026-08-01");
  assert.strictEqual(params.get("dateTo"), "2026-08-21");
  assert.strictEqual(params.get("nightsFrom"), "7");
  assert.strictEqual(params.get("nightsTo"), "14");
  assert.strictEqual(params.get("adults"), "2");
  assert.strictEqual(params.get("currency"), "RUB");
  assert.strictEqual(params.get("onlyCharter"), "true");
});

Deno.test("2. priceTo absent when budget_max is null", () => {
  const params = buildTourvisorParams({ ...defaultInput, budget_max: null });
  assert.strictEqual(params.has("priceTo"), false);
});

Deno.test("3. priceTo present when budget_max is set", () => {
  const params = buildTourvisorParams({ ...defaultInput, budget_max: 240000 });
  assert.strictEqual(params.get("priceTo"), "240000");
});

Deno.test("4. childs serialized as repeated query param", () => {
  const params = buildTourvisorParams({
    ...defaultInput,
    children_ages: [7, 5],
  });
  assert.strictEqual(params.get("childs"), "7");
  assert.strictEqual(params.getAll("childs").join(","), "7,5");
});

Deno.test("5. optional params omitted when null", () => {
  const params = buildTourvisorParams({
    ...defaultInput,
    meal_id: null,
    hotel_category: null,
    hotel_rating: null,
  });
  assert.strictEqual(params.has("meal"), false);
  assert.strictEqual(params.has("hotelCategory"), false);
  assert.strictEqual(params.has("hotelRating"), false);
});

Deno.test("5b. optional params present when set", () => {
  const params = buildTourvisorParams({
    ...defaultInput,
    meal_id: 907,
    hotel_category: 4,
    hotel_rating: 4,
  });
  assert.strictEqual(params.get("meal"), "907");
  assert.strictEqual(params.get("hotelCategory"), "4");
  assert.strictEqual(params.get("hotelRating"), "4");
});

// ---- startSearch tests ----

Deno.test("6. startSearch extracts numeric searchId", async () => {
  const fetchFn = mockFetch([jsonResponse({ searchId: 12345 })]);
  const searchId = await startSearch(defaultInput, {
    jwt: TEST_JWT,
    fetchFn,
    sleepFn: fastSleep,
  });
  assert.strictEqual(searchId, 12345);
});

Deno.test("7. missing searchId throws TourvisorError", async () => {
  const fetchFn = mockFetch([jsonResponse({})]);
  try {
    await startSearch(defaultInput, { jwt: TEST_JWT, fetchFn, sleepFn: fastSleep });
    assert.fail("Expected error");
  } catch (e) {
    assert.ok(e instanceof TourvisorError);
    assert.strictEqual((e as TourvisorError).code, "INVALID_RESPONSE");
  }
});

Deno.test("7b. non-numeric searchId throws TourvisorError", async () => {
  const fetchFn = mockFetch([jsonResponse({ searchId: "abc" })]);
  try {
    await startSearch(defaultInput, { jwt: TEST_JWT, fetchFn, sleepFn: fastSleep });
    assert.fail("Expected error");
  } catch (e) {
    assert.ok(e instanceof TourvisorError);
    assert.strictEqual((e as TourvisorError).code, "INVALID_RESPONSE");
  }
});

Deno.test("8. Authorization header is Bearer token", async () => {
  const fetchFn = mockFetch([jsonResponse({ searchId: 1 })]);
  await startSearch(defaultInput, { jwt: TEST_JWT, fetchFn, sleepFn: fastSleep });
  const auth = fetchFn.calls[0].headers["Authorization"] ?? "";
  assert.strictEqual(auth, `Bearer ${TEST_JWT}`);
});

Deno.test("9. non-2xx error does not leak JWT or full body", async () => {
  const fetchFn = mockFetch([
    new Response(JSON.stringify({ secret: "sensitive" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    }),
  ]);
  try {
    await startSearch(defaultInput, { jwt: TEST_JWT, fetchFn, sleepFn: fastSleep });
    assert.fail("Expected error");
  } catch (e) {
    assert.ok(e instanceof TourvisorError);
    const err = e as TourvisorError;
    assert.strictEqual(err.status, 503);
    assert.strictEqual(err.code, "HTTP_ERROR");
    assert.ok(!err.message.includes(TEST_JWT));
    assert.ok(!err.message.includes("sensitive"));
  }
});

// ---- getSearchStatus tests ----

Deno.test("10. status URL includes operatorStatus=false", async () => {
  const fetchFn = mockFetch([jsonResponse({
    searchId: 12345,
    status: "processing",
    progress: 50,
    timePassed: 3,
  })]);
  await getSearchStatus(12345, { jwt: TEST_JWT, fetchFn, sleepFn: fastSleep });
  const url = fetchFn.calls[0].url;
  assert.ok(url.includes("operatorStatus=false"));
  assert.ok(url.includes("/tours/search/12345/status"));
});

// ---- getSearchResults tests ----

Deno.test("16. results URL includes limit=25", async () => {
  const fetchFn = mockFetch([jsonResponse([{ id: 1, name: "Hotel", tours: [] }])]);
  await getSearchResults(12345, { jwt: TEST_JWT, fetchFn, sleepFn: fastSleep });
  const url = fetchFn.calls[0].url;
  assert.ok(url.includes("limit=25"));
  assert.ok(url.includes("/tours/search/12345"));
});

Deno.test("17. non-array result throws TourvisorError", async () => {
  const fetchFn = mockFetch([jsonResponse({ notAnArray: true })]);
  try {
    await getSearchResults(12345, { jwt: TEST_JWT, fetchFn, sleepFn: fastSleep });
    assert.fail("Expected error");
  } catch (e) {
    assert.ok(e instanceof TourvisorError);
    assert.strictEqual((e as TourvisorError).code, "INVALID_RESULTS_RESPONSE");
  }
});

// ---- searchTours (polling) tests ----

Deno.test("11. polling completes at progress 100", async () => {
  const fetchFn = mockFetch([
    jsonResponse({ searchId: 42 }),
    jsonResponse({ searchId: 42, status: "completed", progress: 100, timePassed: 5 }),
    jsonResponse([{
      id: 100,
      name: "Test Hotel",
      country: { id: 1, name: "Test" },
      region: { id: 1, name: "Test Region" },
      category: 4,
      rating: 4.5,
      tours: [{
        id: "t1",
        price: 50000,
        date: "2026-08-10",
        nights: 7,
        meal: { id: 1, name: "AI" },
        roomType: "Standard",
        operator: { id: 1, name: "Op1" },
        currency: "RUB",
      }],
    }]),
  ]);
  const result = await searchTours(defaultInput, {
    jwt: TEST_JWT,
    fetchFn,
    sleepFn: fastSleep,
  });
  assert.strictEqual(result.results.length, 1);
  assert.strictEqual(result.results[0].hotel_id, 100);
  assert.strictEqual(result.warnings.length, 0);
});

Deno.test("12. polling uses limited iterations", async () => {
  const fetchFn = mockFetch([
    jsonResponse({ searchId: 42 }),
    jsonResponse({ searchId: 42, status: "processing", progress: 50, timePassed: 3 }),
    jsonResponse([]),
  ]);
  try {
    await searchTours(defaultInput, {
      jwt: TEST_JWT,
      fetchFn,
      sleepFn: fastSleep,
      timeoutMs: 10,
    });
    assert.fail("Expected SEARCH_TIMEOUT");
  } catch (e) {
    assert.ok(e instanceof TourvisorError);
    const err = e as TourvisorError;
    assert.ok(
      err.code === "SEARCH_TIMEOUT",
      `Expected SEARCH_TIMEOUT, got ${err.code}`,
    );
  }
});

Deno.test("14. timeout with empty results throws SEARCH_TIMEOUT", async () => {
  const fetchFn = mockFetch([
    jsonResponse({ searchId: 42 }),
    jsonResponse({ searchId: 42, status: "processing", progress: 30, timePassed: 3 }),
    jsonResponse([]),
  ]);
  try {
    await searchTours(defaultInput, {
      jwt: TEST_JWT,
      fetchFn,
      sleepFn: fastSleep,
      timeoutMs: 10,
    });
    assert.fail("Expected error");
  } catch (e) {
    assert.ok(e instanceof TourvisorError);
    assert.strictEqual((e as TourvisorError).code, "SEARCH_TIMEOUT");
  }
});

// ---- Result mapping tests ----

Deno.test("18. one hotel with two tours yields two candidates", () => {
  const raw = [{
    id: 1,
    name: "Hotel A",
    country: { id: 1, name: "Turkey" },
    region: { id: 1, name: "Antalya" },
    category: 5,
    rating: 4.5,
    tours: [
      {
        id: "t1",
        price: 100,
        date: "2026-08-10",
        nights: 7,
        meal: { id: 1, name: "AI" },
        roomType: "Standard",
        operator: { id: 1, name: "Op1" },
        currency: "RUB",
      },
      {
        id: "t2",
        price: 200,
        date: "2026-08-15",
        nights: 10,
        meal: { id: 2, name: "HB" },
        roomType: "Suite",
        operator: { id: 2, name: "Op2" },
        currency: "USD",
      },
    ],
  }];
  const candidates = mapTourvisorResults(raw);
  assert.strictEqual(candidates.length, 2);
});

Deno.test("19. all fields map correctly", () => {
  const raw = [{
    id: 99,
    name: "Grand Hotel",
    country: { id: 1, name: "Egypt" },
    region: { id: 10, name: "Hurghada" },
    subRegion: { id: 101, name: "El Gouna", regionId: 10 },
    category: 4,
    rating: 4.2,
    currency: "EUR",
    tours: [{
      id: "tour-99",
      price: 1200,
      date: "2026-09-01",
      nights: 7,
      meal: { id: 5, name: "BB" },
      roomType: "Deluxe",
      operator: { id: 7, name: "TravelCo" },
      currency: "EUR",
    }],
  }];
  const candidates = mapTourvisorResults(raw);
  assert.strictEqual(candidates.length, 1);
  const c = candidates[0];
  assert.strictEqual(c.hotel_id, 99);
  assert.strictEqual(c.hotel_name, "Grand Hotel");
  assert.strictEqual(c.country, "Egypt");
  assert.strictEqual(c.resort, "El Gouna");
  assert.strictEqual(c.hotel_category, 4);
  assert.strictEqual(c.hotel_rating, 4.2);
  assert.strictEqual(c.tour_id, "tour-99");
  assert.strictEqual(c.departure_date, "2026-09-01");
  assert.strictEqual(c.nights, 7);
  assert.strictEqual(c.meal, "BB");
  assert.strictEqual(c.room, "Deluxe");
  assert.strictEqual(c.tour_operator, "TravelCo");
  assert.strictEqual(c.price, 1200);
  assert.strictEqual(c.currency, "EUR");
});

Deno.test("20. damaged tour skipped, others preserved", () => {
  const raw = [{
    id: 1,
    name: "Hotel",
    country: { id: 1, name: "Test" },
    region: { id: 1, name: "Region" },
    tours: [
      {
        id: "good",
        price: 100,
        date: "2026-08-10",
        nights: 7,
        meal: { id: 1, name: "AI" },
        roomType: "Standard",
        operator: { id: 1, name: "Op1" },
        currency: "RUB",
      },
      {
        id: "bad",
        price: 0,
        date: "2026-08-15",
        nights: 7,
        meal: { id: 1, name: "AI" },
        roomType: "Standard",
        operator: { id: 1, name: "Op1" },
        currency: "RUB",
      },
      {
        id: "also-good",
        price: 150,
        date: "2026-08-20",
        nights: 7,
        meal: { id: 1, name: "AI" },
        roomType: "Standard",
        operator: { id: 1, name: "Op1" },
        currency: "RUB",
      },
    ],
  }];
  const candidates = mapTourvisorResults(raw);
  assert.strictEqual(candidates.length, 2);
  assert.strictEqual(candidates[0].tour_id, "good");
  assert.strictEqual(candidates[1].tour_id, "also-good");
});

Deno.test("21. damaged hotel skipped, others preserved", () => {
  const raw = [
    {
      id: 1,
      name: "Good Hotel",
      country: { id: 1, name: "Test" },
      region: { id: 1, name: "Region" },
      tours: [{
        id: "t1",
        price: 100,
        date: "2026-08-10",
        nights: 7,
        meal: { id: 1, name: "AI" },
        roomType: "Standard",
        operator: { id: 1, name: "Op1" },
        currency: "RUB",
      }],
    },
    {
      id: null,
      name: "Bad Hotel",
      country: { id: 1, name: "Test" },
      region: { id: 1, name: "Region" },
      tours: [{
        id: "t2",
        price: 200,
        date: "2026-08-10",
        nights: 7,
        meal: { id: 1, name: "AI" },
        roomType: "Standard",
        operator: { id: 1, name: "Op1" },
        currency: "RUB",
      }],
    },
    {
      id: 3,
      name: "Another Good",
      country: { id: 1, name: "Test" },
      region: { id: 1, name: "Region" },
      tours: [{
        id: "t3",
        price: 300,
        date: "2026-08-10",
        nights: 7,
        meal: { id: 1, name: "AI" },
        roomType: "Standard",
        operator: { id: 1, name: "Op1" },
        currency: "RUB",
      }],
    },
  ];
  const candidates = mapTourvisorResults(raw);
  assert.strictEqual(candidates.length, 2);
  assert.strictEqual(candidates[0].hotel_id, 1);
  assert.strictEqual(candidates[1].hotel_id, 3);
});

Deno.test("22. hotel_availability and flight_availability are null", () => {
  const raw = [{
    id: 1,
    name: "Hotel",
    country: { id: 1, name: "Test" },
    region: { id: 1, name: "Region" },
    tours: [{
      id: "t1",
      price: 100,
      date: "2026-08-10",
      nights: 7,
      hotelPlace: 0,
      flightPlace: 0,
      meal: { id: 1, name: "AI" },
      roomType: "Standard",
      operator: { id: 1, name: "Op1" },
      currency: "RUB",
    }],
  }];
  const candidates = mapTourvisorResults(raw);
  assert.strictEqual(candidates[0].hotel_availability, null);
  assert.strictEqual(candidates[0].flight_availability, null);
});

Deno.test("23. missing optional fields produce null, not error", () => {
  const raw = [{
    id: 1,
    name: "Minimal Hotel",
    tours: [{
      id: "t1",
      price: 100,
    }],
  }];
  const candidates = mapTourvisorResults(raw);
  assert.strictEqual(candidates.length, 1);
  const c = candidates[0];
  assert.strictEqual(c.hotel_id, 1);
  assert.strictEqual(c.hotel_name, "Minimal Hotel");
  assert.strictEqual(c.country, null);
  assert.strictEqual(c.resort, null);
  assert.strictEqual(c.hotel_category, null);
  assert.strictEqual(c.hotel_rating, null);
  assert.strictEqual(c.tour_id, "t1");
  assert.strictEqual(c.departure_date, null);
  assert.strictEqual(c.nights, null);
  assert.strictEqual(c.meal, null);
  assert.strictEqual(c.room, null);
  assert.strictEqual(c.tour_operator, null);
  assert.strictEqual(c.price, 100);
  assert.strictEqual(c.currency, null);
});

Deno.test("resort falls back to region.name when subRegion missing", () => {
  const raw = [{
    id: 1,
    name: "Hotel",
    country: { name: "Test" },
    region: { name: "Main Region" },
    tours: [{ id: "t1", price: 100 }],
  }];
  const candidates = mapTourvisorResults(raw);
  assert.strictEqual(candidates[0].resort, "Main Region");
});

Deno.test("empty array returns empty candidates", () => {
  assert.deepStrictEqual(mapTourvisorResults([]), []);
});

Deno.test("non-array input returns empty candidates", () => {
  assert.deepStrictEqual(mapTourvisorResults(null), []);
  assert.deepStrictEqual(mapTourvisorResults(undefined), []);
  assert.deepStrictEqual(mapTourvisorResults({}), []);
  assert.deepStrictEqual(mapTourvisorResults("string"), []);
});

Deno.test("tour with missing id skipped", () => {
  const raw = [{
    id: 1,
    name: "Hotel",
    country: { name: "Test" },
    region: { name: "Region" },
    tours: [
      { price: 100 },
      { id: "t2", price: 200 },
    ],
  }];
  const candidates = mapTourvisorResults(raw);
  assert.strictEqual(candidates.length, 1);
  assert.strictEqual(candidates[0].tour_id, "t2");
});

Deno.test("searchTours uses startSearch URL correctly", async () => {
  const fetchFn = mockFetch([
    jsonResponse({ searchId: 42 }),
    jsonResponse({ searchId: 42, status: "completed", progress: 100 }),
    jsonResponse([{
      id: 1,
      name: "H",
      country: { name: "T" },
      region: { name: "R" },
      tours: [{ id: "t1", price: 100 }],
    }]),
  ]);
  await searchTours(defaultInput, { jwt: TEST_JWT, fetchFn, sleepFn: fastSleep });
  const startUrl = fetchFn.calls[0].url;
  assert.ok(startUrl.includes("/tours/search"));
  assert.ok(startUrl.includes("departureId=1"));
  assert.ok(startUrl.includes("countryId=2"));
});

Deno.test("multiple hotel_place values all map to null", () => {
  const raw = [{
    id: 1,
    name: "Hotel",
    country: { name: "T" },
    region: { name: "R" },
    tours: [
      { id: "t1", price: 100, hotelPlace: 0, flightPlace: 0 },
      { id: "t2", price: 200, hotelPlace: 1, flightPlace: 2 },
      { id: "t3", price: 300, hotelPlace: -1, flightPlace: 5 },
    ],
  }];
  const candidates = mapTourvisorResults(raw);
  for (const c of candidates) {
    assert.strictEqual(c.hotel_availability, null);
    assert.strictEqual(c.flight_availability, null);
  }
});
