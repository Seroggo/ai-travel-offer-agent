import { strict as assert } from "node:assert/strict";
import { normalizeTourvisorResults } from "../../../supabase/functions/_shared/normalization/normalizer.ts";
import type { NormalizationContext } from "../../../supabase/functions/_shared/normalization/normalizer.ts";
import { TourNormalizationError } from "../../../supabase/functions/_shared/normalization/errors.ts";
import { NormalizedTourSchema } from "../../../supabase/functions/_shared/schemas/mod.ts";
import searchResults from "../../fixtures/tourvisor/search-results.json" with { type: "json" };

const validContext: NormalizationContext = {
  searchId: "900001",
  searchState: "completed",
  destinationPriority: 1,
  departureCity: "Екатеринбург",
  fixtureData: true,
};

Deno.test("normalizer: 6 hotel objects create 7 NormalizedTour", () => {
  const result = normalizeTourvisorResults(searchResults, validContext);
  assert.equal(result.tours.length, 7);
});

Deno.test("normalizer: rawHotelsCount = 6", () => {
  const result = normalizeTourvisorResults(searchResults, validContext);
  assert.equal(result.rawHotelsCount, 6);
});

Deno.test("normalizer: rawToursCount = 7", () => {
  const result = normalizeTourvisorResults(searchResults, validContext);
  assert.equal(result.rawToursCount, 7);
});

Deno.test("normalizer: normalizedToursCount = 7", () => {
  const result = normalizeTourvisorResults(searchResults, validContext);
  assert.equal(result.normalizedToursCount, 7);
});

Deno.test("normalizer: hotel 900101 preserves two different tours", () => {
  const result = normalizeTourvisorResults(searchResults, validContext);
  const hotelTours = result.tours.filter((t) => t.hotel_id === "900101");
  assert.equal(hotelTours.length, 2);
  const tourIds = hotelTours.map((t) => t.tour_id).sort();
  assert.deepEqual(tourIds, ["fixture-tour-900101-a", "fixture-tour-900101-b"]);
});

Deno.test("normalizer: hotel IDs normalize to string", () => {
  const result = normalizeTourvisorResults(searchResults, validContext);
  for (const tour of result.tours) {
    assert.equal(typeof tour.hotel_id, "string");
    assert.ok(tour.hotel_id.length > 0);
  }
});

Deno.test("normalizer: numeric hotel and tour IDs normalize to string", () => {
  const result = normalizeTourvisorResults(searchResults, validContext);
  assert.equal(result.tours[0].hotel_id, "900101");
  assert.equal(result.tours[0].tour_id, "fixture-tour-900101-a");
});

Deno.test("normalizer: first tour maps hotel, resort, date, nights, meal, room, operator, price correctly", () => {
  const result = normalizeTourvisorResults(searchResults, validContext);
  const first = result.tours[0];
  assert.equal(first.hotel_name, "DEMO Sun Family Resort");
  assert.equal(first.country, "Турция");
  assert.equal(first.resort, "Анталья");
  assert.equal(first.departure_date, "2026-08-12");
  assert.equal(first.nights, 8);
  assert.equal(first.meal_code, "AI");
  assert.equal(first.meal_name, "Всё включено");
  assert.equal(first.room_name, "Family Room");
  assert.equal(first.tour_operator, "ДЕМО Оператор One");
  assert.equal(first.price, 246000);
});

Deno.test("normalizer: price is from tour, not hotel.price", () => {
  const result = normalizeTourvisorResults(searchResults, validContext);
  const tour900101b = result.tours.find((t) => t.tour_id === "fixture-tour-900101-b");
  assert.ok(tour900101b);
  assert.equal(tour900101b.price, 258000);
});

Deno.test("normalizer: fuel_charge is not added to price", () => {
  const result = normalizeTourvisorResults(searchResults, validContext);
  for (const tour of result.tours) {
    assert.equal(tour.fuel_charge, 0);
    assert.ok(tour.price > 0);
  }
});

Deno.test("normalizer: hotelPlace and flightPlace saved as raw", () => {
  const result = normalizeTourvisorResults(searchResults, validContext);
  for (const tour of result.tours) {
    assert.equal(typeof tour.hotel_place_raw, "number");
    assert.equal(typeof tour.flight_place_raw, "number");
  }
});

