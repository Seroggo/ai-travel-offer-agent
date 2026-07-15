import { strict as assert } from "node:assert/strict";
import { TravelOfferSchema } from "../../../supabase/functions/_shared/schemas/travel-offer.ts";

const validOffer = {
  schema_version: "0.1" as const,
  request_id: "req-1",
  created_at: "2026-07-15T10:00:00Z",
  request_summary: {
    departure_city: "Екатеринбург",
    destinations: ["Турция"],
    date_from: "2026-08-10",
    date_to: "2026-08-20",
    nights_from: 7,
    nights_to: 9,
    adults: 2,
    children_ages: [8],
    budget_max: 250000,
    budget_mode: "soft" as const,
    meal_preferences: ["all inclusive"],
    hotel_stars_min: 4,
    hotel_rating_min: null,
  },
  assumptions: [],
  unverifiable_requirements: [],
  destination_results: [
    {
      country: "Турция",
      priority: 1,
      search_state: "completed" as const,
      raw_tours_count: 7,
      accepted_tours_count: 3,
      options: [
        {
          rank: 1,
          hotel_id: "hotel-1",
          tour_id: "tour-1",
          hotel_name: "Hotel A",
          country: "Турция",
          resort: "Анталья",
          hotel_category: 5,
          hotel_rating: 4.5,
          departure_date: "2026-08-12",
          nights: 8,
          meal_name: "All Inclusive",
          room_name: "Standard",
          accommodation: "Double",
          price: 246000,
          currency: "RUB",
          price_status: "search" as const,
          flight_availability: "unknown" as const,
          hotel_availability: "unknown" as const,
          internal_score: 85.5,
          strengths: ["укладывается в бюджет"],
          compromises: ["цена близка к границе"],
          verification_needed: ["актуальная цена"],
        },
      ],
      rejection_summary: { "HARD_BUDGET_EXCEEDED": 3 },
      warnings: [],
    },
  ],
  agent_block: {
    understood_request: "Запрос понят так: вылет из Екатеринбурга...",
    assumptions: [],
    unverified_requirements: [],
    destination_sections: [
      {
        country: "Турция",
        status_summary: "Найдено 3 подходящих варианта.",
        options: [
          {
            rank: 1,
            headline: "Hotel A — 246 000 ₽",
            factual_details: ["5*, Анталья", "8 ночей, All Inclusive"],
            why_ranked_here: ["внутри ориентира", "высокий рейтинг"],
            compromises: ["цена близка к верхней границе"],
            verify_before_sending: ["актуальная цена", "наличие мест"],
          },
        ],
        no_result_reason: null,
      },
    ],
    overall_recommendation: "Рекомендую Hotel A как лучший вариант.",
    operational_warnings: [],
  },
  client_block: {
    intro: "Подобрал несколько вариантов под ваши даты.",
    destination_sections: [
      {
        country: "Турция",
        options: [
          {
            rank: 1,
            title: "Hotel A 5*, Анталья",
            details: [
              "12 августа, 8 ночей, всё включено",
              "246 000 ₽ на всех",
            ],
            selection_reason: "укладывается в ориентир и имеет высокий рейтинг",
            compromise: "стоимость близка к верхней границе",
          },
        ],
      },
    ],
    closing: "Цены и наличие актуальны на момент поиска.",
    disclaimer: "Цена и наличие актуальны на момент поиска и могут измениться.",
  },
  global_disclaimers: [
    "Цена и наличие актуальны на момент поиска и могут измениться.",
  ],
};

Deno.test("TravelOffer: valid full object", () => {
  const result = TravelOfferSchema.safeParse(validOffer);
  assert.equal(result.success, true);
});

Deno.test("TravelOffer: destination search_state", () => {
  const states = ["completed", "partial", "empty", "failed", "timed_out"];
  for (const state of states) {
    const data = {
      ...validOffer,
      destination_results: [{
        ...validOffer.destination_results[0],
        search_state: state,
      }],
    };
    const result = TravelOfferSchema.safeParse(data);
    assert.equal(result.success, true);
  }
});

Deno.test("TravelOffer: negative count rejected", () => {
  const data = {
    ...validOffer,
    destination_results: [{
      ...validOffer.destination_results[0],
      raw_tours_count: -1,
    }],
  };
  const result = TravelOfferSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("TravelOffer: internal_score out of range", () => {
  const data = {
    ...validOffer,
    destination_results: [{
      ...validOffer.destination_results[0],
      options: [{
        ...validOffer.destination_results[0].options[0],
        internal_score: 150,
      }],
    }],
  };
  const result = TravelOfferSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("TravelOffer: invalid created_at date", () => {
  const data = { ...validOffer, created_at: "not-a-date" };
  const result = TravelOfferSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("TravelOffer: extra top-level field rejected", () => {
  const data = { ...validOffer, extra_field: "test" };
  const result = TravelOfferSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("TravelOffer: extra field inside option rejected", () => {
  const data = {
    ...validOffer,
    destination_results: [{
      ...validOffer.destination_results[0],
      options: [{
        ...validOffer.destination_results[0].options[0],
        extra_field: "test",
      }],
    }],
  };
  const result = TravelOfferSchema.safeParse(data);
  assert.equal(result.success, false);
});
