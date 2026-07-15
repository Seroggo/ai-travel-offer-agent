import { strict as assert } from "node:assert/strict";
import { WorkflowResponseSchema } from "../../../supabase/functions/_shared/schemas/workflow.ts";

const validMeta = { duration_ms: 1500 };
const validRequest = {
  schema_version: "0.4" as const,
  free_text: "test",
  departure_city: "Москва",
  departure_id: null,
  destinations: [{
    country_name: "Турция",
    country_id: null,
    priority: 1,
    resort_preferences: [],
    resort_mode: "any" as const,
    region_ids: [],
    hotel_service_ids: [],
  }],
  date_from: null,
  date_to: null,
  nights_from: null,
  nights_to: null,
  adults: 2,
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

Deno.test("WorkflowResponse: valid clarification", () => {
  const data = {
    request_id: "550e8400-e29b-41d4-a716-446655440000",
    status: "clarification_required" as const,
    parsed_request: validRequest,
    clarification_required: true as const,
    clarification_question: "Уточните даты вылета",
    missing_required_fields: ["date_from", "date_to"],
    search_mode: "mock" as const,
    normalized_tours: [],
    ranked_tours: [],
    agent_summary: null,
    client_message: null,
    warnings: [],
    error: null,
    meta: validMeta,
  };
  const result = WorkflowResponseSchema.safeParse(data);
  assert.equal(result.success, true);
});

Deno.test("WorkflowResponse: clarification without question", () => {
  const data = {
    request_id: "550e8400-e29b-41d4-a716-446655440000",
    status: "clarification_required" as const,
    parsed_request: validRequest,
    clarification_required: true as const,
    clarification_question: "",
    missing_required_fields: ["date_from"],
    search_mode: "mock" as const,
    normalized_tours: [],
    ranked_tours: [],
    agent_summary: null,
    client_message: null,
    warnings: [],
    error: null,
    meta: validMeta,
  };
  const result = WorkflowResponseSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("WorkflowResponse: clarification without missing fields", () => {
  const data = {
    request_id: "550e8400-e29b-41d4-a716-446655440000",
    status: "clarification_required" as const,
    parsed_request: validRequest,
    clarification_required: true as const,
    clarification_question: "Уточнение",
    missing_required_fields: [],
    search_mode: "mock" as const,
    normalized_tours: [],
    ranked_tours: [],
    agent_summary: null,
    client_message: null,
    warnings: [],
    error: null,
    meta: validMeta,
  };
  const result = WorkflowResponseSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("WorkflowResponse: valid completed", () => {
  const data = {
    request_id: "550e8400-e29b-41d4-a716-446655440000",
    status: "completed" as const,
    parsed_request: validRequest,
    clarification_required: false as const,
    clarification_question: null,
    missing_required_fields: [],
    search_mode: "mock" as const,
    normalized_tours: [],
    ranked_tours: [],
    agent_summary: "Found 3 options.",
    client_message: "Подобрал варианты.",
    warnings: [],
    error: null,
    meta: validMeta,
  };
  const result = WorkflowResponseSchema.safeParse(data);
  assert.equal(result.success, true);
});

Deno.test("WorkflowResponse: valid completed_with_warnings", () => {
  const data = {
    request_id: "550e8400-e29b-41d4-a716-446655440000",
    status: "completed_with_warnings" as const,
    parsed_request: validRequest,
    clarification_required: false as const,
    clarification_question: null,
    missing_required_fields: [],
    search_mode: "mock" as const,
    normalized_tours: [],
    ranked_tours: [],
    agent_summary: "Found 3 options.",
    client_message: "Подобрал варианты.",
    warnings: ["partial search"],
    error: null,
    meta: validMeta,
  };
  const result = WorkflowResponseSchema.safeParse(data);
  assert.equal(result.success, true);
});

Deno.test("WorkflowResponse: completed_with_warnings without warnings", () => {
  const data = {
    request_id: "550e8400-e29b-41d4-a716-446655440000",
    status: "completed_with_warnings" as const,
    parsed_request: validRequest,
    clarification_required: false as const,
    clarification_question: null,
    missing_required_fields: [],
    search_mode: "mock" as const,
    normalized_tours: [],
    ranked_tours: [],
    agent_summary: "Found 3 options.",
    client_message: "Подобрал варианты.",
    warnings: [],
    error: null,
    meta: validMeta,
  };
  const result = WorkflowResponseSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("WorkflowResponse: completed with clarification_required=true", () => {
  const data = {
    request_id: "550e8400-e29b-41d4-a716-446655440000",
    status: "completed" as const,
    parsed_request: validRequest,
    clarification_required: true as const,
    clarification_question: null,
    missing_required_fields: [],
    search_mode: "mock" as const,
    normalized_tours: [],
    ranked_tours: [],
    agent_summary: "Found 3 options.",
    client_message: "Подобрал варианты.",
    warnings: [],
    error: null,
    meta: validMeta,
  };
  const result = WorkflowResponseSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("WorkflowResponse: valid failed", () => {
  const data = {
    request_id: "550e8400-e29b-41d4-a716-446655440000",
    status: "failed" as const,
    parsed_request: validRequest,
    clarification_required: false as const,
    clarification_question: null,
    missing_required_fields: [],
    search_mode: "mock" as const,
    normalized_tours: [],
    ranked_tours: [],
    agent_summary: "Search failed.",
    client_message: null,
    warnings: [],
    error: { code: "API_ERROR", message: "Tourvisor unavailable" },
    meta: validMeta,
  };
  const result = WorkflowResponseSchema.safeParse(data);
  assert.equal(result.success, true);
});

Deno.test("WorkflowResponse: failed without error", () => {
  const data = {
    request_id: "550e8400-e29b-41d4-a716-446655440000",
    status: "failed" as const,
    parsed_request: validRequest,
    clarification_required: false as const,
    clarification_question: null,
    missing_required_fields: [],
    search_mode: "mock" as const,
    normalized_tours: [],
    ranked_tours: [],
    agent_summary: "Search failed.",
    client_message: null,
    warnings: [],
    error: null,
    meta: validMeta,
  };
  const result = WorkflowResponseSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("WorkflowResponse: invalid UUID", () => {
  const data = {
    request_id: "not-a-uuid",
    status: "completed" as const,
    parsed_request: validRequest,
    clarification_required: false as const,
    clarification_question: null,
    missing_required_fields: [],
    search_mode: "mock" as const,
    normalized_tours: [],
    ranked_tours: [],
    agent_summary: "Found 3 options.",
    client_message: "Подобрал варианты.",
    warnings: [],
    error: null,
    meta: validMeta,
  };
  const result = WorkflowResponseSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("WorkflowResponse: negative duration_ms", () => {
  const data = {
    request_id: "550e8400-e29b-41d4-a716-446655440000",
    status: "completed" as const,
    parsed_request: validRequest,
    clarification_required: false as const,
    clarification_question: null,
    missing_required_fields: [],
    search_mode: "mock" as const,
    normalized_tours: [],
    ranked_tours: [],
    agent_summary: "Found 3 options.",
    client_message: "Подобрал варианты.",
    warnings: [],
    error: null,
    meta: { duration_ms: -1 },
  };
  const result = WorkflowResponseSchema.safeParse(data);
  assert.equal(result.success, false);
});

Deno.test("WorkflowResponse: extra unknown field rejected", () => {
  const data = {
    request_id: "550e8400-e29b-41d4-a716-446655440000",
    status: "completed" as const,
    parsed_request: validRequest,
    clarification_required: false as const,
    clarification_question: null,
    missing_required_fields: [],
    search_mode: "mock" as const,
    normalized_tours: [],
    ranked_tours: [],
    agent_summary: "Found 3 options.",
    client_message: "Подобрал варианты.",
    warnings: [],
    error: null,
    meta: validMeta,
    extra_field: "test",
  };
  const result = WorkflowResponseSchema.safeParse(data);
  assert.equal(result.success, false);
});