Deno.test("normalizer: availability remains unknown", () => {
  const result = normalizeTourvisorResults(searchResults, validContext);
  for (const tour of result.tours) {
    assert.equal(tour.hotel_availability, "unknown");
    assert.equal(tour.flight_availability, "unknown");
  }
});

Deno.test("normalizer: price_status remains search", () => {
  const result = normalizeTourvisorResults(searchResults, validContext);
  for (const tour of result.tours) {
    assert.equal(tour.price_status, "search");
  }
});

Deno.test("normalizer: fixture warning is added", () => {
  const result = normalizeTourvisorResults(searchResults, validContext);
  for (const tour of result.tours) {
    assert.ok(tour.data_warnings.includes("FIXTURE_DATA"));
  }
});

Deno.test("normalizer: positive seaDistance saved with unit unknown", () => {
  const result = normalizeTourvisorResults(searchResults, validContext);
  const tour = result.tours.find((t) => t.hotel_id === "900101");
  assert.ok(tour);
  assert.ok(tour.sea_distance_value! > 0);
  assert.equal(tour.sea_distance_unit, "unknown");
});

Deno.test("normalizer: partial context adds PARTIAL_SEARCH and search_state partial", () => {
  const partialContext: NormalizationContext = {
    ...validContext,
    searchState: "partial",
  };
  const result = normalizeTourvisorResults(searchResults, partialContext);
  for (const tour of result.tours) {
    assert.equal(tour.search_state, "partial");
    assert.ok(tour.data_warnings.includes("PARTIAL_SEARCH"));
  }
});

Deno.test("normalizer: fixtureData=false does not add FIXTURE_DATA", () => {
  const ctx: NormalizationContext = {
    ...validContext,
    fixtureData: false,
  };
  const result = normalizeTourvisorResults(searchResults, ctx);
  for (const tour of result.tours) {
    assert.ok(!tour.data_warnings.includes("FIXTURE_DATA"));
  }
});

Deno.test("normalizer: fixture-tour-900106-a converts zero/empty optional fields to null", () => {
  const result = normalizeTourvisorResults(searchResults, validContext);
  const tour = result.tours.find((t) => t.tour_id === "fixture-tour-900106-a");
  assert.ok(tour);
  assert.equal(tour.hotel_rating, null);
  assert.equal(tour.subregion, null);
  assert.equal(tour.subregion_id, null);
  assert.equal(tour.sea_distance_value, null);
  assert.equal(tour.latitude, null);
  assert.equal(tour.longitude, null);
  assert.equal(tour.hotel_image_url, null);
  assert.equal(tour.room_id, null);
  assert.equal(tour.room_name, null);
  assert.equal(tour.accommodation, null);
  assert.equal(tour.tour_operator_id, null);
  assert.equal(tour.tour_operator, null);
});

Deno.test("normalizer: fixture-tour-900106-a contains expected missing_fields", () => {
  const result = normalizeTourvisorResults(searchResults, validContext);
  const tour = result.tours.find((t) => t.tour_id === "fixture-tour-900106-a");
  assert.ok(tour);
  const expectedMissing = [
    "hotel_rating",
    "subregion",
    "sea_distance_value",
    "latitude",
    "longitude",
    "hotel_image_url",
    "room_id",
    "room_name",
    "accommodation",
    "tour_operator_id",
    "tour_operator",
  ];
  for (const field of expectedMissing) {
    assert.ok(tour.missing_fields.includes(field), `missing_fields should include ${field}`);
  }
});

Deno.test("normalizer: meal fallback works", () => {
  const result = normalizeTourvisorResults(searchResults, validContext);
  const tour = result.tours.find((t) => t.tour_id === "fixture-tour-900101-a");
  assert.ok(tour);
  assert.equal(tour.meal_code, "AI");
  assert.equal(tour.meal_name, "Всё включено");
  assert.equal(tour.meal_name_full, "Всё включено");
});

Deno.test("normalizer: operator fallback works", () => {
  const result = normalizeTourvisorResults(searchResults, validContext);
  const tour = result.tours.find((t) => t.tour_id === "fixture-tour-900101-a");
  assert.ok(tour);
  assert.equal(tour.tour_operator, "ДЕМО Оператор One");
});

