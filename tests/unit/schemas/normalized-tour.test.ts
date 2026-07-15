import { strict as assert } from "node:assert/strict";
import { NormalizedTourSchema } from "../../../supabase/functions/_shared/schemas/normalized-tour.ts";

const validTour = {
  schema_version: "0.2" as const,
  search_id: "search-1",
  search_state: "completed" as const,
  destination_priority: 1,
  departure_city: "Екатеринбург",

  hotel_id: "hotel-1",
  hotel_name: "Hotel A",
  country_id: 1,
  country: "Турция",
  resort_id: 10,
  resort: "Анталья",
  subregion_id: null,
  subregion: null,

  hotel_category: 5,
  hotel_rating: 4.5,

  sea_distance_value: null,
  sea_distance_unit: "unknown" as const,

  latitude: 36.9,
  longitude: 30.7,
  hotel_image_url: null,

  tour_id: "tour-1",
  tour_name: null,
  departure_date: "2026-08-12",
  nights: 8,
  flight_nights: null,
  adults: 2,
  children_count: null,

  meal_id: 3,
  meal_code: "AI",
  meal_name: "AI",
  meal_name_full: null,

  room_id: "room-1",
  room_name: "Standard",
  accommodation: "Double",

  tour_operator_id: 100,
  tour_operator: "Pegas",

  is_charter: null,
  is_promo: null,

  price: 246000,
  currency: "RUB",
  fuel_charge: null,
  price_status: "search" as const,
  price_actualized_at: null,

  hotel_availability: "unknown" as const,
  flight_availability: "unknown" as const,

  hotel_place_raw: null,
  flight_place_raw: null,
  availability_verification: "not_checked" as const,

  source: "tourvisor" as const,

  raw_reference: {
    search_id: "search-1",
    hotel_id: "hotel-1",
    tour_id: "tour-1",
    hotel_index: 0,
    tour_index: 0,
  },

  missing_fields: [],
  data_warnings: [],
};

Deno.test("NormalizedTour: valid object", () => {
  const result = NormalizedTourSchema.safeParse(validTour);
  assert.equal(result.success, true);
});

Deno.test("NormalizedTour: missing hotel_id", () => {
  const invalid = structuredClone(validTour);
  delete (invalid as Partial<typeof validTour>).hotel_id;
  const result = NormalizedTourSchema.safeParse(invalid);
  assert.equal(result.success, false);
});

Deno.test("NormalizedTour: empty hotel_name", () => {
  const data = { ...validTour, hotel_name: "" };
  const result = NormalizedTourSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("NormalizedTour: invalid departure_date", () => {
  const data = { ...validTour, departure_date: "not-a-date" };
  const result = NormalizedTourSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("NormalizedTour: nights = 0", () => {
  const data = { ...validTour, nights: 0 };
  const result = NormalizedTourSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("NormalizedTour: price = 0", () => {
  const data = { ...validTour, price: 0 };
  const result = NormalizedTourSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("NormalizedTour: invalid hotel_category (6)", () => {
  const data = { ...validTour, hotel_category: 6 };
  const result = NormalizedTourSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("NormalizedTour: invalid hotel_rating (5.5)", () => {
  const data = { ...validTour, hotel_rating: 5.5 };
  const result = NormalizedTourSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("NormalizedTour: invalid latitude (100)", () => {
  const data = { ...validTour, latitude: 100 };
  const result = NormalizedTourSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("NormalizedTour: invalid longitude (200)", () => {
  const data = { ...validTour, longitude: 200 };
  const result = NormalizedTourSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("NormalizedTour: price_status=actualized without timestamp", () => {
  const data = {
    ...validTour,
    price_status: "actualized" as const,
    price_actualized_at: null,
  };
  const result = NormalizedTourSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("NormalizedTour: extra unknown field rejected", () => {
  const data = { ...validTour, extra_field: "test" };
  const result = NormalizedTourSchema.safeParse(data);
  assert.equal(result.success, false);
});
