import assert from "node:assert/strict";
import { handleTravelOfferRequest } from "../../supabase/functions/travel-offer/index.ts";
import type { HandlerConfig } from "../../supabase/functions/travel-offer/index.ts";

const testConfig: HandlerConfig = {
  internalApiToken: "test-internal-token",
  tourSource: "mock",
};
const authHeaders = { "X-Internal-Token": "test-internal-token" };

const defaultBody = {
  request: {
    country_id: 9001,
    date_from: "2026-08-01",
    date_to: "2026-08-31",
    nights_from: 1,
    nights_to: 14,
    adults: 2,
    children_ages: [1],
    budget_max: null,
    budget_mode: "unknown" as const,
    meal: null,
    hotel_category_min: null,
    hotel_rating_min: null,
  },
  mock_scenario: "success" as const,
};

Deno.test("1. success returns HTTP 200 and 1–3 tours", async () => {
  const req = new Request("http://localhost/travel-offer", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(defaultBody),
  });
  const res = await handleTravelOfferRequest(req, testConfig);
  assert.strictEqual(res.status, 200);
  const json = await res.json();
  assert.strictEqual(json.status, "success");
  assert.ok(json.ranked_tours.length >= 1);
  assert.ok(json.ranked_tours.length <= 3);
  assert.ok(typeof json.agent_summary === "string");
  assert.ok(typeof json.client_message === "string");
});

Deno.test("2. success returns different hotel_id", async () => {
  const req = new Request("http://localhost/travel-offer", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(defaultBody),
  });
  const res = await handleTravelOfferRequest(req, testConfig);
  const json = await res.json();
  const ids = json.ranked_tours.map((t: { hotel_id: number }) => t.hotel_id);
  assert.strictEqual(new Set(ids).size, ids.length);
});

Deno.test("3. empty returns HTTP 200, status empty, empty client_message", async () => {
  const req = new Request("http://localhost/travel-offer", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      request: {
        ...defaultBody.request,
        country_id: 9999,
      },
      mock_scenario: "success",
    }),
  });
  const res = await handleTravelOfferRequest(req, testConfig);
  assert.strictEqual(res.status, 200);
  const json = await res.json();
  assert.strictEqual(json.status, "empty");
  assert.strictEqual(json.ranked_tours.length, 0);
  assert.strictEqual(json.client_message, "");
});

Deno.test("4. error returns HTTP 502 and TOUR_SOURCE_ERROR", async () => {
  const req = new Request("http://localhost/travel-offer", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      request: defaultBody.request,
      mock_scenario: "error",
    }),
  });
  const res = await handleTravelOfferRequest(req, testConfig);
  assert.strictEqual(res.status, 502);
  const json = await res.json();
  assert.strictEqual(json.status, "error");
  assert.strictEqual(json.error_code, "TOUR_SOURCE_ERROR");
  assert.strictEqual(json.message, "Не удалось получить варианты туров.");
});

Deno.test("5. GET returns HTTP 405", async () => {
  const req = new Request("http://localhost/travel-offer", {
    method: "GET",
    headers: authHeaders,
  });
  const res = await handleTravelOfferRequest(req, testConfig);
  assert.strictEqual(res.status, 405);
  const json = await res.json();
  assert.strictEqual(json.error, "Method not allowed");
});

Deno.test("6. invalid JSON body returns HTTP 400", async () => {
  const req = new Request("http://localhost/travel-offer", {
    method: "POST",
    headers: authHeaders,
    body: "not-json",
  });
  const res = await handleTravelOfferRequest(req, testConfig);
  assert.strictEqual(res.status, 400);
  const json = await res.json();
  assert.strictEqual(json.error, "Invalid request body");
});

Deno.test("7. missing X-Internal-Token returns 401", async () => {
  const req = new Request("http://localhost/travel-offer", {
    method: "POST",
    body: JSON.stringify(defaultBody),
  });
  const res = await handleTravelOfferRequest(req, testConfig);
  assert.strictEqual(res.status, 401);
  const json = await res.json();
  assert.strictEqual(json.error, "Unauthorized");
});

Deno.test("8. invalid X-Internal-Token returns 401", async () => {
  const req = new Request("http://localhost/travel-offer", {
    method: "POST",
    headers: { "X-Internal-Token": "wrong-token" },
    body: JSON.stringify(defaultBody),
  });
  const res = await handleTravelOfferRequest(req, testConfig);
  assert.strictEqual(res.status, 401);
  const json = await res.json();
  assert.strictEqual(json.error, "Unauthorized");
});

Deno.test("9. Tourvisor error in real mode returns safe 502", async () => {
  const fetchFn = () => Promise.resolve(
    new Response("{}", { status: 500, headers: { "content-type": "application/json" } }),
  );
  const realConfig: HandlerConfig = {
    internalApiToken: "test-internal-token",
    tourvisorJwt: "test-tourvisor-token",
    tourSource: "real",
    fetchFn,
    sleepFn: () => Promise.resolve(),
  };
  const req = new Request("http://localhost/travel-offer", {
    method: "POST",
    headers: { "X-Internal-Token": "test-internal-token" },
    body: JSON.stringify({
      request: {
        ...defaultBody.request,
        departure_id: 1,
      },
      mock_scenario: "success",
    }),
  });
  const res = await handleTravelOfferRequest(req, realConfig);
  assert.strictEqual(res.status, 502);
  const json = await res.json();
  assert.strictEqual(json.status, "error");
  assert.strictEqual(json.error_code, "TOUR_SOURCE_ERROR");
  assert.ok(!json.message.includes("test-tourvisor-token"));
  assert.ok(!json.message.includes("stack"));
});
