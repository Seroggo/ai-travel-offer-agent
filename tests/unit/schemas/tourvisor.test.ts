import { strict as assert } from "node:assert/strict";
import { TourvisorSearchParamsSchema } from "../../../supabase/functions/_shared/schemas/tourvisor.ts";

const validParams = {
  departureId: 1,
  countryId: 2,
  dateFrom: "2026-08-10",
  dateTo: "2026-08-20",
  nightsFrom: 7,
  nightsTo: 9,
  adults: 2,
  currency: "RUB",
  onlyCharter: false,
};

Deno.test("TourvisorSearchParams: valid object", () => {
  const result = TourvisorSearchParamsSchema.safeParse(validParams);
  assert.equal(result.success, true);
});

Deno.test("TourvisorSearchParams: invalid ID (zero)", () => {
  const data = { ...validParams, departureId: 0 };
  const result = TourvisorSearchParamsSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("TourvisorSearchParams: invalid child age (18)", () => {
  const data = { ...validParams, childs: [18] };
  const result = TourvisorSearchParamsSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("TourvisorSearchParams: four children", () => {
  const data = { ...validParams, childs: [1, 2, 3, 4] };
  const result = TourvisorSearchParamsSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("TourvisorSearchParams: invalid date range (from > to)", () => {
  const data = { ...validParams, dateFrom: "2026-08-20", dateTo: "2026-08-10" };
  const result = TourvisorSearchParamsSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("TourvisorSearchParams: invalid nights range (from > to)", () => {
  const data = { ...validParams, nightsFrom: 10, nightsTo: 5 };
  const result = TourvisorSearchParamsSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("TourvisorSearchParams: invalid hotelRating", () => {
  const data = { ...validParams, hotelRating: 1 };
  const result = TourvisorSearchParamsSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("TourvisorSearchParams: non-positive priceTo", () => {
  const data = { ...validParams, priceTo: 0 };
  const result = TourvisorSearchParamsSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("TourvisorSearchParams: extra unknown field rejected", () => {
  const data = { ...validParams, unknownField: "test" };
  const result = TourvisorSearchParamsSchema.safeParse(data);
  assert.equal(result.success, false);
});