Deno.test("normalizer: raw input is not mutated", () => {
  const input = structuredClone(searchResults) as Record<string, unknown>[];
  const originalName = (input[0] as Record<string, unknown>).name;
  normalizeTourvisorResults(input, validContext);
  assert.equal((input[0] as Record<string, unknown>).name, originalName);
});

Deno.test("normalizer: returned objects do not share references with raw fixture", () => {
  const result = normalizeTourvisorResults(searchResults, validContext);
  const first = result.tours[0];
  first.hotel_name = "MUTATED";
  const result2 = normalizeTourvisorResults(searchResults, validContext);
  assert.equal(result2.tours[0].hotel_name, "DEMO Sun Family Resort");
});

Deno.test("normalizer: raw not array throws INVALID_RESULTS_RESPONSE", () => {
  assert.throws(
    () => normalizeTourvisorResults(null, validContext),
    (err: unknown) => {
      assert.ok(err instanceof TourNormalizationError);
      assert.equal(err.code, "INVALID_RESULTS_RESPONSE");
      return true;
    },
  );
  assert.throws(
    () => normalizeTourvisorResults({}, validContext),
    (err: unknown) => {
      assert.ok(err instanceof TourNormalizationError);
      assert.equal(err.code, "INVALID_RESULTS_RESPONSE");
      return true;
    },
  );
});

Deno.test("normalizer: invalid context throws INVALID_NORMALIZATION_CONTEXT", () => {
  assert.throws(
    () => normalizeTourvisorResults([], { ...validContext, searchId: "" }),
    (err: unknown) => {
      assert.ok(err instanceof TourNormalizationError);
      assert.equal(err.code, "INVALID_NORMALIZATION_CONTEXT");
      return true;
    },
  );
  assert.throws(
    () => normalizeTourvisorResults([], { ...validContext, destinationPriority: 0 }),
    (err: unknown) => {
      assert.ok(err instanceof TourNormalizationError);
      assert.equal(err.code, "INVALID_NORMALIZATION_CONTEXT");
      return true;
    },
  );
});

Deno.test("normalizer: invalid hotel object creates rejection", () => {
  const input = structuredClone(searchResults) as unknown[];
  input.splice(1, 0, null);
  const result = normalizeTourvisorResults(input, validContext);
  const rejection = result.rejected.find((r) => r.code === "INVALID_HOTEL_OBJECT");
  assert.ok(rejection);
  assert.equal(rejection.hotelIndex, 1);
});

Deno.test("normalizer: missing tours array creates INVALID_TOURS_COLLECTION", () => {
  const input = structuredClone(searchResults) as Record<string, unknown>[];
  delete (input[2] as Record<string, unknown>).tours;
  const result = normalizeTourvisorResults(input, validContext);
  const rejection = result.rejected.find((r) => r.code === "INVALID_TOURS_COLLECTION");
  assert.ok(rejection);
});

Deno.test("normalizer: missing hotel_id creates rejection", () => {
  const input = structuredClone(searchResults) as Record<string, unknown>[];
  const inputArr = input as unknown as { id?: unknown }[];
  delete inputArr[0].id;
  const result = normalizeTourvisorResults(inputArr, validContext);
  assert.equal(result.tours.length, 5);
  const hotelIds = result.tours.map((t) => t.hotel_id);
  assert.ok(!hotelIds.includes("900101"));
});

Deno.test("normalizer: missing tour_id creates rejection", () => {
  const input = structuredClone(searchResults) as Record<string, unknown>[];
  const tours = (input[0] as Record<string, unknown>).tours as Record<string, unknown>[];
  delete tours[0].id;
  const result = normalizeTourvisorResults(input, validContext);
  const tourIds = result.tours.map((t) => t.tour_id);
  assert.ok(!tourIds.includes("fixture-tour-900101-a"));
});

Deno.test("normalizer: invalid date creates rejection", () => {
  const input = structuredClone(searchResults) as Record<string, unknown>[];
  const tours = (input[0] as Record<string, unknown>).tours as Record<string, unknown>[];
  tours[0].date = "not-a-date";
  const result = normalizeTourvisorResults(input, validContext);
  const tourIds = result.tours.map((t) => t.tour_id);
  assert.ok(!tourIds.includes("fixture-tour-900101-a"));
});

