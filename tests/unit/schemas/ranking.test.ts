import { strict as assert } from "node:assert/strict";
import {
  FilterCodeSchema,
  FilterDecisionSchema,
  RankedTourSchema,
  ScoreComponentsSchema,
  WarningCodeSchema,
} from "../../../supabase/functions/_shared/schemas/ranking.ts";

const validBaseTour = {
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

Deno.test("FilterCode: all values", () => {
  const codes = [
    "MISSING_CRITICAL_DATA",
    "COUNTRY_MISMATCH",
    "DATE_MISMATCH",
    "NIGHTS_MISMATCH",
    "TRAVELLER_COMPOSITION_MISMATCH",
    "HARD_BUDGET_EXCEEDED",
    "SOFT_BUDGET_LIMIT_EXCEEDED",
    "REQUIRED_MEAL_MISMATCH",
    "REQUIRED_STARS_MISMATCH",
    "REQUIRED_RATING_MISMATCH",
    "REQUIRED_RESORT_MISMATCH",
    "DIRECT_FLIGHT_MISMATCH",
    "FLIGHT_UNAVAILABLE",
    "VERIFIED_EXCLUDED_FEATURE",
  ];
  for (const code of codes) {
    assert.equal(FilterCodeSchema.safeParse(code).success, true);
  }
  assert.equal(FilterCodeSchema.safeParse("INVALID").success, false);
});

Deno.test("WarningCode: all values", () => {
  const codes = [
    "PRICE_ABOVE_SOFT_BUDGET",
    "PRICE_NOT_ACTUALIZED",
    "AVAILABILITY_NOT_VERIFIED",
    "HOTEL_AVAILABILITY_UNKNOWN",
    "PARTIAL_SEARCH",
    "MISSING_RATING",
    "MISSING_ROOM",
    "UNVERIFIABLE_REQUIREMENT",
  ];
  for (const code of codes) {
    assert.equal(WarningCodeSchema.safeParse(code).success, true);
  }
  assert.equal(WarningCodeSchema.safeParse("INVALID").success, false);
});

Deno.test("FilterDecision: accepted without rejection", () => {
  const result = FilterDecisionSchema.safeParse({
    accepted: true,
    rejection_codes: [],
    warning_codes: [],
  });
  assert.equal(result.success, true);
});

Deno.test("FilterDecision: rejected with rejection code", () => {
  const result = FilterDecisionSchema.safeParse({
    accepted: false,
    rejection_codes: ["HARD_BUDGET_EXCEEDED"],
    warning_codes: [],
  });
  assert.equal(result.success, true);
});

Deno.test("FilterDecision: accepted with rejection code (invalid)", () => {
  const result = FilterDecisionSchema.safeParse({
    accepted: true,
    rejection_codes: ["HARD_BUDGET_EXCEEDED"],
    warning_codes: [],
  });
  assert.equal(result.success, false);
});

Deno.test("FilterDecision: rejected without rejection code (invalid)", () => {
  const result = FilterDecisionSchema.safeParse({
    accepted: false,
    rejection_codes: [],
    warning_codes: [],
  });
  assert.equal(result.success, false);
});

Deno.test("ScoreComponents: valid all 0", () => {
  const result = ScoreComponentsSchema.safeParse({
    price: 0,
    hotel_rating: 0,
    meal: 0,
    hotel_category: 0,
    date_nights: 0,
    resort: 0,
    services: 0,
    completeness: 0,
  });
  assert.equal(result.success, true);
});

Deno.test("ScoreComponents: below 0", () => {
  const result = ScoreComponentsSchema.safeParse({
    price: -1,
    hotel_rating: 0,
    meal: 0,
    hotel_category: 0,
    date_nights: 0,
    resort: 0,
    services: 0,
    completeness: 0,
  });
  assert.equal(result.success, false);
});

Deno.test("ScoreComponents: above 100", () => {
  const result = ScoreComponentsSchema.safeParse({
    price: 101,
    hotel_rating: 0,
    meal: 0,
    hotel_category: 0,
    date_nights: 0,
    resort: 0,
    services: 0,
    completeness: 0,
  });
  assert.equal(result.success, false);
});

Deno.test("RankedTour: valid with score", () => {
  const data = {
    ...validBaseTour,
    rank: 1,
    score: 85.5,
    score_components: {
      price: 80,
      hotel_rating: 90,
      meal: 100,
      hotel_category: 80,
      date_nights: 75,
      resort: 60,
      services: 60,
      completeness: 90,
    },
    strengths: ["укладывается в бюджет", "высокий рейтинг"],
    compromises: ["цена близка к верхней границе"],
    verification_needed: ["актуальная цена"],
    warning_codes: [],
  };
  const result = RankedTourSchema.safeParse(data);
  assert.equal(result.success, true);
});

Deno.test("RankedTour: score above 100", () => {
  const data = {
    ...validBaseTour,
    rank: 1,
    score: 150,
    score_components: {
      price: 80,
      hotel_rating: 90,
      meal: 100,
      hotel_category: 80,
      date_nights: 75,
      resort: 60,
      services: 60,
      completeness: 90,
    },
    strengths: [],
    compromises: [],
    verification_needed: [],
    warning_codes: [],
  };
  const result = RankedTourSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("RankedTour: rank = 0", () => {
  const data = {
    ...validBaseTour,
    rank: 0,
    score: 50,
    score_components: {
      price: 0,
      hotel_rating: 0,
      meal: 0,
      hotel_category: 0,
      date_nights: 0,
      resort: 0,
      services: 0,
      completeness: 0,
    },
    strengths: [],
    compromises: [],
    verification_needed: [],
    warning_codes: [],
  };
  const result = RankedTourSchema.safeParse(data);
  assert.equal(result.success, false);
});
