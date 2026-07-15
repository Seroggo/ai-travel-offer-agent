import { strict as assert } from "node:assert/strict";
import { TravelSearchRequestSchema } from "../../../supabase/functions/_shared/schemas/travel-request.ts";

const validFull = {
  schema_version: "0.4" as const,
  free_text:
    "Турция или Египет, двое взрослых и ребёнок 8 лет, вылет из Екатеринбурга 10–20 августа, 7–9 ночей, примерно 250 тысяч, желательно всё включено, отель от 4 звёзд.",
  departure_city: "Екатеринбург",
  departure_id: null,
  destinations: [
    {
      country_name: "Турция",
      country_id: null,
      priority: 1,
      resort_preferences: [],
      resort_mode: "any" as const,
      region_ids: [],
      hotel_service_ids: [],
    },
  ],
  date_from: "2026-08-10",
  date_to: "2026-08-20",
  nights_from: 7,
  nights_to: 9,
  adults: 2,
  children_ages: [8],
  budget_max: 250000,
  budget_mode: "soft" as const,
  budget_source: "provided" as const,
  currency: "RUB",
  meal_preferences: ["all inclusive"],
  meal_id: null,
  meal_mode: "preferred" as const,
  hotel_stars_min: 4,
  hotel_stars_mode: "required" as const,
  hotel_rating_min: null,
  hotel_rating_mode: "any" as const,
  direct_flight_only: false,
  charter_only: false,
  max_sea_distance_m: null,
  sea_distance_mode: "any" as const,
  hotel_preferences: ["современный семейный отель"],
  required_features: [],
  excluded_features: [],
  assumptions: [],
  unverifiable_requirements: [],
  missing_required_fields: [],
  missing_recommended_fields: [],
};

Deno.test("TravelSearchRequest: valid full request", () => {
  const result = TravelSearchRequestSchema.safeParse(validFull);
  assert.equal(result.success, true);
});

Deno.test("TravelSearchRequest: valid minimal (nulls and empty arrays)", () => {
  const minimal = {
    ...validFull,
    free_text: "test",
    departure_city: null,
    departure_id: null,
    destinations: [],
    date_from: null,
    date_to: null,
    nights_from: null,
    nights_to: null,
    adults: null,
    children_ages: [],
    budget_max: null,
    budget_mode: "unknown" as const,
    budget_source: "missing" as const,
    currency: "RUB",
    meal_preferences: [],
    meal_id: null,
    meal_mode: "any" as const,
    hotel_stars_min: null,
    hotel_stars_mode: "any" as const,
    hotel_rating_min: null,
    hotel_rating_mode: "any" as const,
    direct_flight_only: false,
    charter_only: false,
    max_sea_distance_m: null,
    sea_distance_mode: "any" as const,
    hotel_preferences: [],
    required_features: [],
    excluded_features: [],
    assumptions: [],
    unverifiable_requirements: [],
    missing_required_fields: [],
    missing_recommended_fields: [],
  };
  const result = TravelSearchRequestSchema.safeParse(minimal);
  assert.equal(result.success, true);
});

Deno.test("TravelSearchRequest: missing required key", () => {
  const invalid = structuredClone(validFull);
  delete (invalid as Partial<typeof validFull>).free_text;
  const result = TravelSearchRequestSchema.safeParse(invalid);
  assert.equal(result.success, false);
});

Deno.test("TravelSearchRequest: unknown extra field rejected", () => {
  const extra = { ...validFull, unknown_field: "test" };
  const result = TravelSearchRequestSchema.safeParse(extra);
  assert.equal(result.success, false);
});

Deno.test("TravelSearchRequest: child age -1", () => {
  const data = { ...validFull, children_ages: [-1] };
  const result = TravelSearchRequestSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("TravelSearchRequest: child age 18", () => {
  const data = { ...validFull, children_ages: [18] };
  const result = TravelSearchRequestSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("TravelSearchRequest: four children", () => {
  const data = { ...validFull, children_ages: [1, 2, 3, 4] };
  const result = TravelSearchRequestSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("TravelSearchRequest: adults = 0", () => {
  const data = { ...validFull, adults: 0 };
  const result = TravelSearchRequestSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("TravelSearchRequest: invalid date (Feb 30)", () => {
  const data = { ...validFull, date_from: "2026-02-30" };
  const result = TravelSearchRequestSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("TravelSearchRequest: date_from > date_to", () => {
  const data = { ...validFull, date_from: "2026-08-20", date_to: "2026-08-10" };
  const result = TravelSearchRequestSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("TravelSearchRequest: date range > 21 days", () => {
  const data = { ...validFull, date_from: "2026-08-01", date_to: "2026-08-23" };
  const result = TravelSearchRequestSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("TravelSearchRequest: nights outside 1-28", () => {
  const data = { ...validFull, nights_from: 0, nights_to: 5 };
  const result = TravelSearchRequestSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("TravelSearchRequest: nights_from > nights_to", () => {
  const data = { ...validFull, nights_from: 10, nights_to: 5 };
  const result = TravelSearchRequestSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("TravelSearchRequest: nights range > 10", () => {
  const data = { ...validFull, nights_from: 1, nights_to: 12 };
  const result = TravelSearchRequestSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("TravelSearchRequest: valid hard budget", () => {
  const data = {
    ...validFull,
    budget_max: 100000,
    budget_mode: "hard" as const,
    budget_source: "provided" as const,
  };
  const result = TravelSearchRequestSchema.safeParse(data);
  assert.equal(result.success, true);
});

Deno.test("TravelSearchRequest: valid soft budget", () => {
  const data = {
    ...validFull,
    budget_max: 200000,
    budget_mode: "soft" as const,
    budget_source: "provided" as const,
  };
  const result = TravelSearchRequestSchema.safeParse(data);
  assert.equal(result.success, true);
});

Deno.test("TravelSearchRequest: valid unknown/missing budget", () => {
  const data = {
    ...validFull,
    budget_max: null,
    budget_mode: "unknown" as const,
    budget_source: "missing" as const,
  };
  const result = TravelSearchRequestSchema.safeParse(data);
  assert.equal(result.success, true);
});

Deno.test("TravelSearchRequest: valid unknown/explicitly_unknown budget", () => {
  const data = {
    ...validFull,
    budget_max: null,
    budget_mode: "unknown" as const,
    budget_source: "explicitly_unknown" as const,
  };
  const result = TravelSearchRequestSchema.safeParse(data);
  assert.equal(result.success, true);
});

Deno.test("TravelSearchRequest: hard budget without amount", () => {
  const data = {
    ...validFull,
    budget_max: null,
    budget_mode: "hard" as const,
    budget_source: "provided" as const,
  };
  const result = TravelSearchRequestSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("TravelSearchRequest: unknown budget with amount", () => {
  const data = {
    ...validFull,
    budget_max: 100000,
    budget_mode: "unknown" as const,
    budget_source: "missing" as const,
  };
  const result = TravelSearchRequestSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("TravelSearchRequest: hard/soft with wrong budget_source", () => {
  const data = {
    ...validFull,
    budget_max: 100000,
    budget_mode: "hard" as const,
    budget_source: "missing" as const,
  };
  const result = TravelSearchRequestSchema.safeParse(data);
  assert.equal(result.success, false);
});