Deno.test("normalizer: nights = 0 creates rejection", () => {
  const input = structuredClone(searchResults) as Record<string, unknown>[];
  const tours = (input[0] as Record<string, unknown>).tours as Record<string, unknown>[];
  tours[0].nights = 0;
  const result = normalizeTourvisorResults(input, validContext);
  const tourIds = result.tours.map((t) => t.tour_id);
  assert.ok(!tourIds.includes("fixture-tour-900101-a"));
});

Deno.test("normalizer: price = 0 creates rejection", () => {
  const input = structuredClone(searchResults) as Record<string, unknown>[];
  const tours = (input[0] as Record<string, unknown>).tours as Record<string, unknown>[];
  tours[0].price = 0;
  const result = normalizeTourvisorResults(input, validContext);
  const tourIds = result.tours.map((t) => t.tour_id);
  assert.ok(!tourIds.includes("fixture-tour-900101-a"));
});

Deno.test("normalizer: empty currency creates rejection", () => {
  const input = structuredClone(searchResults) as Record<string, unknown>[];
  const tours = (input[0] as Record<string, unknown>).tours as Record<string, unknown>[];
  tours[0].currency = "";
  const result = normalizeTourvisorResults(input, validContext);
  const tourIds = result.tours.map((t) => t.tour_id);
  assert.ok(!tourIds.includes("fixture-tour-900101-a"));
});

Deno.test("normalizer: identical tour_id is deduplicated", () => {
  const input = structuredClone(searchResults) as Record<string, unknown>[];
  const hotel0Tours = (input[0] as Record<string, unknown>).tours as Record<string, unknown>[];
  const duplicateTour = structuredClone(hotel0Tours[0]);
  (input[1] as Record<string, unknown>).tours = [
    ...((input[1] as Record<string, unknown>).tours as Record<string, unknown>[]),
    duplicateTour,
  ];
  const result = normalizeTourvisorResults(input, validContext);
  const tourIds = result.tours.map((t) => t.tour_id);
  const occurrences = tourIds.filter((id) => id === "fixture-tour-900101-a").length;
  assert.equal(occurrences, 1);
});

Deno.test("normalizer: more complete duplicate wins", () => {
  const input = structuredClone(searchResults) as Record<string, unknown>[];
  const hotel0Tours = (input[0] as Record<string, unknown>).tours as Record<string, unknown>[];
  const baseTour = structuredClone(hotel0Tours[0]) as Record<string, unknown>;
  baseTour.roomType = "";
  baseTour.placement = "";
  baseTour.adults = 0;
  const hotel1Tours = (input[1] as Record<string, unknown>).tours as Record<string, unknown>[];
  hotel1Tours.push(baseTour);
  const result = normalizeTourvisorResults(input, validContext);
  const winner = result.tours.find((t) => t.tour_id === "fixture-tour-900101-a");
  assert.ok(winner);
  assert.equal(winner.room_name, "Family Room");
});

Deno.test("normalizer: at equal completeness lower price wins", () => {
  const input = structuredClone(searchResults) as Record<string, unknown>[];
  const hotel0Tours = (input[0] as Record<string, unknown>).tours as Record<string, unknown>[];
  const baseTour = structuredClone(hotel0Tours[0]) as Record<string, unknown>;
  baseTour.price = 99999;
  const hotel1Tours = (input[1] as Record<string, unknown>).tours as Record<string, unknown>[];
  hotel1Tours.push(baseTour);
  const result = normalizeTourvisorResults(input, validContext);
  const winner = result.tours.find((t) => t.tour_id === "fixture-tour-900101-a");
  assert.ok(winner);
  assert.equal(winner.price, 99999);
  assert.equal(result.deduplicatedToursCount, 1);
});

Deno.test("normalizer: different tour_ids of same hotel not deduplicated", () => {
  const result = normalizeTourvisorResults(searchResults, validContext);
  const hotelTours = result.tours.filter((t) => t.hotel_id === "900101");
  assert.equal(hotelTours.length, 2);
});

Deno.test("normalizer: all final tours pass NormalizedTourSchema", () => {
  const result = normalizeTourvisorResults(searchResults, validContext);
  for (const tour of result.tours) {
    const parsed = NormalizedTourSchema.safeParse(tour);
    assert.equal(parsed.success, true, `Tour ${tour.tour_id} should pass schema`);
  }
});
