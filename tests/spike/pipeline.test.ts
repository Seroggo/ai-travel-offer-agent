import assert from "node:assert/strict";
import { runPipeline } from "../../supabase/functions/_shared/spike/pipeline.ts";
import type { SpikeRequest } from "../../supabase/functions/_shared/spike/types.ts";
import searchResults from "../fixtures/tourvisor/search-results.json" with { type: "json" };

const defaultRequest: SpikeRequest = {
  country_id: 9001,
  date_from: "2026-08-01",
  date_to: "2026-08-31",
  nights_from: 1,
  nights_to: 14,
  adults: 2,
  children_ages: [1],
  budget_max: null,
  budget_mode: "unknown",
  meal: null,
  hotel_category_min: null,
  hotel_rating_min: null,
};

Deno.test("1. success returns 1 to 3 variants", () => {
  const result = runPipeline(defaultRequest, structuredClone(searchResults));
  assert.ok(result.ranked_tours.length >= 1);
  assert.ok(result.ranked_tours.length <= 3);
});

Deno.test("2. all hotel_id differ", () => {
  const result = runPipeline(defaultRequest, structuredClone(searchResults));
  const ids = result.ranked_tours.map((t) => t.hotel_id);
  assert.strictEqual(new Set(ids).size, ids.length);
});

Deno.test("3. results match country, dates, nights, meal, category, rating", () => {
  const request: SpikeRequest = {
    ...defaultRequest,
    date_from: "2026-08-10",
    date_to: "2026-08-14",
    nights_from: 7,
    nights_to: 8,
    meal: "AI",
    hotel_category_min: 4,
    hotel_rating_min: 4.0,
  };
  const result = runPipeline(request, structuredClone(searchResults));
  assert.ok(result.ranked_tours.length >= 1);
  for (const t of result.ranked_tours) {
    assert.strictEqual(t.country_id, 9001);
    assert.ok(t.departure_date >= "2026-08-10");
    assert.ok(t.departure_date <= "2026-08-14");
    assert.ok(t.nights >= 7);
    assert.ok(t.nights <= 8);
    assert.strictEqual(t.meal, "AI");
    assert.ok(t.hotel_category >= 4);
    assert.ok(t.hotel_rating >= 4.0);
  }
});

Deno.test("4. hard budget excludes overage", () => {
  const request: SpikeRequest = {
    ...defaultRequest,
    budget_max: 240000,
    budget_mode: "hard",
  };
  const result = runPipeline(request, structuredClone(searchResults));
  assert.ok(result.ranked_tours.length >= 1);
  for (const t of result.ranked_tours) {
    assert.ok(t.price <= 240000);
  }
});

Deno.test("5. soft budget allows at most 10% overage", () => {
  const request: SpikeRequest = {
    ...defaultRequest,
    budget_max: 240000,
    budget_mode: "soft",
  };
  const result = runPipeline(request, structuredClone(searchResults));
  assert.ok(result.ranked_tours.length >= 1);
  const limit = 240000 * 1.1;
  for (const t of result.ranked_tours) {
    assert.ok(t.price <= limit);
  }
});

Deno.test("6. unknown budget does not apply price filter", () => {
  const request: SpikeRequest = {
    ...defaultRequest,
    budget_max: 240000,
    budget_mode: "unknown",
  };
  const result = runPipeline(request, structuredClone(searchResults));
  assert.ok(result.ranked_tours.length >= 1);
  const hasAboveBudget = result.ranked_tours.some((t) => t.price > 240000);
  assert.ok(hasAboveBudget);
});

Deno.test("7. impossible conditions return empty", () => {
  const request: SpikeRequest = {
    ...defaultRequest,
    country_id: 9999,
  };
  const result = runPipeline(request, structuredClone(searchResults));
  assert.strictEqual(result.ranked_tours.length, 0);
});

Deno.test("8. repeated call returns same tour_id order", () => {
  const data = structuredClone(searchResults);
  const r1 = runPipeline(defaultRequest, data);
  const r2 = runPipeline(defaultRequest, data);
  const ids1 = r1.ranked_tours.map((t) => t.tour_id);
  const ids2 = r2.ranked_tours.map((t) => t.tour_id);
  assert.deepStrictEqual(ids1, ids2);
});